// /scripts/nav.js
(function () {
  const body = document.body;
  const bar = document.querySelector(".navbar");
  const burger = document.getElementById("nav-toggle");
  const overlay = document.getElementById("nav-overlay");
  const panel = document.getElementById("menu-panel");
  const closeBtn = document.getElementById("menu-close");
  if (!bar || !burger || !overlay || !panel || !closeBtn) return;

  const focusableSel = 'a, button, [href], [tabindex]:not([tabindex="-1"])';
  let trapEls = [];

  const lockScroll = (lock) => (body.style.overflow = lock ? "hidden" : "");
  const trapFocus = (enable) => (trapEls = enable ? panel.querySelectorAll(focusableSel) : []);

  function openMenu() {
    bar.classList.add("is-open");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    lockScroll(true); trapFocus(true);
    setTimeout(() => trapEls[0]?.focus(), 10);
  }
  function closeMenu() {
    bar.classList.remove("is-open");
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    lockScroll(false); trapFocus(false);
  }
  const toggleMenu = () => (bar.classList.contains("is-open") ? closeMenu() : openMenu());

  burger.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  overlay.addEventListener("click", closeMenu);
  closeBtn.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab" && trapEls.length) {
      const first = trapEls[0], last = trapEls[trapEls.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  // Close on link click (and then navigate)
  panel.querySelectorAll('a[href]').forEach(a => {
    a.addEventListener('click', () => {
      closeMenu();
      // kleine Verzögerung für die Close-Animation (optional)
      // setTimeout(() => { location.href = a.href; }, 80);
    });
  });

  // Sauberes Active-Highlight (nur gleiche Origin & Pfade)
  const norm = (p) => p.replace(location.origin, "").replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  const here = norm(location.href);
  document.querySelectorAll('a[href]').forEach(a => {
    const raw = a.href;
    if (!raw.startsWith(location.origin)) return;          // extern ignorieren
    const path = norm(raw);
    if (path === here) a.classList.add("is-active");
  });
})();