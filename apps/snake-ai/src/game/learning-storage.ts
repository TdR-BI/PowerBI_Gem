import { createAgent, type LearningAgent } from "./snake-engine";

const STORAGE_KEY = "snake-ai.learning-model.v1";
const MODEL_VERSION = 2;
const MAX_STATES = 128;
const LEGACY_MAX_STATES = 2048;

type StoredModel = {
    version: number;
    epsilon: number;
    episodes: number;
    bestScore: number;
    lastScore: number;
    recentScores: number[];
    qTable: Record<string, number[]>;
};

export function loadAgent(storage?: Storage): LearningAgent {
    const target = getStorage(storage);
    if (!target) return createAgent();

    try {
        const serialized = target.getItem(STORAGE_KEY);
        if (!serialized) return createAgent();

        const stored = JSON.parse(serialized) as unknown;
        if (
            !isRecord(stored)
            || (stored.version !== 1 && stored.version !== MODEL_VERSION)
            || !isRecord(stored.qTable)
        ) {
            return createAgent();
        }

        const qTable = new Map<string, number[]>();
        const maximumEntries = stored.version === 1 ? LEGACY_MAX_STATES : MAX_STATES;
        for (const [oldState, values] of Object.entries(stored.qTable).slice(0, maximumEntries)) {
            const state = stored.version === 1 && /^[01]{11}$/.test(oldState)
                ? `${oldState.slice(0, 3)}${oldState.slice(7)}`
                : oldState;
            if (!/^[01]{7}$/.test(state) || !isValidActionValues(values)) continue;

            const previousValues = qTable.get(state);
            qTable.set(
                state,
                previousValues
                    ? values.map((value, index) => (previousValues[index] + value) / 2)
                    : values,
            );
        }

        return {
            qTable,
            epsilon: clampNumber(stored.epsilon, 0.03, 1, 1),
            episodes: nonNegativeInteger(stored.episodes),
            bestScore: nonNegativeInteger(stored.bestScore),
            lastScore: nonNegativeInteger(stored.lastScore),
            recentScores: Array.isArray(stored.recentScores)
                ? stored.recentScores.filter(isNonNegativeInteger).slice(-40)
                : [],
        };
    } catch {
        return createAgent();
    }
}

export function saveAgent(agent: LearningAgent, storage?: Storage): void {
    const target = getStorage(storage);
    if (!target) return;

    const model: StoredModel = {
        version: MODEL_VERSION,
        epsilon: agent.epsilon,
        episodes: agent.episodes,
        bestScore: agent.bestScore,
        lastScore: agent.lastScore,
        recentScores: agent.recentScores.slice(-40),
        qTable: Object.fromEntries([...agent.qTable.entries()].slice(0, MAX_STATES)),
    };

    try {
        target.setItem(STORAGE_KEY, JSON.stringify(model));
    } catch {
        return;
    }
}

export function clearSavedAgent(storage?: Storage): void {
    const target = getStorage(storage);
    if (!target) return;

    try {
        target.removeItem(STORAGE_KEY);
    } catch {
        return;
    }
}

function getStorage(storage?: Storage): Storage | null {
    if (storage) return storage;
    try {
        return typeof window === "undefined" ? null : window.localStorage;
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isValidActionValues(value: unknown): value is number[] {
    return Array.isArray(value)
        && value.length === 3
        && value.every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= 1_000_000);
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function nonNegativeInteger(value: unknown): number {
    return isNonNegativeInteger(value) ? value : 0;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
}