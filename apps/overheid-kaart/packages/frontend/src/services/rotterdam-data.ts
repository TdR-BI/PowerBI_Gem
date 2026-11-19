import {
  ROTTERDAM_CATEGORIES,
  type RotterdamCategoryId,
} from '@/data/rotterdam-categories';

const API_URL =
  'https://data.rotterdam.nl/api/v2/catalog/datasets/functioneel-stedelijk-grondgebruik-op-maaiveldniveau/records';
const PAGE_SIZE = 100;
const MAX_RECORDS = 2_000;
const SELECTED_FIELDS = [
  'geo_point_2d',
  'cbs_buurtnaam',
  'opp_gebied_ha',
  ...ROTTERDAM_CATEGORIES.map(({ id }) => id),
];

export interface RotterdamArea {
  id: string;
  neighborhoodName: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  percentages: Record<RotterdamCategoryId, number>;
}

interface RotterdamPage {
  totalCount: number;
  records: RotterdamArea[];
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseArea(value: unknown): RotterdamArea {
  const record = objectValue(objectValue(value)?.record);
  const fields = objectValue(record?.fields);
  const point = objectValue(fields?.geo_point_2d);
  const id = record?.id;
  const neighborhoodName = fields?.cbs_buurtnaam;
  const areaHectares = fields?.opp_gebied_ha;
  const latitude = point?.lat;
  const longitude = point?.lon;

  if (
    typeof id !== 'string' ||
    typeof neighborhoodName !== 'string' ||
    typeof areaHectares !== 'number' ||
    !Number.isFinite(areaHectares) ||
    areaHectares <= 0 ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('De Rotterdamse dataset bevat een ongeldig deelgebied.');
  }

  const percentages = {} as Record<RotterdamCategoryId, number>;
  for (const { id: categoryId } of ROTTERDAM_CATEGORIES) {
    const percentage = fields?.[categoryId];
    if (
      typeof percentage !== 'number' ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      throw new Error(
        'De Rotterdamse dataset bevat een ongeldig categoriepercentage.'
      );
    }
    percentages[categoryId] = percentage;
  }

  return {
    id,
    neighborhoodName,
    latitude,
    longitude,
    areaHectares,
    percentages,
  };
}

function parsePage(value: unknown): RotterdamPage {
  const page = objectValue(value);
  const totalCount = page?.total_count;
  if (
    !page ||
    typeof totalCount !== 'number' ||
    !Number.isInteger(totalCount) ||
    totalCount < 0 ||
    !Array.isArray(page.records)
  ) {
    throw new Error('De open data-service gaf een ongeldig antwoord.');
  }

  return {
    totalCount,
    records: page.records.map(parseArea),
  };
}

export async function loadRotterdamAreas(
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<RotterdamArea[]> {
  const areas: RotterdamArea[] = [];
  let offset = 0;
  let expectedTotal: number | undefined;

  while (expectedTotal === undefined || offset < expectedTotal) {
    const url = new URL(API_URL);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('select', SELECTED_FIELDS.join(','));

    let response: Response;
    try {
      response = await fetcher(url, { signal });
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      throw new Error(
        'Kan geen verbinding maken met de open data van Rotterdam.'
      );
    }

    if (!response.ok) {
      throw new Error(
        `De Rotterdamse gegevensservice antwoordt niet (HTTP ${response.status}).`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error('De open data-service gaf een ongeldig antwoord.');
    }

    const page = parsePage(payload);
    if (expectedTotal === undefined) {
      expectedTotal = page.totalCount;
      if (expectedTotal > MAX_RECORDS) {
        throw new Error(
          'De dataset is groter dan de kaart veilig kan verwerken.'
        );
      }
    } else if (page.totalCount !== expectedTotal) {
      throw new Error(
        'De dataset is gewijzigd tijdens het laden. Probeer het opnieuw.'
      );
    }

    if (page.records.length === 0 && offset < expectedTotal) {
      throw new Error('De dataset kon niet volledig worden opgehaald.');
    }

    areas.push(...page.records);
    offset += page.records.length;
  }

  return areas;
}
