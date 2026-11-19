export const BOARD_WIDTH = 22;
export const BOARD_HEIGHT = 16;
export const MAX_STEPS_PER_EPISODE = 600;

export type Point = { x: number; y: number };
export type Direction = "up" | "right" | "down" | "left";
export type Action = 0 | 1 | 2;

export type SnakeGameState = {
    snake: Point[];
    direction: Direction;
    food: Point;
    score: number;
    steps: number;
};

export type LearningAgent = {
    qTable: Map<string, number[]>;
    epsilon: number;
    episodes: number;
    bestScore: number;
    lastScore: number;
    recentScores: number[];
};

export type TrainingStep = {
    game: SnakeGameState;
    episodeEnded: boolean;
};

const VECTORS: Record<Direction, Point> = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
};

const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

export function createAgent(): LearningAgent {
    return {
        qTable: new Map(),
        epsilon: 1,
        episodes: 0,
        bestScore: 0,
        lastScore: 0,
        recentScores: [],
    };
}

export function createGameState(random: () => number = Math.random): SnakeGameState {
    const head = { x: Math.floor(BOARD_WIDTH / 2), y: Math.floor(BOARD_HEIGHT / 2) };
    const snake = [head, { x: head.x - 1, y: head.y }, { x: head.x - 2, y: head.y }];
    return { snake, direction: "right", food: spawnFood(snake, random), score: 0, steps: 0 };
}

export function encodeState(game: SnakeGameState): string {
    const head = game.snake[0];
    const vector = VECTORS[game.direction];
    const rightDirection = turnDirection(game.direction, 1);
    const leftDirection = turnDirection(game.direction, 2);
    const foodDx = game.food.x - head.x;
    const foodDy = game.food.y - head.y;
    const foodForward = foodDx * vector.x + foodDy * vector.y;
    const foodRight = foodDx * -vector.y + foodDy * vector.x;
    const flags = [
        dangerAt(game, game.direction),
        dangerAt(game, rightDirection),
        dangerAt(game, leftDirection),
        foodForward > 0,
        foodRight > 0,
        foodForward < 0,
        foodRight < 0,
    ];
    return flags.map((flag) => Number(flag)).join("");
}

export function takeTrainingStep(
    game: SnakeGameState,
    agent: LearningAgent,
    random: () => number = Math.random,
): TrainingStep {
    const action = chooseAction(qValues(agent, encodeState(game)), agent.epsilon, random);
    return applyAction(game, agent, action, random);
}

export function takeHumanStep(
    game: SnakeGameState,
    agent: LearningAgent,
    action: Action,
    random: () => number = Math.random,
): TrainingStep {
    return applyAction(game, agent, action, random);
}

function applyAction(
    game: SnakeGameState,
    agent: LearningAgent,
    action: Action,
    random: () => number,
): TrainingStep {
    const stateKey = encodeState(game);
    const values = qValues(agent, stateKey);
    const direction = turnDirection(game.direction, action);
    const vector = VECTORS[direction];
    const head = { x: game.snake[0].x + vector.x, y: game.snake[0].y + vector.y };
    const ateFood = head.x === game.food.x && head.y === game.food.y;
    const collided = hitsWall(head) || hitsBody(head, game.snake, ateFood);
    const distanceBefore = manhattanDistance(game.snake[0], game.food);
    const distanceAfter = manhattanDistance(head, game.food);

    let nextGame = game;
    if (!collided) {
        const snake = [head, ...game.snake];
        if (!ateFood) snake.pop();
        nextGame = {
            snake,
            direction,
            food: ateFood ? spawnFood(snake, random) : game.food,
            score: game.score + Number(ateFood),
            steps: game.steps + 1,
        };
    }

    const timedOut = !collided && nextGame.steps >= MAX_STEPS_PER_EPISODE;
    const episodeEnded = collided || timedOut;
    const reward = collided
        ? -10
        : timedOut
            ? -2
            : ateFood
                ? 10
                : distanceAfter < distanceBefore ? 0.2 : -0.1;
    const nextValues = episodeEnded ? [0, 0, 0] : qValues(agent, encodeState(nextGame));
    const bestFuture = Math.max(...nextValues);
    values[action] += 0.1 * (reward + (episodeEnded ? 0 : 0.9 * bestFuture) - values[action]);

    if (episodeEnded) {
        agent.episodes += 1;
        agent.lastScore = nextGame.score;
        agent.bestScore = Math.max(agent.bestScore, nextGame.score);
        agent.recentScores = [...agent.recentScores.slice(-39), nextGame.score];
        agent.epsilon = Math.max(0.03, agent.epsilon * 0.97);
        nextGame = createGameState(random);
    }

    return { game: nextGame, episodeEnded };
}

export function turnDirection(direction: Direction, action: Action): Direction {
    const currentIndex = DIRECTIONS.indexOf(direction);
    const offset = action === 1 ? 1 : action === 2 ? -1 : 0;
    return DIRECTIONS[(currentIndex + offset + DIRECTIONS.length) % DIRECTIONS.length];
}

function chooseAction(values: number[], epsilon: number, random: () => number): Action {
    if (random() < epsilon) return Math.floor(random() * 3) as Action;
    let bestAction: Action = 0;
    for (let action = 1; action < values.length; action += 1) {
        if (values[action] > values[bestAction]) bestAction = action as Action;
    }
    return bestAction;
}

function qValues(agent: LearningAgent, state: string): number[] {
    let values = agent.qTable.get(state);
    if (!values) {
        values = [0, 0, 0];
        agent.qTable.set(state, values);
    }
    return values;
}

function dangerAt(game: SnakeGameState, direction: Direction): boolean {
    const vector = VECTORS[direction];
    const next = { x: game.snake[0].x + vector.x, y: game.snake[0].y + vector.y };
    const eating = next.x === game.food.x && next.y === game.food.y;
    return hitsWall(next) || hitsBody(next, game.snake, eating);
}

function hitsWall(point: Point): boolean {
    return point.x < 0 || point.x >= BOARD_WIDTH || point.y < 0 || point.y >= BOARD_HEIGHT;
}

function manhattanDistance(first: Point, second: Point): number {
    return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
}

function hitsBody(point: Point, snake: Point[], eating: boolean): boolean {
    const body = eating ? snake : snake.slice(0, -1);
    return body.some((segment) => segment.x === point.x && segment.y === point.y);
}

function spawnFood(snake: Point[], random: () => number): Point {
    let food: Point;
    do {
        food = {
            x: Math.floor(random() * BOARD_WIDTH),
            y: Math.floor(random() * BOARD_HEIGHT),
        };
    } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
    return food;
}