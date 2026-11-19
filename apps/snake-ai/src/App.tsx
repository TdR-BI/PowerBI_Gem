//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState, type ReactNode } from "react";
import Phaser from "phaser";
import { BrainCircuit, Pause, Play, RotateCcw, SkipForward, Trophy, Zap } from "lucide-react";
import { SnakeScene, type GameMode, type TrainingSnapshot } from "@/game/snake-scene";
import type { Direction } from "@/game/snake-engine";

const EMPTY_SNAPSHOT: TrainingSnapshot = {
    episodes: 0,
    bestScore: 0,
    lastScore: 0,
    states: 0,
    epsilon: 1,
    recentScores: [],
};

function App() {
    const boardRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
    const [isTraining, setIsTraining] = useState(true);
    const [mode, setMode] = useState<GameMode>("ai");
    const [speed, setSpeed] = useState(4);

    useEffect(() => {
        if (!boardRef.current) return;

        const game = new Phaser.Game({
            type: Phaser.CANVAS,
            width: 660,
            height: 480,
            parent: boardRef.current,
            scene: [SnakeScene],
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            render: { antialias: false, pixelArt: true },
        });
        const updateSnapshot = (next: TrainingSnapshot) => setSnapshot(next);
        game.events.on("snake:stats", updateSnapshot);
        gameRef.current = game;

        return () => {
            game.events.off("snake:stats", updateSnapshot);
            game.destroy(true);
            gameRef.current = null;
        };
    }, []);

    const scene = () => gameRef.current?.scene.getScene("SnakeScene") as SnakeScene | undefined;

    useEffect(() => {
        if (mode !== "human") return;

        const keyDirections: Record<string, Direction> = {
            arrowup: "up",
            w: "up",
            arrowright: "right",
            d: "right",
            arrowdown: "down",
            s: "down",
            arrowleft: "left",
            a: "left",
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, button, textarea, select"))) return;

            const direction = keyDirections[event.key.toLowerCase()];
            if (!direction) return;
            event.preventDefault();
            scene()?.queueHumanDirection(direction);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode]);

    const changeMode = (next: GameMode) => {
        setMode(next);
        setIsTraining(true);
        scene()?.setMode(next);
        scene()?.setTraining(true);
        boardRef.current?.focus();
    };

    const toggleTraining = () => {
        const next = !isTraining;
        setIsTraining(next);
        scene()?.setTraining(next);
    };

    const changeSpeed = (next: number) => {
        setSpeed(next);
        scene()?.setSpeed(next);
    };

    const resetBrain = () => {
        scene()?.resetLearning();
        setSnapshot(EMPTY_SNAPSHOT);
    };

    return (
        <main className="min-h-screen bg-surface text-ink">
            <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
                <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
                    <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-ink text-citrus">
                            <BrainCircuit size={22} />
                        </span>
                        <span className="font-heading text-lg font-bold tracking-normal">FIELD / 01</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-200 font-semibold">
                        <span className={`size-2 rounded-full ${isTraining ? "animate-pulse bg-citrus-strong" : "bg-muted-ink"}`} />
                        {isTraining ? (mode === "ai" ? "AI LEERT" : "JOUW ACTIES LEREN") : "GEPAUZEERD"}
                    </div>
                </header>

                <section className="mb-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                        <p className="mb-2 font-mono text-200 font-semibold uppercase tracking-[0.16em] text-muted-ink">
                            Leerlab <span className="px-1 text-food">/</span> Fabric-app
                        </p>
                        <h1 className="font-heading text-hero-900 font-bold leading-none tracking-normal sm:text-hero-1000">
                            SNAKE <span className="text-leaf">LEERT.</span>
                        </h1>
                    </div>
                    <p className="max-w-sm text-300 leading-300 text-muted-ink lg:text-right">
                        RONDE {String(snapshot.episodes + 1).padStart(4, "0")} <span className="px-1 text-food">/</span> Q-LEARNING
                    </p>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.75fr)]">
                    <div className="min-w-0 overflow-hidden rounded-lg border border-board-edge bg-board p-2 shadow-board sm:p-3">
                        <div
                            ref={boardRef}
                            className="snake-stage aspect-[11/8] w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-citrus"
                            role="application"
                            aria-label="Snake speelveld. Gebruik pijltjes of WASD om te sturen."
                            tabIndex={0}
                        />
                        {mode === "human" && (
                            <div className="flex flex-wrap justify-between gap-2 px-2 pt-2 font-mono text-100 uppercase text-citrus">
                                <span>PIJLTJES / WASD</span><span>JOUW ACTIES WORDEN GELEERD</span>
                            </div>
                        )}
                    </div>

                    <aside className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
                            <span className="font-mono text-100 font-semibold text-muted-ink">BESTURING</span>
                            <div className="flex rounded-md bg-surface p-1" role="group" aria-label="Spelmodus">
                                <button
                                    type="button"
                                    onClick={() => changeMode("ai")}
                                    aria-pressed={mode === "ai"}
                                    className={`rounded px-3 py-2 text-200 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${mode === "ai" ? "bg-ink text-white" : "text-muted-ink hover:bg-chip"}`}
                                >
                                    AI
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeMode("human")}
                                    aria-pressed={mode === "human"}
                                    className={`rounded px-3 py-2 text-200 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${mode === "human" ? "bg-ink text-white" : "text-muted-ink hover:bg-chip"}`}
                                >
                                    Zelf spelen
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Metric icon={<Trophy size={17} />} label="TOPSCORE" value={snapshot.bestScore} accent />
                            <Metric icon={<Zap size={17} />} label="LAATSTE SCORE" value={snapshot.lastScore} />
                            <Metric label="RONDES" value={snapshot.episodes.toLocaleString()} />
                            <Metric label="Q-TOESTANDEN" value={snapshot.states.toLocaleString()} />
                        </div>

                        <div className="rounded-lg border border-line bg-panel p-4 sm:p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-heading text-500 font-bold">Training</h2>
                                    <p className="mt-1 font-mono text-200 text-muted-ink">epsilon = {snapshot.epsilon.toFixed(3)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => scene()?.stepOnce()}
                                        title="Voer een stap uit"
                                        aria-label="Voer een stap uit"
                                        disabled={isTraining}
                                        className="grid size-10 place-items-center rounded-md border border-line bg-surface hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <SkipForward size={17} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleTraining}
                                        aria-label={isTraining ? "Pauzeer spel" : mode === "ai" ? "Start training" : "Start spel"}
                                        className="flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-200 font-bold text-white hover:bg-progress focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                                    >
                                        {isTraining ? <Pause size={16} /> : <Play size={16} />}
                                        {isTraining ? "Pauze" : mode === "ai" ? "Train" : "Speel"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetBrain}
                                        title="Wis het geleerde model"
                                        aria-label="Wis het geleerde model"
                                        className="grid size-10 place-items-center rounded-md border border-line bg-surface hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                </div>
                            </div>
                            <label className="flex items-center justify-between gap-4 text-200 font-semibold">
                                <span>SIMULATIESNELHEID</span>
                                <span className="font-mono text-muted-ink">{speed}x</span>
                            </label>
                            <input
                                className="mt-3 w-full accent-progress"
                                type="range"
                                min="1"
                                max="10"
                                value={speed}
                                onChange={(event) => changeSpeed(Number(event.currentTarget.value))}
                                aria-label="Simulatiesnelheid"
                            />
                            <div className="mt-1 flex justify-between font-mono text-100 text-muted-ink">
                                <span>1x</span><span>10x</span>
                            </div>
                        </div>

                        <div className="rounded-lg border border-line bg-panel p-4 sm:p-5">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <h2 className="font-heading text-500 font-bold">Recente scores</h2>
                                <span className="font-mono text-100 uppercase text-muted-ink">laatste {snapshot.recentScores.length}</span>
                            </div>
                            {snapshot.recentScores.length > 0 ? (
                                <div className="flex h-16 items-end gap-1" role="img" aria-label="Recent Snake episode scores">
                                    {snapshot.recentScores.map((score, index) => {
                                        const maxScore = Math.max(1, ...snapshot.recentScores);
                                        return (
                                            <span
                                                key={`${index}-${score}`}
                                                className={`min-w-1 flex-1 rounded-t-sm ${index === snapshot.recentScores.length - 1 ? "bg-food" : "bg-leaf"}`}
                                                style={{ height: `${Math.max(5, (score / maxScore) * 100)}%` }}
                                                title={`Episode score: ${score}`}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="py-4 text-200 text-muted-ink">Nog geen ronde afgerond.</p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 font-mono text-100 uppercase text-muted-ink">
                                <span>alpha 0.10</span><span>gamma 0.90</span><span>epsilon-greedy</span>
                            </div>
                        </div>
                    </aside>
                </section>

                <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 font-mono text-100 uppercase text-muted-ink">
                    <span>LEERGEHEUGEN: DEZE BROWSER</span>
                    <span>+10 VOEDSEL <span className="px-1 text-food">/</span> ROUTEBONUS <span className="px-1 text-food">/</span> -10 BOTSING</span>
                </footer>
            </div>
        </main>
    );
}

function Metric({ icon, label, value, accent = false }: { icon?: ReactNode; label: string; value: string | number; accent?: boolean }) {
    return (
        <div className="min-w-0 rounded-lg border border-line bg-panel p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-100 font-semibold text-muted-ink">
                {icon}{label}
            </div>
            <div className={`truncate font-heading text-hero-700 font-bold tabular-nums ${accent ? "text-progress" : "text-ink"}`}>
                {value}
            </div>
        </div>
    );
}

export default App;
