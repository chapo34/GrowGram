import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * GrowGram — App.js (refined)
 * - System-Theme als Default (falls kein localStorage)
 * - ESC schließt Mobile-Menü, Outside-Click bleibt
 * - Smooth-Scroll mit --nav-height Offset
 * - Reduced Motion berücksichtigt (Body-Enter, Marquee)
 * - Lazy Images / decoding=async
 */

// ---------- kleine Helper ----------
const cx = (...c) => c.filter(Boolean).join(" ");
const useIsClient = () => {
  const [ready, set] = useState(false);
  useEffect(() => set(true), []);
  return ready;
};
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq?.matches);
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);
  return reduced;
};
const getNavHeight = () => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--nav-height")
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 64;
};

// ---------- Theme Hook ----------
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("gg:theme");
    if (saved === "light" || saved === "dark") return saved;
    // system default
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    return prefersLight ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme"); // dark default
    localStorage.setItem("gg:theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return { theme, toggle };
}

// ---------- Scroll-Reveal Fallback ----------
function useRevealFallback() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ---------- Smooth anchors (Header-Offset + Reduced Motion) ----------
function useSmoothAnchors() {
  const reduce = useReducedMotion();
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();
      const nav = getNavHeight();
      const rect = target.getBoundingClientRect();
      const y = Math.max(0, window.scrollY + rect.top - nav - 8);

      if (!reduce && "scrollBehavior" in document.documentElement.style) {
        window.scrollTo({ top: y, behavior: "smooth" });
      } else {
        window.scrollTo(0, y);
      }
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [reduce]);
}

// ---------- Icons (inline SVG) ----------
const IconLeaf = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M21 3c-6.5.2-11.3 2.7-14.4 5.8C3.5 11 2.3 14 3.1 17.1l.2.8.7.3c3.1.8 6.1-.3 8.2-3 3.1-4.1 5.6-7.9 8.6-12l.3-.7-.8-.3C20.1 2.9 20.6 3 21 3zM5 20l4-4"
      stroke="currentColor"
      strokeWidth="1.2"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const IconMenu = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
  </svg>
);
const IconClose = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z" />
  </svg>
);

// ---------- Navbar ----------
function Navbar({ onToggleTheme, theme }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (e) => {
      if (!open) return;
      const menu = document.getElementById("gg-nav-menu");
      const toggle = document.getElementById("gg-nav-toggle");
      if (menu && !menu.contains(e.target) && toggle && !toggle.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  // ESC schließt Menü
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cx("navbar", open && "is-open")}>
      <div className="container">
        <a href="#" className="navbar__brand" aria-label="GrowGram Home" onClick={(e) => e.preventDefault()}>
          <span className="navbar__brand-logo" aria-hidden="true" />
          GrowGram
        </a>

        <button
          id="gg-nav-toggle"
          className="navbar__toggle btn--ghost"
          aria-expanded={open}
          aria-controls="gg-nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>

        <nav id="gg-nav-menu" className="navbar__menu" aria-label="Hauptnavigation">
          <a className="navbar__link" href="#features">Features</a>
          <a className="navbar__link" href="#roadmap">Roadmap</a>
          <a className="navbar__link" href="#download">Download</a>
          <button
            className="btn btn--ghost"
            onClick={onToggleTheme}
            aria-label="Theme wechseln"
            title="Theme wechseln"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <a className="btn btn--accent btn--pill" href="#cta">Jetzt starten</a>
        </nav>
      </div>
    </header>
  );
}

