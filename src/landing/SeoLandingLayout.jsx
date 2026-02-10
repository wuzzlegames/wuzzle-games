import React from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./SeoLandingLayout.css";

export default function SeoLandingLayout({
  title,
  subtitle,
  primaryCta,
  children,
}) {
  return (
    <div className="seoLandRoot">
      <SiteHeader />

      <main className="seoLandMain">
        <header className="seoLandHeader">
          <h1 className="seoLandH1">{title}</h1>
          {subtitle ? <p className="seoLandSubtitle">{subtitle}</p> : null}
          {primaryCta ? (
            <div className="seoLandCtaRow">
              <Link className="seoLandCta" to={primaryCta.to}>
                {primaryCta.label}
              </Link>
            </div>
          ) : null}
        </header>

        <div className="seoLandContent">{children}</div>

        <footer className="seoLandFooter">
          <div className="seoLandFooterLinks">
            <Link to="/">Home</Link>
            <span aria-hidden="true">·</span>
            <Link to="/game">Play</Link>
            <span aria-hidden="true">·</span>
            <Link to="/leaderboard">Leaderboard</Link>
            <span aria-hidden="true">·</span>
            <Link to="/faq">FAQ</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
