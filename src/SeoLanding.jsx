import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "./SeoLanding.css";

// Hard-code the canonical origin for deterministic prerender output.
// (Using window.location breaks during SSR/prerender.)
const SITE_ORIGIN = "https://wuzzlegames.com";
const SITE_BASE = "";

function absUrl(pathname) {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_ORIGIN}${SITE_BASE}${clean}`;
}

function FAQJsonLd({ faqs, canonicalUrl }) {
  const json = useMemo(() => {
    if (!faqs || faqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  }, [faqs]);

  if (!json) return null;

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(json)}</script>
      {/* Extra hint for Google that this is a distinct page */}
      <meta property="og:url" content={canonicalUrl} />
    </Helmet>
  );
}

export default function SeoLanding({
  path,
  title,
  description,
  h1,
  intro,
  primaryCta,
  howToSteps,
  features,
  tips,
  faqs,
}) {
  const canonicalUrl = absUrl(path);

  return (
    <main className="seoRoot">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta
          property="og:image"
          content={`${SITE_ORIGIN}${SITE_BASE}/og-wuzzle-games.png`}
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta
          name="twitter:image"
          content={`${SITE_ORIGIN}${SITE_BASE}/og-wuzzle-games.png`}
        />

        {/* WebSite schema (helps Google understand brand/site) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Wuzzle Games",
            url: `${SITE_ORIGIN}${SITE_BASE}/`,
          })}
        </script>
      </Helmet>

      <FAQJsonLd faqs={faqs} canonicalUrl={canonicalUrl} />

      <section className="seoCard">
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">›</span>
          <span>{h1}</span>
        </nav>

        <h1 className="seoH1">{h1}</h1>
        <p className="seoIntro">{intro}</p>

        <div className="seoCtas">
          {primaryCta?.to ? (
            <Link className="seoBtn" to={primaryCta.to}>
              {primaryCta.label}
            </Link>
          ) : null}
          <Link className="seoBtn seoBtnOutline" to="/game">
            Open the game
          </Link>
          <Link className="seoBtn seoBtnOutline" to="/leaderboard">
            View leaderboard
          </Link>
        </div>

        {howToSteps?.length ? (
          <section className="seoSection">
            <h2>How it works</h2>
            <ol>
              {howToSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {features?.length ? (
          <section className="seoSection">
            <h2>What makes Wuzzle Games different</h2>
            <ul>
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {tips?.length ? (
          <section className="seoSection">
            <h2>Quick tips</h2>
            <ul>
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {faqs?.length ? (
          <section className="seoSection">
            <h2>FAQ</h2>
            <div className="seoFaq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="seoFooter">
          <Link to="/faq">Site FAQ</Link>
          <span aria-hidden="true">·</span>
          <Link to="/leaderboard">Leaderboard</Link>
          <span aria-hidden="true">·</span>
          <Link to="/game">Play now</Link>
        </footer>
      </section>
    </main>
  );
}
