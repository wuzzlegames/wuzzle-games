// Hook for game mode detection and configuration
import { useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { parseGameUrl, buildGameUrl } from '../lib/routing';
import { getGameMode, getModeFeatures, modeSupportsFeatureFlag } from '../lib/gameModes';

/**
 * Hook to extract and normalize game mode from URL
 * Replaces complex mode detection logic from Game.jsx
 * 
 * @returns {Object} Game mode configuration
 */
export function useGameMode() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const modeParam = params?.mode;
  const boardsParam = params?.boards;
  const variantParam = params?.variant;
  const codeParam = params?.code;

  const gameConfig = useMemo(() => {
    return parseGameUrl(
      { mode: modeParam, boards: boardsParam, variant: variantParam, code: codeParam },
      searchParams
    );
  }, [modeParam, boardsParam, variantParam, codeParam, searchString, searchParams]);

  const modeConfig = useMemo(() => {
    return getGameMode(gameConfig.mode);
  }, [gameConfig.mode]);

  const isMultiplayer = useMemo(() => {
    return gameConfig.mode === 'multiplayer';
  }, [gameConfig.mode]);

  const seo = useMemo(() => {
    return modeConfig?.seo || {
      title: 'Game – Wuzzle Games',
      description: 'Play Wuzzle Games game modes including daily, marathon, speedrun and multi-board Wordle-style puzzles.',
    };
  }, [modeConfig]);

  const features = useMemo(() => {
    return getModeFeatures(gameConfig.mode);
  }, [gameConfig.mode]);

  const supportsFeature = useCallback((feature) => {
    return modeSupportsFeatureFlag(gameConfig.mode, feature);
  }, [gameConfig.mode]);

  const buildUrl = useCallback(
    (overrides = {}) => buildGameUrl({ ...gameConfig, ...overrides }),
    [gameConfig]
  );

  return {
    ...gameConfig,
    modeConfig,
    isMultiplayer,
    seo,
    features,
    supportsFeature,
    buildUrl,
  };
}
