// src/Game.js
import React, { lazy } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { useGameMode } from "./hooks/useGameMode";
import { getCanonicalGameUrl } from "./lib/routing";
import "./Game.css";

const CANONICAL_ORIGIN = "https://wuzzlegames.com";

const GameMultiplayer = lazy(() => import("./components/game/GameMultiplayer"));
const GameSinglePlayer = lazy(() => import("./components/game/GameSinglePlayer"));

const Game = ({
  marathonLevels = [1, 2, 3, 4],
}) => {
  const { mode, boards, speedrun, isMultiplayer, seo, modeConfig } = useGameMode();
  const [searchParams] = useSearchParams();
  const archiveDate = searchParams.get('archiveDate');

  // Convert boards to string for boardsParam (legacy prop format)
  const boardsParam = boards ? boards.toString() : null;

  const canonicalUrl = !isMultiplayer && mode
    ? `${CANONICAL_ORIGIN}${getCanonicalGameUrl({ mode, boards, speedrun })}`
    : null;

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      </Helmet>
      {isMultiplayer ? (
        <GameMultiplayer />
      ) : (
        <GameSinglePlayer
          mode={mode}
          boardsParam={boardsParam}
          speedrunEnabled={speedrun}
          marathonLevels={marathonLevels}
          archiveDate={archiveDate}
        />
      )}
    </>
  );
};

export default Game;
