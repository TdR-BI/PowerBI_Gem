# IMDb medallion Lakehouses

This folder defines three separate Fabric Lakehouses, one for each medallion
layer:

| Lakehouse | Purpose |
| --- | --- |
| `LH_Bronze` | Preserve licensed IMDb source files in their original format. |
| `LH_Silver` | Validate, standardize, and store conforming data as Delta tables. |
| `LH_Gold` | Store curated, analytics-ready Delta tables. |

This follows Microsoft's recommended medallion pattern of using a separate
Lakehouse for each layer. Bronze data remains unchanged; Silver and Gold hold
progressively refined Delta data.

These definitions create empty Lakehouse items only. Fabric Git integration
tracks Lakehouse metadata, but it does not track table data or folders inside
the Lakehouse `Files` area. A Git merge therefore does not load IMDb data or
create data folders. After merging, sync the connected Fabric workspace from
Git; ingestion and transformation notebooks are a separate step.

IMDb bulk products are delivered through Amazon Data Exchange. Obtain the
appropriate access and license before ingesting any IMDb data. No IMDb data,
credentials, or access tokens belong in this repository.

References:

- [Microsoft medallion Lakehouse architecture](https://learn.microsoft.com/nl-nl/fabric/onelake/onelake-medallion-lakehouse-architecture)
- [Lakehouse Git integration](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-git-deployment-pipelines)
- [IMDb bulk data documentation](https://data.imdb.com/documentation/bulk-data-documentation/)
