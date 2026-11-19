# IMDb review medallion flow

The Fabric source items in this folder implement three separate Lakehouses,
following Microsoft's medallion architecture:

| Lakehouse | Purpose |
| --- | --- |
| `LH_Bronze` | Preserve the Kaggle CSV in `Files/landing` and create a raw Delta landing table. |
| `LH_Silver` | Validate labels, trim text, and derive review length and word count. |
| `LH_Gold` | Publish an analytics-ready sentiment summary as a Delta table. |

The pipeline `0-PL-Execute-IMDB-Medallion` runs the three notebooks in order.
The source file is intentionally not stored in Git. Download the Kaggle
dataset, verify that its terms permit your intended use, and upload
`IMDB Dataset.csv` to `LH_Bronze` at `Files/landing/IMDB Dataset.csv` before
running the pipeline. The original CSV remains unchanged; the Bronze table
copies its two source columns and adds ingestion metadata. The notebook
validates the expected columns and 50,000-row dataset size without displaying
review text.

The Silver and Gold notebooks use `Training_Tom` as the default `workspace_name`
parameter for cross-Lakehouse reads. Override it when you sync these items to
another workspace. Each notebook binds to its corresponding Lakehouse by
logical ID.

Fabric Git integration tracks Lakehouse metadata, but not table data or folders
inside a Lakehouse's `Files` area. After a PR is merged, sync the connected
workspace from Git. The CSV must still be uploaded separately; no Kaggle
credentials or dataset rows belong in this repository.

The Kaggle page lists the dataset license as “Other (specified in description)”
without a license URL. Confirm that the dataset's terms permit your intended
use before loading or sharing it.

References:

- [Microsoft medallion Lakehouse architecture](https://learn.microsoft.com/nl-nl/fabric/onelake/onelake-medallion-lakehouse-architecture)
- [Lakehouse Git integration](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-git-deployment-pipelines)
- [Notebook Git integration](https://learn.microsoft.com/en-us/fabric/data-engineering/notebook-source-control-deployment)
- [Kaggle IMDb 50K Movie Reviews](https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews)
