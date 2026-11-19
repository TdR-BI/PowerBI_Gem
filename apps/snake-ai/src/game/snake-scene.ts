import Phaser from "phaser";
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    createAgent,
    createGameState,
    takeHumanStep,
    takeTrainingStep,
    turnDirection,
    type Action,
    type Direction,
    type LearningAgent,
    type SnakeGameState,
    type TrainingStep,
} from "./snake-engine";
import { clearSavedAgent, loadAgent, saveAgent } from "./learning-storage";

export type TrainingSnapshot = {
    episodes: number;
    bestScore: number;
    lastScore: number;
    states: number;
    epsilon: number;
    recentScores: number[];
};

export type GameMode = "ai" | "human";

const CELL_SIZE = 30;
const TICK_MS = 140;
const HUMAN_TICK_BASE_MS = 320;
const SAVE_EVERY_MOVES = 100;

function themeColor(name: string): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return Number.parseInt(value.replace("#", ""), 16);
}

export class SnakeScene extends Phaser.Scene {
    private graphics!: Phaser.GameObjects.Graphics;
    private gameState: SnakeGameState = createGameState();
    private agent: LearningAgent = loadAgent();
    private mode: GameMode = "ai";
    private training = true;
    private movesPerTick = 4;
    private accumulator = 0;
    private oneStepQueued = false;
    private queuedHumanDirection: Direction | null = null;
    private movesSinceSave = 0;

    constructor() {
        super("SnakeScene");
    }

    create(): void {
        this.graphics = this.add.graphics();
        this.drawBoard();
        this.publishSnapshot();
    }

    update(_time: number, delta: number): void {
        if (this.training) {
            this.accumulator += delta;
            const tickMs = this.mode === "human"
                ? Math.max(100, HUMAN_TICK_BASE_MS - this.movesPerTick * 22)
                : TICK_MS;
            if (this.accumulator >= tickMs) {
                this.accumulator %= tickMs;
                if (this.mode === "human") {
                    this.advanceHuman();
                } else {
                    for (let move = 0; move < this.movesPerTick; move += 1) {
                        this.advanceAgent();
                    }
                }
                this.drawBoard();
                this.publishSnapshot();
            }
        } else if (this.oneStepQueued) {
            this.oneStepQueued = false;
            if (this.mode === "human") this.advanceHuman();
            else this.advanceAgent();
            this.drawBoard();
            this.publishSnapshot();
        }
    }

    setMode(mode: GameMode): void {
        if (this.mode === mode) return;
        saveAgent(this.agent);
        this.movesSinceSave = 0;
        this.mode = mode;
        this.gameState = createGameState();
        this.accumulator = 0;
        this.queuedHumanDirection = null;
        this.training = true;
        this.drawBoard();
        this.publishSnapshot();
    }

    queueHumanDirection(direction: Direction): void {
        if (this.mode === "human") this.queuedHumanDirection = direction;
    }

    setTraining(training: boolean): void {
        this.training = training;
    }

    setSpeed(speed: number): void {
        this.movesPerTick = speed;
    }

    stepOnce(): void {
        this.oneStepQueued = true;
    }

    resetLearning(): void {
        clearSavedAgent();
        this.agent = createAgent();
        this.gameState = createGameState();
        this.accumulator = 0;
        this.movesSinceSave = 0;
        this.drawBoard();
        this.publishSnapshot();
    }

    private advanceAgent(): void {
        this.recordStep(takeTrainingStep(this.gameState, this.agent));
    }

    private advanceHuman(): void {
        const requestedDirection = this.queuedHumanDirection ?? this.gameState.direction;
        this.queuedHumanDirection = null;

        let action: Action = 0;
        if (requestedDirection === turnDirection(this.gameState.direction, 1)) action = 1;
        else if (requestedDirection === turnDirection(this.gameState.direction, 2)) action = 2;

        this.recordStep(takeHumanStep(this.gameState, this.agent, action));
    }

    private recordStep(result: TrainingStep): void {
        this.gameState = result.game;
        this.movesSinceSave += 1;

        if (result.episodeEnded || this.movesSinceSave >= SAVE_EVERY_MOVES) {
            saveAgent(this.agent);
            this.movesSinceSave = 0;
        }
    }

    private drawBoard(): void {
        const graphics = this.graphics;
        graphics.clear();
        graphics.fillStyle(themeColor("--color-board"), 1);
        graphics.fillRect(0, 0, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
        graphics.lineStyle(1, themeColor("--color-board-edge"), 0.9);
        for (let x = 0; x <= BOARD_WIDTH; x += 1) {
            graphics.lineBetween(x * CELL_SIZE, 0, x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
        }
        for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
            graphics.lineBetween(0, y * CELL_SIZE, BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
        }

        graphics.fillStyle(themeColor("--color-food"), 1);
        graphics.fillCircle(
            this.gameState.food.x * CELL_SIZE + CELL_SIZE / 2,
            this.gameState.food.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE * 0.32,
        );
        graphics.fillStyle(themeColor("--color-leaf"), 1);
        graphics.fillRect(this.gameState.food.x * CELL_SIZE + 15, this.gameState.food.y * CELL_SIZE + 4, 3, 7);

        this.gameState.snake.slice(1).forEach((segment, index, body) => {
            const inset = 4;
            graphics.fillStyle(themeColor(index === body.length - 1 ? "--color-citrus" : "--color-leaf"), 1);
            graphics.fillRoundedRect(
                segment.x * CELL_SIZE + inset,
                segment.y * CELL_SIZE + inset,
                CELL_SIZE - inset * 2,
                CELL_SIZE - inset * 2,
                7,
            );
        });

        const head = this.gameState.snake[0];
        const x = head.x * CELL_SIZE;
        const y = head.y * CELL_SIZE;
        graphics.fillStyle(themeColor("--color-citrus"), 1);
        graphics.fillRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
        graphics.fillStyle(themeColor("--color-ink"), 1);
        const eyes = this.gameState.direction === "right"
            ? [[x + 21, y + 9], [x + 21, y + 21]]
            : this.gameState.direction === "left"
                ? [[x + 9, y + 9], [x + 9, y + 21]]
                : this.gameState.direction === "up"
                    ? [[x + 9, y + 9], [x + 21, y + 9]]
                    : [[x + 9, y + 21], [x + 21, y + 21]];
        eyes.forEach(([eyeX, eyeY]) => graphics.fillCircle(eyeX, eyeY, 2.4));
    }

    private publishSnapshot(): void {
        const snapshot: TrainingSnapshot = {
            episodes: this.agent.episodes,
            bestScore: this.agent.bestScore,
            lastScore: this.agent.lastScore,
            states: this.agent.qTable.size,
            epsilon: this.agent.epsilon,
            recentScores: [...this.agent.recentScores],
        };
        this.game.events.emit("snake:stats", snapshot);
    }
}