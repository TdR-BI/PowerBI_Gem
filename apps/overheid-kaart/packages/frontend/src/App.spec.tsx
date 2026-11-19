import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { loadRotterdamAreas, type RotterdamArea } from '@/services/rotterdam-data';

vi.mock('@/services/rotterdam-data', () => ({
  loadRotterdamAreas: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  CircleMarker: () => null,
  MapContainer: () => null,
  Popup: () => null,
  TileLayer: () => null,
}));

const sampleArea: RotterdamArea = {
  id: 'area-1',
  neighborhoodName: 'Hillegersberg Noord',
  latitude: 51.9555,
  longitude: 4.4898,
  areaHectares: 100,
  percentages: {
    perc_groen: 40,
    perc_bebouwing: 10,
    perc_water: 12.5,
    perc_infra_overig: 2,
    perc_infra_auto: 8,
    perc_infra_ov: 1,
    perc_infra_fiets: 4,
    perc_infra_voetgangers: 12,
    perc_infra_parkeervlak: 10,
    perc_infra_vliegverkeer: 0.5,
  },
};

describe('Overheid Kaart', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadRotterdamAreas).mockResolvedValue([sampleArea]);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  it('renders the map dashboard and filters by category and neighbourhood', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: 'Rotterdam, in kaart gebracht',
      })
    ).toBeVisible();
    expect(screen.getAllByText('40,0%')).toHaveLength(2);
    expect(screen.getByRole('searchbox', { name: 'Zoek op buurt' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Water' }));
    expect(screen.getByRole('button', { name: 'Water' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getAllByText('12,5%')).toHaveLength(2);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Zoek op buurt' }), {
      target: { value: 'bestaat niet' },
    });
    expect(await screen.findByText('Geen deelgebieden gevonden')).toBeVisible();
  });

  it('shows a recoverable error and retries the data request', async () => {
    vi.mocked(loadRotterdamAreas)
      .mockRejectedValueOnce(new Error('De dataset is tijdelijk niet bereikbaar.'))
      .mockResolvedValueOnce([sampleArea]);

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'De dataset is tijdelijk niet bereikbaar.'
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Opnieuw proberen' })
    );

    await waitFor(() => {
      expect(loadRotterdamAreas).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findAllByText('40,0%')).toHaveLength(2);
  });
});
