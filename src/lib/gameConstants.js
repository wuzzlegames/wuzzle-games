// Game constants

import { WORD_LENGTH } from "./wordle";

// Board and game limits
export const MAX_BOARDS = 32;
export const MIN_BOARDS = 1;
export const DEFAULT_MAX_TURNS = 6;
export const DEFAULT_MAX_PLAYERS = 2;
export const ABSOLUTE_MAX_PLAYERS = 8;

// Timing constants
export const TIMER_INTERVAL_MS = 100; // High-frequency timer interval for speedrun
export const SPEEDRUN_COUNTDOWN_MS = 3000; // 3-2-1 countdown before timer starts (1s per step)
export const MESSAGE_TIMEOUT_MS = 5000; // Default timeout for toast messages
export const LONG_MESSAGE_TIMEOUT_MS = 10000; // Longer timeout for important messages
export const VERIFICATION_MESSAGE_TIMEOUT_MS = 8000; // Timeout for verification messages
export const CONFIG_MESSAGE_TIMEOUT_MS = 3000; // Timeout for configuration messages

// Flip settings - tiles flip sequentially
export const FLIP_MS = 500;      // how long a single tile flip takes
export const FLIP_DELAY_PER_TILE = 300;  // delay between each tile starting its flip
// Total time for all tiles to finish flipping: flip duration + (number of tiles - 1) * delay per tile
export const FLIP_COMPLETE_MS = FLIP_MS + (WORD_LENGTH - 1) * FLIP_DELAY_PER_TILE;
