import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";

import App from "./App.jsx";

const PRERENDER_ROUTES = [
  "/",
  "/game",
  "/leaderboard",
  "/faq",
  "/profile",
  "/how-to-play",
  "/stats",
  // SEO landings
  "/multiplayer-wuzzle",
  "/multi-board-wuzzle",
  "/wuzzle-speedrun",
  "/wuzzle-marathon",
];

function toHeadElements(helmet) {
  const reactEls = [
    ...(helmet?.meta?.toComponent?.() || []),
    ...(helmet?.link?.toComponent?.() || []),
    ...(helmet?.script?.toComponent?.() || []),
  ]
    .flat()
    .filter(Boolean);

  return new Set(
    reactEls.map((el) => ({
      type: el.type,
      props: el.props,
    }))
  );
}

export async function prerender(data) {
  const url = data?.url || "/";
  const helmetContext = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url} basename="/wuzzle-games">
        <App />
      </StaticRouter>
    </HelmetProvider>
  );

  const helmet = helmetContext.helmet;

  return {
    html,
    links: new Set(PRERENDER_ROUTES),
    head: {
      lang: "en",
      title:
        helmet?.title?.toString?.().replace(/<\/?title>/g, "") ||
        "Wuzzle Games",
      elements: toHeadElements(helmet),
    },
  };
}