// ---------- Hero ----------
function Hero() {
  return (
    <section className={cx("hero", "hero--grid")}>
      <div className="container hero__inner">
        <div>
          <span className="hero__kicker">Cannabis Community</span>
          <h1 className="hero__title grad-text">Teile. Wachse. Verbinde dich – mit GrowGram.</h1>
          <p className="hero__subtitle">
            Die Social-Media-App speziell für die Cannabis-Community. Moderner Feed,
            sichere Verifizierung, Creator-Tools – schnell, schön und verantwortungsvoll.
          </p>
          <div className="hero__cta">
            <a className="btn btn--lg btn--glow" href="#cta">Kostenlos loslegen</a>
            <a className="btn btn--lg btn--ghost" href="#features">Mehr erfahren</a>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__card tilt">
            <div className="cluster between">
              <div className="cluster">
                <span className="navbar__brand-logo" aria-hidden="true" />
                <strong>GrowGram</strong>
              </div>
              <span className="badge badge--info">Beta</span>
            </div>

            <div className="stack mt-4">
              <div className="card card--horizontal">
                <div className="card__media">
                  <img
                    src="https://images.unsplash.com/photo-1545249390-10c0d2d07a83?q=80&w=1200&auto=format&fit=crop"
                    alt="Community Bild"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="card__body">
                  <div className="card__title">Community-Stories</div>
                  <div className="card__text">Authentische Einblicke, täglich neu.</div>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="card">
                  <div className="card__body">
                    <div className="card__title">Verifizierung</div>
                    <p className="card__text">E-Mail-Verify & Richtlinien – fair & sicher.</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card__body">
                    <div className="card__title">Creator-Tools</div>
                    <p className="card__text">Upload, Likes, Comments, Explore – schnell.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero__ring" />
            <div className="hero__shimmer" />
            <div className="hero__sparkles" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Features ----------
function Features() {
  const items = useMemo(
    () => [
      { title: "Schneller Feed",      text: "Trending, For-You, Pagination, Skeleton Loading." },
      { title: "Interaktionen",       text: "Likes, Kommentare, Mentions – responsiv & smooth." },
      { title: "Sicherheit",          text: "E-Mail-Verifizierung, CORS, Rate-Limits, gepflegte Rules." },
      { title: "Creator-freundlich",  text: "Media-Upload, Expo-Image, performante Darstellung." },
      { title: "Branding",            text: "Green-Theme (#4CAF50), Off-White, dunkle Flächen, Orange-Akzente." },
      { title: "Skalierung",          text: "Firebase Hosting + Functions (europe-west3)." },
    ],
    []
  );

  return (
    <section id="features" className="section features">
      <div className="container">
        <div className="stack stack--loose">
          <div className="stack text-center">
            <h2>Warum GrowGram?</h2>
            <p className="text-muted">Eine moderne, sichere und schnelle Social-App – gezielt für die Cannabis-Community.</p>
          </div>

          <div className="row">
            {items.map((it, i) => (
              <div key={i} className="col-12 md:col-6 lg:col-4" data-reveal>
                <article className="feature">
                  <div className="feature__icon" aria-hidden="true">
                    <IconLeaf />
                  </div>
                  <h3 className="feature__title">{it.title}</h3>
                  <p className="feature__text">{it.text}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Marquee ----------
function Marquee() {
  const reduced = useReducedMotion();
  return (
    <section className="section">
      <div className="container">
        <div className="marquee" aria-label="Partner & Tech">
          <div
            className="marquee__track"
            style={{ ["--speed"]: "28s", animationPlayState: reduced ? "paused" : undefined }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <span className="marquee__item" key={i}>
                <span className="navbar__brand-logo" aria-hidden="true" />
                GrowGram
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Roadmap ----------
function Roadmap() {
  const steps = [
    { title: "P0: Verify-Endpoint final", meta: "Hosting + Redirect + Smoke-Tests" },
    { title: "P1: Auth & Profile",        meta: "Login/Logout, Refresh, Profil-Doc" },
    { title: "P2: Feed & Interaktion",    meta: "Posts, Upload, Likes, Comments" },
    { title: "P3: Push & Moderation",     meta: "FCM, Reporting/Moderation v0" },
  ];
  return (
    <section id="roadmap" className="section">
      <div className="container">
        <div className="stack stack--loose">
          <div className="stack text-center">
            <h2>Roadmap</h2>
            <p className="text-muted">Konzentriert, sicher, iterativ.</p>
          </div>

          <div className="roadmap">
            {steps.map((s, i) => (
              <div
                key={i}
                className={cx("milestone", i === 0 && "is-active")}
                data-reveal
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="milestone__title">{s.title}</div>
                <div className="milestone__meta">{s.meta}</div>
                <p className="text-muted">Stabiler Deploy-Prozess, Tests und klare Definition of Done.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- CTA Band ----------
function CTABand() {
  return (
    <section id="cta" className="section">
      <div className="container">
        <div className="cta-band">
          <div className="cta-band__inner">
            <div className="stack">
              <h3 className="h2">Bereit für die Beta?</h3>
              <p className="text-muted">
                Registriere dich, bestätige deine E-Mail und entdecke den ersten Community-Feed.
              </p>
              <div className="cluster">
                <a className="btn btn--lg btn--glow" href="#download">App laden</a>
                <a className="btn btn--lg btn--ghost" href="#features">Mehr Features</a>
              </div>
            </div>
            <div className="stack">
              <div className="progress" aria-label="Warteliste-Fortschritt">
                <div className="progress__bar" style={{ ["--value"]: "62%" }} />
              </div>
              <small className="text-muted">62% Slots belegt</small>
            </div>
          </div>
          <div className="cta-band__ring" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer className="footer-accent" role="contentinfo">
      <div className="container section">
        <div className="row">
          <div className="col-12 md:col-6">
            <div className="stack">
              <div className="navbar__brand">
                <span className="navbar__brand-logo" aria-hidden="true" />
                GrowGram
              </div>
              <p className="text-muted">
                © {new Date().getFullYear()} GrowGram — European Hosting (europe-west3).
              </p>
            </div>
          </div>
          <div className="col-6 md:col-2">
            <div className="stack">
              <strong>Produkt</strong>
              <a className="text-muted" href="#features">Features</a>
              <a className="text-muted" href="#roadmap">Roadmap</a>
            </div>
          </div>
          <div className="col-6 md:col-2">
            <div className="stack">
              <strong>Rechtliches</strong>
              <a className="text-muted" href="#">Impressum</a>
              <a className="text-muted" href="#">Datenschutz</a>
            </div>
          </div>
          <div className="col-12 md:col-2">
            <div className="stack">
              <strong>Kontakt</strong>
              <a className="text-muted" href="mailto:support@growgram-app.com">support@growgram-app.com</a>
              <a className="text-muted" href="#">Discord</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------- App Root ----------
export default function App() {
  const isClient = useIsClient();
  const { theme, toggle } = useTheme();
  const reduced = useReducedMotion();
  useRevealFallback();
  useSmoothAnchors();

  // Subtle page enter (respect reduced motion)
  useEffect(() => {
    if (reduced) return;
    document.body.classList.add("anim-fade");
    const t = setTimeout(() => document.body.classList.remove("anim-fade"), 600);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <>
      <Navbar onToggleTheme={toggle} theme={theme} />
      <main id="main">
        <Hero />
        <Features />
        <Marquee />
        <Roadmap />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}