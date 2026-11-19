# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   }
# META }

# CELL ********************

workspace_id = ""

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark",
# META   "tags": [
# META     "parameters"
# META   ]
# META }

# CELL ********************

from urllib.parse import quote
from uuid import UUID

from pyspark.sql import functions as F


def resolve_workspace_id(workspace_id: str) -> str:
    candidate = workspace_id.strip() if workspace_id else ""
    if not candidate:
        candidate = notebookutils.runtime.context.get("currentWorkspaceId")
    if not candidate:
        raise ValueError(
            "workspace_id was not provided and Fabric runtime context "
            "does not include the current workspace ID."
        )
    try:
        return str(UUID(candidate))
    except ValueError as error:
        raise ValueError("workspace_id must be a valid GUID.") from error


def onelake_path(
    workspace_id: str, lakehouse: str, relative_path: str
) -> str:
    normalized_workspace_id = resolve_workspace_id(workspace_id)
    if any(part in {"", ".", ".."} for part in relative_path.split("/")):
        raise ValueError("Lakehouse path must be a non-empty relative path.")

    lakehouse_item = notebookutils.lakehouse.get(
        lakehouse, workspaceId=normalized_workspace_id
    )
    try:
        lakehouse_id = str(UUID(lakehouse_item.id))
    except (AttributeError, ValueError) as error:
        raise ValueError(
            f"Could not resolve Lakehouse {lakehouse} to a valid item ID."
        ) from error

    encoded_path = "/".join(
        quote(part, safe="") for part in relative_path.split("/")
    )
    return (
        f"abfss://{normalized_workspace_id}@onelake.dfs.fabric.microsoft.com/"
        f"{lakehouse_id}/{encoded_path}"
    )


def process_silver(workspace_id: str) -> None:
    bronze_path = onelake_path(
        workspace_id, "LH_Bronze", "Tables/bronze_imdb_reviews"
    )
    silver_path = onelake_path(
        workspace_id, "LH_Silver", "Tables/silver_imdb_reviews"
    )
    bronze_df = spark.read.format("delta").load(bronze_path)
    required_columns = {
        "review",
        "sentiment",
        "source_file_name",
        "source_file_path",
        "source_file_hash",
        "ingested_at_utc",
    }
    if not required_columns.issubset(set(bronze_df.columns)):
        raise ValueError("The Bronze table is missing required columns.")

    normalized_df = bronze_df.select(
        F.trim(F.col("review").cast("string")).alias("review"),
        F.lower(F.trim(F.col("sentiment").cast("string"))).alias("sentiment"),
        F.col("source_file_name").cast("string").alias("source_file_name"),
        F.col("source_file_path").cast("string").alias("source_file_path"),
        F.col("source_file_hash").cast("string").alias("source_file_hash"),
        F.col("ingested_at_utc").cast("timestamp").alias("ingested_at_utc"),
    )
    invalid_condition = (
        F.col("review").isNull()
        | (F.length("review") == 0)
        | F.col("sentiment").isNull()
        | (~F.col("sentiment").isin("positive", "negative"))
    )
    invalid_count = normalized_df.filter(invalid_condition).count()
    if invalid_count:
        raise ValueError(
            f"Silver validation failed for {invalid_count} rows; "
            "the existing Silver table was not overwritten."
        )

    silver_df = (
        normalized_df.withColumn("review_length", F.length("review"))
        .withColumn(
            "word_count",
            F.size(F.split(F.trim(F.col("review")), r"\s+")),
        )
    )
    row_count = silver_df.count()
    if row_count == 0:
        raise ValueError("The Bronze table contains no reviews.")

    (
        silver_df.write.format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .save(silver_path)
    )
    print(f"Silver processing completed: {row_count} rows.")


process_silver(resolve_workspace_id(workspace_id))

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
