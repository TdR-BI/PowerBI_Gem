# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   },
# META   "dependencies": {
# META     "lakehouse": {
# META       "default_lakehouse": "4580972c-1cd8-4e69-a252-c8a6cbf5e4ba",
# META       "default_lakehouse_name": "LH_Gold",
# META       "default_lakehouse_workspace_id": "00000000-0000-0000-0000-000000000000",
# META       "known_lakehouses": [
# META         {
# META           "id": "4580972c-1cd8-4e69-a252-c8a6cbf5e4ba"
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


def process_gold(workspace: str) -> None:
    silver_path = table_path(
        workspace, "LH_Silver", "silver_imdb_reviews"
    )
    silver_df = spark.read.format("delta").load(silver_path)
    required_columns = {"sentiment", "review_length", "word_count"}
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
        .saveAsTable("gold_sentiment_summary")
    )
    print(
        f"Gold processing completed: {total_reviews} reviews summarized."
    )


process_gold(workspace_name)

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
