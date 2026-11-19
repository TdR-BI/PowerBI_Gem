import { useState } from "react";
import { BarChart3, Dice6, MousePointerClick, RotateCcw } from "lucide-react";

const EXPECTED_WEIGHTS: Record<number, number> = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1,
};

const initialCounts = () =>
    Object.fromEntries(Array.from({ length: 11 }, (_, index) => [index + 2, 0])) as Record<number, number>;

function App() {
    const [dice, setDice] = useState<[number, number]>([1, 1]);
    const [clickCount, setClickCount] = useState(0);
    const [counts, setCounts] = useState<Record<number, number>>(initialCounts);

    const rollCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const uniqueResults = Object.values(counts).filter((count) => count > 0).length;
    const weightedSum = Object.entries(counts).reduce(
        (sum, [result, count]) => sum + Number(result) * count,
        0,
    );
    const average = rollCount === 0 ? 0 : weightedSum / rollCount;

    const rollDice = () => {
        const nextDice: [number, number] = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
        ];
        const result = nextDice[0] + nextDice[1];

        setDice(nextDice);
        setClickCount((count) => count + 1);
        setCounts((current) => ({
            ...current,
            [result]: current[result] + 1,
        }));
    };

    const reset = () => {
        setDice([1, 1]);
        setClickCount(0);
        setCounts(initialCounts());
    };

    return (
        <main className="min-h-full bg-[#f4f6f8] text-[#202b33] dark:bg-[#252525] dark:text-white">
            <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
                <header className="mb-8 flex items-end justify-between border-b border-[#dce2e6] pb-5 dark:border-[#525252]">
                    <div>
                        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0e7490] dark:text-[#55c2de]">
                            <Dice6 size={18} /> TRAINING_TOM
                        </p>
                        <h1 className="text-3xl font-bold tracking-normal">Dobbelmonitor</h1>
                    </div>
                    <button
                        type="button"
                        onClick={reset}
                        disabled={rollCount === 0 && clickCount === 0}
                        className="flex h-10 items-center gap-2 rounded-md border border-[#cad3d8] bg-white px-3 text-sm font-semibold hover:bg-[#edf1f3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#525252] dark:bg-[#292929] dark:hover:bg-[#3d3d3d]"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                </header>

                <section className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-lg border border-[#dce2e6] bg-white p-6 dark:border-[#525252] dark:bg-[#292929]">
                        <div className="mb-5 flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#657680] dark:text-[#adadad]">Laatste worp</span>
                            <span className="rounded-full bg-[#e8eef1] px-3 py-1 text-sm font-bold text-[#0e7490] dark:bg-[#3d3d3d] dark:text-[#55c2de]">
                                {dice[0] + dice[1]}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4" aria-label={`Worp: ${dice[0]} en ${dice[1]}`}>
                            {dice.map((value, index) => (
                                <div
                                    key={index}
                                    className="aspect-square max-h-44 rounded-lg border-2 border-[#202b33] bg-[#fffef8] text-center text-7xl font-bold leading-[176px] shadow-[0_8px_0_rgba(32,43,51,0.12)] dark:border-[#adadad] dark:bg-[#343434]"
                                >
                                    {value}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={rollDice}
                            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#d97706] text-base font-bold text-white shadow-[0_4px_0_#9a4f00] hover:bg-[#bf6500] active:translate-y-[2px] active:shadow-[0_2px_0_#9a4f00]"
                        >
                            <Dice6 size={20} /> Gooi de dobbelstenen
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 content-start">
                        <Metric icon={<MousePointerClick size={18} />} label="Klikken" value={clickCount} />
                        <Metric icon={<Dice6 size={18} />} label="Worpen" value={rollCount} />
                        <Metric icon={<BarChart3 size={18} />} label="Unieke resultaten" value={uniqueResults} />
                        <Metric icon={<BarChart3 size={18} />} label="Gemiddelde" value={average.toFixed(2)} />
                    </div>
                </section>

                <section className="mt-5 rounded-lg border border-[#dce2e6] bg-white p-5 dark:border-[#525252] dark:bg-[#292929]">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Verdeling van de uitkomsten</h2>
                            <p className="text-sm text-[#657680] dark:text-[#adadad]">
                                Werkelijke frequentie in oranje; verwachte somverdeling in blauw.
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <div className="font-semibold">Normale verdeling</div>
                            <div className="text-[#657680] dark:text-[#adadad]">verwacht gemiddelde: 7,00</div>
                        </div>
                    </div>

                    <div className="grid h-64 grid-cols-11 items-end gap-2 border-b border-[#cad3d8] pb-2" aria-label="Frequentieverdeling van 2 tot 12">
                        {Array.from({ length: 11 }, (_, index) => index + 2).map((result) => {
                            const actual = rollCount === 0 ? 0 : counts[result] / rollCount;
                            const expected = EXPECTED_WEIGHTS[result] / 36;
                            const highest = Math.max(actual, expected, 1 / 36);

                            return (
                                <div key={result} className="flex h-full flex-col justify-end text-center">
                                    <div className="relative flex h-[215px] items-end justify-center gap-1">
                                        <div
                                            className="w-[38%] min-w-1 rounded-t-sm bg-[#d97706]"
                                            style={{ height: `${Math.max(actual / highest * 100, actual > 0 ? 4 : 0)}%` }}
                                            title={`Werkelijk ${counts[result]} keer`}
                                        />
                                        <div
                                            className="w-[38%] min-w-1 rounded-t-sm bg-[#76b9c9]"
                                            style={{ height: `${expected / highest * 100}%` }}
                                            title={`Verwacht ${(expected * 100).toFixed(1)}%`}
                                        />
                                    </div>
                                    <div className="pt-2 text-sm font-bold">{result}</div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </main>
    );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-[#dce2e6] bg-white p-5 dark:border-[#525252] dark:bg-[#292929]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#657680] dark:text-[#adadad]">
                {icon} {label}
            </div>
            <div className="text-4xl font-bold tabular-nums text-[#202b33] dark:text-white">{value}</div>
        </div>
    );
}

export default App;
