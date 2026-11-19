import { describe, expect, it, vi } from 'vitest';

import { loadRotterdamAreas } from './rotterdam-data';

function apiRecord(id: string) {
  return {
    record: {
      id,
      fields: {
        geo_point_2d: { lat: 51.9, lon: 4.5 },
        cbs_buurtnaam: 'Centrum',
        opp_gebied_ha: 25,
        perc_groen: 10,
        perc_bebouwing: 20,
        perc_water: 30,
        perc_infra_overig: 0,
        perc_infra_auto: 5,
        perc_infra_ov: 1,
        perc_infra_fiets: 3,
        perc_infra_voetgangers: 12,
        perc_infra_parkeervlak: 18,
        perc_infra_vliegverkeer: 1,
      },
    },
  };
}

function response(totalCount: number, records: unknown[]) {
  return new Response(JSON.stringify({ total_count: totalCount, records }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('loadRotterdamAreas', () => {
  it('requests only map fields, normalizes coordinates, and paginates', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(2, [apiRecord('area-1')]))
      .mockResolvedValueOnce(response(2, [apiRecord('area-2')]));

    const areas = await loadRotterdamAreas(undefined, fetcher);

    expect(areas).toHaveLength(2);
    expect(areas[0]).toMatchObject({
      id: 'area-1',
      neighborhoodName: 'Centrum',
      latitude: 51.9,
      longitude: 4.5,
      areaHectares: 25,
      percentages: { perc_water: 30 },
    });
    const firstUrl = new URL(String(fetcher.mock.calls[0][0]));
    const secondUrl = new URL(String(fetcher.mock.calls[1][0]));
    expect(firstUrl.searchParams.get('select')).toContain('geo_point_2d');
    expect(firstUrl.searchParams.get('select')).not.toContain('geo_shape');
    expect(firstUrl.searchParams.get('offset')).toBe('0');
    expect(secondUrl.searchParams.get('offset')).toBe('1');
  });

  it('fails explicitly when the API returns an unsuccessful status', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(loadRotterdamAreas(undefined, fetcher)).rejects.toThrow(
      'HTTP 503'
    );
  });
});
