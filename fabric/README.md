# IMDb review medallion flow

The Fabric source items in this folder implement three separate Lakehouses,
following Microsoft's medallion architecture:

| Lakehouse | Purpose |
| --- | --- |
| `LH_Bronze` | Discover source CSVs in `Files` and append new content to a raw Delta table. |
| `LH_Silver` | Validate labels, trim text, and derive review length and word count. |
| `LH_Gold` | Publish an analytics-ready sentiment summary as a Delta table. |

The pipeline `0-PL-Execute-IMDB-Medallion` discovers input files first and
runs the Silver and Gold notebooks only when processing is pending.
The source files are intentionally not stored in Git. Download the Kaggle
dataset, verify that its terms permit your intended use, and upload one or
more CSV files anywhere under the `Files` folder of `LH_Bronze`. The notebook
discovers CSV files recursively, so neither the file name nor a `landing`
subfolder is required. Each CSV must contain exactly the `review` and
`sentiment` columns.

Bronze fingerprints each CSV by its SHA-256 content hash and ingests a hash
only once. Identical file contents are skipped even if the file name changes;
changed contents are treated as a new batch and appended. Upload changed
versions as separate files if the previous version should remain in the
history. The original files remain unchanged, and the Delta table records each
source path and hash. Silver and Gold run only when Bronze reports data that
has not yet been processed. Gold stores the processed hashes so a later
pipeline run can retry if a transform failed.

Run the pipeline after uploading new files. No pipeline schedule or automatic
file-arrival trigger is configured by these source definitions.

All notebooks resolve an empty `workspace_name` parameter from the current
Fabric runtime workspace, so the same pipeline works when synced to another
workspace. Set the parameter only when a notebook should intentionally read
Lakehouses in a different workspace. The notebooks do not use a default
Lakehouse binding, so Fabric does not need to resolve a placeholder workspace
ID at notebook startup.

The Delta tables are written directly under each Lakehouse's `Tables` folder.
They can be read by the next notebook through the matching OneLake path.

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
