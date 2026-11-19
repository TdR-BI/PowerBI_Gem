import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet';
import { LoaderCircle, MapPinned, Moon, Search, Sun } from 'lucide-react';

import {
  ROTTERDAM_CATEGORIES,
  type RotterdamCategoryId,
} from '@/data/rotterdam-categories';
import { loadRotterdamAreas, type RotterdamArea } from '@/services/rotterdam-data';
import { useAppTheme } from '@/hooks/use-theme';

type DataState =
  | { status: 'loading' }
  | { status: 'success'; areas: RotterdamArea[] }
  | { status: 'error'; message: string };

const percentFormatter = new Intl.NumberFormat('nl-NL', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const countFormatter = new Intl.NumberFormat('nl-NL');

function percent(value: number | undefined): string {
  return value === undefined ? '—' : `${percentFormatter.format(value)}%`;
}

function App() {
  const { isDark, toggleTheme } = useAppTheme();
  const [dataState, setDataState] = useState<DataState>({ status: 'loading' });
  const [category, setCategory] =
    useState<RotterdamCategoryId>('perc_groen');
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void loadRotterdamAreas(controller.signal).then(
      (areas) => {
        if (!controller.signal.aborted) {
          setDataState({ status: 'success', areas });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setDataState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'De Rotterdamse gegevens konden niet worden geladen.',
          });
        }
      }
    );

    return () => controller.abort();
  }, [retry]);

  const activeCategory =
    ROTTERDAM_CATEGORIES.find((item) => item.id === category) ??
    ROTTERDAM_CATEGORIES[0];
  const filteredAreas = useMemo(() => {
    if (dataState.status !== 'success') {
      return [];
    }
    const query = search.trim().toLocaleLowerCase('nl-NL');
    return dataState.areas.filter((area) =>
      area.neighborhoodName.toLocaleLowerCase('nl-NL').includes(query)
    );
  }, [dataState, search]);

  const summary = useMemo(() => {
    let totalHectares = 0;
    let categoryHectares = 0;
    let highestArea: RotterdamArea | undefined;

    for (const area of filteredAreas) {
      totalHectares += area.areaHectares;
      categoryHectares +=
        (area.areaHectares * area.percentages[category]) / 100;
      if (
        !highestArea ||
        area.percentages[category] > highestArea.percentages[category]
      ) {
        highestArea = area;
      }
    }

    return {
      weightedShare:
        totalHectares > 0 ? (categoryHectares / totalHectares) * 100 : undefined,
      highestArea,
    };
  }, [category, filteredAreas]);

  const isLoading = dataState.status === 'loading';
  const errorMessage =
    dataState.status === 'error' ? dataState.message : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-400 px-400 py-300 sm:px-600">
          <div className="flex items-center gap-300">
            <span className="grid size-1100 place-items-center rounded-xl bg-primary text-primary-foreground">
              <MapPinned className="icon-size-300" aria-hidden="true" />
            </span>
            <div>
              <p className="text-200 font-semibold uppercase tracking-widest text-primary">
                Rotterdam · open data
              </p>
              <h1 className="font-heading text-500 font-bold leading-500">
                Overheid Kaart
              </h1>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-1000 items-center gap-200 rounded-lg border border-border bg-card px-300 text-300 font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={toggleTheme}
            aria-label={isDark ? 'Licht thema inschakelen' : 'Donker thema inschakelen'}
          >
            {isDark ? (
              <Sun className="icon-size-200" aria-hidden="true" />
            ) : (
              <Moon className="icon-size-200" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isDark ? 'Licht' : 'Donker'}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-600 px-400 py-600 sm:px-600 lg:space-y-800 lg:py-800">
        <section aria-labelledby="page-title" className="space-y-200">
          <p className="text-200 font-semibold uppercase tracking-widest text-primary">
            Functioneel stedelijk grondgebruik · peiljaar 2017
          </p>
          <div className="flex flex-col justify-between gap-300 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <h2
                id="page-title"
                className="font-heading text-hero-800 font-bold leading-hero-800 sm:text-hero-900 sm:leading-hero-900"
              >
                Rotterdam, in kaart gebracht
              </h2>
              <p className="mt-200 max-w-2xl text-300 leading-400 text-muted-foreground">
                Bekijk hoe de ruimte is verdeeld over groen, bebouwing, water en
                infrastructuur. Kies een categorie of zoek een buurt.
              </p>
            </div>
            <a
              href="https://data.rotterdam.nl/api/v2/catalog/datasets/functioneel-stedelijk-grondgebruik-op-maaiveldniveau/records"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-100 text-300 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open databron
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section
          aria-label="Kerncijfers van de selectie"
          className="grid gap-300 sm:grid-cols-3"
        >
          <MetricCard
            label="Deelgebieden"
            value={
              dataState.status === 'success'
                ? countFormatter.format(filteredAreas.length)
                : '—'
            }
            detail="in de huidige selectie"
            icon={<MapPinned className="icon-size-200" aria-hidden="true" />}
          />
          <MetricCard
            label="Aandeel in selectie"
            value={
              dataState.status === 'success'
                ? percent(summary.weightedShare)
                : '—'
            }
            detail="gewogen op oppervlakte"
            icon={<span className="text-500 font-bold" aria-hidden="true">%</span>}
          />
          <MetricCard
            label="Hoogste aandeel"
            value={
              dataState.status === 'success'
                ? percent(
                    summary.highestArea?.percentages[category]
                  )
                : '—'
            }
            detail={summary.highestArea?.neighborhoodName ?? 'in één deelgebied'}
            icon={<span className="grid size-500 place-items-center rounded-full bg-primary/15 text-primary" aria-hidden="true">↑</span>}
          />
        </section>

        <section className="grid gap-400 md:grid-cols-2 lg:grid-cols-4">
          <aside className="rounded-2xl border border-border bg-card p-400 sm:p-500 lg:col-span-1">
            <div className="mb-400">
              <p className="text-200 font-semibold uppercase tracking-widest text-muted-foreground">
                Verken de kaart
              </p>
              <h3 className="mt-100 text-400 font-semibold">Filters</h3>
            </div>

            <label
              htmlFor="neighborhood-search"
              className="mb-200 block text-300 font-medium"
            >
              Zoek op buurt
            </label>
            <div className="relative mb-500">
              <Search
                className="pointer-events-none absolute left-300 top-1/2 icon-size-200 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="neighborhood-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Bijv. Hillegersberg"
                className="h-1000 w-full rounded-lg border border-input bg-background pl-800 pr-300 text-300 text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="mb-200 flex items-center justify-between">
              <h3 className="text-300 font-semibold">Categorie</h3>
              <span className="text-200 text-muted-foreground">
                {ROTTERDAM_CATEGORIES.length} opties
              </span>
            </div>
            <div
              aria-label="Kies een categorie"
              className="grid gap-100 sm:grid-cols-2 lg:grid-cols-1"
            >
              {ROTTERDAM_CATEGORIES.map((item) => {
                const selected = item.id === category;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategory(item.id)}
                    className={`flex min-h-1000 items-center gap-200 rounded-lg px-300 text-left text-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <span
                      className="size-300 shrink-0 rounded-full border border-background/50"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-500 rounded-xl bg-muted p-300">
              <p className="text-200 font-semibold text-muted-foreground">
                Geselecteerd
              </p>
              <p className="mt-100 text-300 font-semibold">{activeCategory.label}</p>
              <p className="mt-100 text-200 leading-300 text-muted-foreground">
                De stipgrootte laat het percentage per deelgebied zien.
              </p>
            </div>
          </aside>

          <section
            aria-labelledby="map-title"
            className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-300 border-b border-border px-400 py-300 sm:px-500">
              <div>
                <h3 id="map-title" className="text-400 font-semibold">
                  Stedelijk grondgebruik
                </h3>
                <p className="mt-100 text-200 text-muted-foreground">
                  {activeCategory.label} · Rotterdam
                </p>
              </div>
              <p className="rounded-full bg-muted px-300 py-100 text-200 font-medium text-muted-foreground">
                {isLoading
                  ? 'Gegevens laden'
                  : errorMessage
                    ? 'Geen gegevens'
                    : `${countFormatter.format(filteredAreas.length)} deelgebieden`}
              </p>
            </div>

            <div className="relative h-map-mobile lg:h-map">
              <MapContainer
                center={[51.9225, 4.4792]}
                zoom={11}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredAreas.map((area) => {
                  const value = area.percentages[category];
                  return (
                    <CircleMarker
                      key={area.id}
                      center={[area.latitude, area.longitude]}
                      radius={Math.min(16, 5 + Math.sqrt(value) * 1.1)}
                      pathOptions={{
                        color: activeCategory.color,
                        fillColor: activeCategory.color,
                        fillOpacity: 0.72,
                        weight: 1.5,
                      }}
                    >
                      <Popup>
                        <strong>{area.neighborhoodName}</strong>
                        <br />
                        {activeCategory.label}: {percent(value)}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              {isLoading && (
                <div
                  role="status"
                  className="absolute left-1/2 top-300 z-map-overlay inline-flex -translate-x-1/2 items-center gap-200 rounded-full bg-card px-400 py-200 text-300 shadow-md"
                >
                  <LoaderCircle
                    className="icon-size-200 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  Rotterdamse gegevens laden…
                </div>
              )}
              {errorMessage && (
                <div
                  role="alert"
                  className="absolute inset-0 z-map-overlay grid place-items-center bg-background/85 p-400 text-center backdrop-blur-sm"
                >
                  <div className="max-w-md rounded-2xl border border-border bg-card p-500 shadow-lg">
                    <h4 className="text-400 font-semibold">
                      Kaartgegevens niet beschikbaar
                    </h4>
                    <p className="mt-200 text-300 leading-400 text-muted-foreground">
                      {errorMessage}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDataState({ status: 'loading' });
                        setRetry((count) => count + 1);
                      }}
                      className="mt-400 h-1000 rounded-lg bg-primary px-400 text-300 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Opnieuw proberen
                    </button>
                  </div>
                </div>
              )}
              {!isLoading && !errorMessage && filteredAreas.length === 0 && (
                <div
                  role="status"
                  className="absolute left-1/2 top-300 z-map-overlay -translate-x-1/2 rounded-full bg-card px-400 py-200 text-300 shadow-md"
                >
                  Geen deelgebieden gevonden
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-300 border-t border-border px-400 py-300 text-200 text-muted-foreground sm:px-500">
              <div className="flex items-center gap-200">
                <span
                  className="size-300 rounded-full"
                  style={{ backgroundColor: activeCategory.color }}
                  aria-hidden="true"
                />
                <span>{activeCategory.label}: stipgrootte = percentage</span>
              </div>
              <span>Peiljaar 2017</span>
            </div>
          </section>
        </section>

        <footer className="flex flex-col gap-100 border-t border-border pt-300 text-200 leading-300 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Bron:{' '}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href="https://data.rotterdam.nl/api/v2/catalog/datasets/functioneel-stedelijk-grondgebruik-op-maaiveldniveau/records"
              target="_blank"
              rel="noreferrer"
            >
              Gemeente Rotterdam Open Data
            </a>{' '}
            · percentages per deelgebied, gewogen op oppervlakte.
          </p>
          <p>Kaarttegels: © OpenStreetMap-bijdragers</p>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-400 sm:p-500">
      <div className="flex items-start justify-between gap-300">
        <div>
          <p className="text-300 font-medium text-muted-foreground">{label}</p>
          <p className="mt-200 font-numeric text-hero-700 font-bold leading-hero-700">
            {value}
          </p>
        </div>
        <span className="grid size-900 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-100 truncate text-200 text-muted-foreground">{detail}</p>
    </article>
  );
}

export default App;
