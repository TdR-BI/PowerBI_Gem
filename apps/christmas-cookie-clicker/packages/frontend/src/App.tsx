import { useContext, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Gift, Moon, RotateCcw, Snowflake, Sun } from 'lucide-react';
import { ThemeContext } from './hooks/theme.context';

type Upgrade = {
  id: 'oven' | 'elf' | 'sled' | 'reindeer';
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costScale: number;
  perSecond: number;
  perClick?: number;
};

const UPGRADES: Upgrade[] = [
  { id: 'oven', name: 'Magische oven', description: '+1 per koekdruk', icon: '🎄', baseCost: 25, costScale: 1.55, perSecond: 0, perClick: 1 },
  { id: 'elf', name: 'Elfendecorateur', description: '+0.5 koekjes per seconde', icon: '🧝', baseCost: 50, costScale: 1.6, perSecond: 0.5 },
  { id: 'sled', name: 'Kerstslee', description: '+3 koekjes per seconde', icon: '🛷', baseCost: 250, costScale: 1.65, perSecond: 3 },
  { id: 'reindeer', name: 'Rendierstal', description: '+12 koekjes per seconde', icon: '🦌', baseCost: 1200, costScale: 1.7, perSecond: 12 },
];

function formatNumber(value: number) {
  if (value < 1000) return Math.floor(value).toLocaleString('nl-NL');
  if (value < 1_000_000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}K`;
  return `${(value / 1_000_000).toFixed(2)}M`;
}

function App() {
  const [cookies, setCookies] = useState(0);
  const [perClick, setPerClick] = useState(1);
  const [owned, setOwned] = useState<Record<Upgrade['id'], number>>({
    oven: 0,
    elf: 0,
    sled: 0,
    reindeer: 0,
  });
  const [popups, setPopups] = useState<{ id: number; x: number; y: number }[]>([]);
  const { isDark, toggleTheme } = useContext(ThemeContext);

  const perSecond = useMemo(
    () => UPGRADES.reduce((total, upgrade) => total + owned[upgrade.id] * upgrade.perSecond, 0),
    [owned]
  );

  useEffect(() => {
    if (perSecond === 0) return;
    const interval = window.setInterval(() => {
      setCookies((current) => current + perSecond / 10);
    }, 100);
    return () => window.clearInterval(interval);
  }, [perSecond]);

  const upgradeCost = (upgrade: Upgrade) => {
    const count = owned[upgrade.id];
    return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costScale, count));
  };

  const bakeCookie = (event: MouseEvent<HTMLButtonElement>) => {
    setCookies((current) => current + perClick);
    const rect = event.currentTarget.getBoundingClientRect();
    setPopups((current) => [
      ...current,
      { id: Date.now() + Math.random(), x: event.clientX - rect.left, y: event.clientY - rect.top },
    ]);
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const cost = upgradeCost(upgrade);
    if (cookies < cost) return;
    setCookies((current) => current - cost);
    setOwned((current) => ({ ...current, [upgrade.id]: current[upgrade.id] + 1 }));
    if (upgrade.perClick) setPerClick((current) => current + upgrade.perClick!);
  };

  const resetGame = () => {
    setCookies(0);
    setPerClick(1);
    setOwned({ oven: 0, elf: 0, sled: 0, reindeer: 0 });
  };

  const achievements = [
    { label: 'Eerste brief', reached: cookies >= 1, icon: '✉️' },
    { label: 'Koekjesmand', reached: cookies >= 100, icon: '🧺' },
    { label: 'Werkplaats bezig', reached: perSecond >= 3, icon: '⚙️' },
    { label: 'Magische nacht', reached: cookies >= 10000, icon: '🌟' },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="snow-layer" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-400 py-500">
        <div className="flex items-center gap-300">
          <span className="grid size-12 place-items-center rounded-full border border-border bg-card shadow-lg">
            <Snowflake className="icon-size-300 text-primary" />
          </span>
          <div>
            <p className="font-mono text-200 font-semibold uppercase tracking-[0.18em] text-muted-foreground">North Pole Bakery</p>
            <h1 className="font-heading text-500 font-bold leading-none sm:text-600">Christmas Cookie Clicker</h1>
          </div>
        </div>
        <div className="flex items-center gap-200">
          <button
            type="button"
            onClick={toggleTheme}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={isDark ? 'Gebruik licht thema' : 'Gebruik donker thema'}
          >
            {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="flex h-10 items-center gap-200 rounded-full border border-border bg-card px-300 text-200 font-semibold text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RotateCcw className="icon-size-200" />
            <span className="hidden sm:inline">Opnieuw</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1440px] gap-500 px-400 pb-800 lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
        <section className="flex min-h-[540px] flex-col items-center justify-between rounded-3xl border border-border bg-card p-500 shadow-2xl sm:p-600">
          <div className="text-center">
            <p className="font-mono text-200 font-semibold uppercase tracking-[0.16em] text-muted-foreground">Kerstvoorraad</p>
            <div className="mt-200 font-heading text-hero-900 font-bold tabular-nums text-primary sm:text-hero-1000">
              {formatNumber(cookies)}
            </div>
            <p className="mt-100 text-300 text-muted-foreground">
              koekjes <span className="mx-100 text-border">•</span> {perSecond.toFixed(perSecond % 1 ? 1 : 0)} per seconde
            </p>
          </div>

          <div className="relative grid place-items-center py-500">
            <div className="cookie-glow absolute size-64 rounded-full sm:size-72" />
            <button
              type="button"
              onClick={bakeCookie}
              className="cookie-button relative grid size-64 place-items-center rounded-full text-[8rem] shadow-2xl outline-none transition-transform duration-75 active:scale-95 focus-visible:ring-4 focus-visible:ring-ring sm:size-72"
              aria-label={`Bak ${perClick} koekjes`}
            >
              <span aria-hidden="true" className="cookie-face">🍪</span>
              {popups.map((popup) => (
                <span
                  key={popup.id}
                  className="cookie-popup"
                  style={{ left: popup.x, top: popup.y }}
                  onAnimationEnd={() => setPopups((current) => current.filter((item) => item.id !== popup.id))}
                >
                  +{perClick}
                </span>
              ))}
            </button>
          </div>

          <div className="grid w-full grid-cols-3 gap-200">
            <Stat label="Per druk" value={`+${perClick}`} />
            <Stat label="Per seconde" value={perSecond.toFixed(perSecond % 1 ? 1 : 0)} />
            <Stat label="Upgrades" value={Object.values(owned).reduce((total, count) => total + count, 0)} />
          </div>
        </section>

        <aside className="flex flex-col gap-500">
          <section className="rounded-3xl border border-border bg-card p-500 shadow-lg">
            <div className="mb-400 flex items-center justify-between">
              <div>
                <p className="font-mono text-200 font-semibold uppercase tracking-[0.16em] text-muted-foreground">Werkplaats</p>
                <h2 className="mt-100 font-heading text-600 font-bold">Kerstuprades</h2>
              </div>
              <Gift className="icon-size-500 text-primary" />
            </div>
            <div className="grid gap-200 sm:grid-cols-2">
              {UPGRADES.map((upgrade) => {
                const cost = upgradeCost(upgrade);
                const affordable = cookies >= cost;
                return (
                  <button
                    type="button"
                    key={upgrade.id}
                    onClick={() => buyUpgrade(upgrade)}
                    disabled={!affordable}
                    className="group flex min-h-32 items-center gap-300 rounded-2xl border border-border bg-background p-300 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-600" aria-hidden="true">{upgrade.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-200">
                        <span className="font-heading font-bold">{upgrade.name}</span>
                        <span className="rounded-full bg-accent px-200 py-100 font-mono text-200 font-bold tabular-nums">{owned[upgrade.id]}</span>
                      </span>
                      <span className="mt-100 block text-200 text-muted-foreground">{upgrade.description}</span>
                      <span className="mt-200 block font-mono text-200 font-bold text-primary">🎄 {formatNumber(cost)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-500 shadow-lg">
            <p className="mb-400 font-mono text-200 font-semibold uppercase tracking-[0.16em] text-muted-foreground">Verzameling</p>
            <div className="grid grid-cols-2 gap-200 sm:grid-cols-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.label}
                  className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border p-300 text-center ${achievement.reached ? 'border-primary bg-accent' : 'border-border bg-muted opacity-50 grayscale'}`}
                >
                  <span className="text-600" aria-hidden="true">{achievement.icon}</span>
                  <span className="mt-200 text-200 font-semibold">{achievement.label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-200 py-300 text-center">
      <p className="font-mono text-200 text-muted-foreground">{label}</p>
      <p className="mt-100 font-heading text-500 font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default App;
