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

  // vite-prerender-plugin assumes non-children prop values are strings (it calls .replace).
  // react-helmet-async includes boolean props like data-rh/data-react-helmet, so normalise.
  const normaliseProps = (props) => {
    const out = {};
    Object.keys(props || {}).forEach((k) => {
      const v = props[k];
      if (v == null) return;
      if (k === 'children' || k === 'textContent') {
        out[k] = v;
      } else {
        out[k] = typeof v === 'string' ? v : String(v);
      }
    });
    return out;
  };

  return new Set(
    reactEls.map((el) => ({
      type: el.type,
      props: normaliseProps(el.props || {}),
    }))
  );
}

export async function prerender(data) {
  const url = data?.url || "/";
  const helmetContext = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url} basename="">
        <App />
      </StaticRouter>
    </HelmetProvider>
  );

  const helmet = helmetContext.helmet;

  // Extract title text content from helmet
  // helmet.title.toComponent() returns a React element, we need just the text
  let titleText = "Wuzzle Games";
  if (helmet?.title) {
    const titleString = helmet.title.toString();
    // Extract text between <title> tags, removing any attributes
    const match = titleString.match(/<title[^>]*>(.*?)<\/title>/);
    if (match && match[1]) {
      titleText = match[1];
    }
  }

  return {
    html,
    links: new Set(PRERENDER_ROUTES),
    head: {
      lang: "en",
      title: titleText,
      elements: toHeadElements(helmet),
    },
  };
}
