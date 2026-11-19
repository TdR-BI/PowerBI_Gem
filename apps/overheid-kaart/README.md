# Overheid Kaart

An interactive, Dutch-language map of Rotterdam's functional land use. Choose
one of ten categories, search by neighbourhood, and compare the selected share
across mapped areas.

## Data source

The app reads the public [Functioneel stedelijk grondgebruik op
maaiveldniveau](https://data.rotterdam.nl/api/v2/catalog/datasets/functioneel-stedelijk-grondgebruik-op-maaiveldniveau/records)
dataset from Rotterdam's open-data API. It contains 920 mapped areas with
centroid coordinates and land-use percentages. The dataset's reference year is
2017; the source can change independently of this app.

Only the fields needed for the map are requested. Data is fetched directly from
the public API in the browser; the app does not store it or send it to a
backend. Map tiles come from OpenStreetMap and are attributed in the map.

## Run locally

From this directory:

```sh
npm install
npx rayfin login
npm run dev:frontend
```

The app uses the Rayfin authentication shell locally and when hosted in Fabric.
The map's public Rotterdam data is available after sign-in; app content remains
protected by the existing authentication gate.

## Validate

```sh
npm run typecheck
npm run build
npm run lint
npm test
```

Deployment is handled through the repository's pull-request review and
deployment-environment approval flow.
