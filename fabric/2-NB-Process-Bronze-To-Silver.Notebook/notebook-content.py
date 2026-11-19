# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   },
# META   "dependencies": {
# META     "lakehouse": {
# META       "default_lakehouse": "0c5304dd-4faf-4d26-a444-6e1c1a542888",
# META       "default_lakehouse_name": "LH_Silver",
# META       "default_lakehouse_workspace_id": "00000000-0000-0000-0000-000000000000",
# META       "known_lakehouses": [
# META         {
# META           "id": "0c5304dd-4faf-4d26-a444-6e1c1a542888"
# META         }
# META       ]
# META     }
# META   }
# META }

# CELL ********************

workspace_name = "Training_Tom"

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

from pyspark.sql import functions as F


def table_path(workspace: str, lakehouse: str, table: str) -> str:
    normalized_workspace = workspace.strip()
    if not normalized_workspace:
        raise ValueError("workspace_name must not be empty.")
    if not table.replace("_", "").isalnum():
        raise ValueError("table name contains unsupported characters.")

    encoded_workspace = quote(normalized_workspace, safe="")
    return (
        f"abfss://{encoded_workspace}@onelake.dfs.fabric.microsoft.com/"
        f"{lakehouse}.Lakehouse/Tables/{table}"
    )


def process_silver(workspace: str) -> None:
    bronze_path = table_path(
        workspace, "LH_Bronze", "bronze_imdb_reviews"
    )
    bronze_df = spark.read.format("delta").load(bronze_path)
    required_columns = {
        "review",
        "sentiment",
        "source_file_name",
        "ingested_at_utc",
    }
    if not required_columns.issubset(set(bronze_df.columns)):
        raise ValueError("The Bronze table is missing required columns.")

    normalized_df = bronze_df.select(
        F.trim(F.col("review").cast("string")).alias("review"),
        F.lower(F.trim(F.col("sentiment").cast("string"))).alias("sentiment"),
        F.col("source_file_name").cast("string").alias("source_file_name"),
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
        .saveAsTable("silver_imdb_reviews")
    )
    print(f"Silver processing completed: {row_count} rows.")


process_silver(workspace_name)

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
