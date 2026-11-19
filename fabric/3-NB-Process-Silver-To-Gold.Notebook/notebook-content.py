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


def process_gold(workspace_id: str) -> None:
    silver_path = onelake_path(
        workspace_id, "LH_Silver", "Tables/silver_imdb_reviews"
    )
    gold_path = onelake_path(
        workspace_id, "LH_Gold", "Tables/gold_sentiment_summary"
    )
    processed_files_path = onelake_path(
        workspace_id, "LH_Gold", "Tables/gold_processed_files"
    )
    silver_df = spark.read.format("delta").load(silver_path)
    required_columns = {
        "sentiment",
        "review_length",
        "word_count",
        "source_file_hash",
    }
    if not required_columns.issubset(set(silver_df.columns)):
        raise ValueError("The Silver table is missing required columns.")

    total_reviews = silver_df.count()
    if total_reviews == 0:
        raise ValueError("The Silver table contains no reviews.")

    summary_df = (
        silver_df.groupBy("sentiment")
        .agg(
            F.count("*").alias("review_count"),
            F.round(F.avg("review_length"), 2).alias(
                "average_review_length"
            ),
            F.round(F.avg("word_count"), 2).alias("average_word_count"),
        )
        .withColumn(
            "share_of_reviews",
            F.round(F.col("review_count") / F.lit(total_reviews), 6),
        )
        .withColumn("total_reviews", F.lit(total_reviews).cast("long"))
    )

    summarized_reviews = summary_df.agg(F.sum("review_count")).first()[0]
    if summarized_reviews != total_reviews:
        raise ValueError("Gold aggregation did not preserve the review count.")

    (
        summary_df.write.format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .save(gold_path)
    )
    (
        silver_df.select("source_file_hash")
        .where(F.col("source_file_hash").isNotNull())
        .distinct()
        .write.format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .save(processed_files_path)
    )
    print(
        f"Gold processing completed: {total_reviews} reviews summarized."
    )


process_gold(resolve_workspace_id(workspace_id))

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
