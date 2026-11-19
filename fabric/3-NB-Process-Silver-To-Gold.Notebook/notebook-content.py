# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   }
# META }

# CELL ********************

workspace_name = ""

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


def resolve_workspace_name(workspace: str) -> str:
    normalized_workspace = workspace.strip() if workspace else ""
    if normalized_workspace:
        return normalized_workspace

    current_workspace = notebookutils.runtime.context.get(
        "currentWorkspaceName"
    )
    if not current_workspace:
        raise ValueError(
            "workspace_name was not provided and Fabric runtime context "
            "does not include the current workspace."
        )
    return current_workspace


def onelake_path(workspace: str, lakehouse: str, relative_path: str) -> str:
    normalized_workspace = workspace.strip()
    if not normalized_workspace:
        raise ValueError("workspace_name must not be empty.")
    if any(part in {"", ".", ".."} for part in relative_path.split("/")):
        raise ValueError("Lakehouse path must be a non-empty relative path.")

    encoded_workspace = quote(normalized_workspace, safe="")
    encoded_path = "/".join(
        quote(part, safe="") for part in relative_path.split("/")
    )
    return (
        f"abfss://{encoded_workspace}@onelake.dfs.fabric.microsoft.com/"
        f"{lakehouse}.Lakehouse/{encoded_path}"
    )


def process_gold(workspace: str) -> None:
    silver_path = onelake_path(
        workspace, "LH_Silver", "Tables/silver_imdb_reviews"
    )
    gold_path = onelake_path(
        workspace, "LH_Gold", "Tables/gold_sentiment_summary"
    )
    processed_files_path = onelake_path(
        workspace, "LH_Gold", "Tables/gold_processed_files"
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


process_gold(resolve_workspace_name(workspace_name))

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
