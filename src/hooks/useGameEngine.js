// Hook for accessing game engine functionality
// Provides a convenient way to use GameEngine in React components

import { useMemo } from 'react';
import { createGameEngine } from '../lib/gameEngine';

/**
 * Hook to get a game engine instance
 * @param {Object} config - Game engine configuration
 * @param {Set<string>} config.allowedWords - Set of allowed words
 * @returns {GameEngine} Game engine instance
 */
export function useGameEngine(config = {}) {
  return useMemo(() => {
    return createGameEngine(config);
  }, [config.allowedWords]);
}
