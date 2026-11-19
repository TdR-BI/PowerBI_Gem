export const ROTTERDAM_CATEGORIES = [
  { id: 'perc_groen', label: 'Groen', color: 'var(--color-map-green)' },
  { id: 'perc_bebouwing', label: 'Bebouwing', color: 'var(--color-map-built)' },
  { id: 'perc_water', label: 'Water', color: 'var(--color-map-water)' },
  {
    id: 'perc_infra_overig',
    label: 'Overige infrastructuur',
    color: 'var(--color-map-other)',
  },
  {
    id: 'perc_infra_auto',
    label: 'Autoverkeer',
    color: 'var(--color-map-car)',
  },
  {
    id: 'perc_infra_ov',
    label: 'Openbaar vervoer',
    color: 'var(--color-map-transit)',
  },
  {
    id: 'perc_infra_fiets',
    label: 'Fietsinfrastructuur',
    color: 'var(--color-map-bike)',
  },
  {
    id: 'perc_infra_voetgangers',
    label: 'Voetgangers',
    color: 'var(--color-map-walk)',
  },
  {
    id: 'perc_infra_parkeervlak',
    label: 'Parkeren',
    color: 'var(--color-map-parking)',
  },
  {
    id: 'perc_infra_vliegverkeer',
    label: 'Luchtvaart',
    color: 'var(--color-map-air)',
  },
] as const;

export type RotterdamCategoryId =
  (typeof ROTTERDAM_CATEGORIES)[number]['id'];
