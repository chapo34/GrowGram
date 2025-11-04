// nav.js — Accessible Hamburger + Dropdowns (vanilla)
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

  function lockScroll(lock) { body.style.overflow = lock ? "hidden" : ""; }
  function trapFocus(enable) { trapEls = enable ? panel.querySelectorAll(focusableSel) : []; }

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
  function toggleMenu() { bar.classList.contains("is-open") ? closeMenu() : openMenu(); }

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

  // Desktop „Rechtliches“ Dropdown
  const legal = document.getElementById("nav-legal");
  const legalBtn = document.getElementById("nav-legal-btn");
  document.addEventListener("click", (e) => {
    if (!legal || !legalBtn) return;
    if (legal.contains(e.target)) return;
    if (legalBtn.contains(e.target)) {
      legal.classList.toggle("open");
      legalBtn.setAttribute("aria-expanded", String(legal.classList.contains("open")));
    } else {
      legal.classList.remove("open");
      legalBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Active link highlighting (simple)
  const here = location.pathname.replace(/\/+$/, "");
  document.querySelectorAll('a[href]').forEach(a => {
    const path = a.getAttribute('href').replace(/\/+$/, "");
    if (path && here === path) a.classList.add("is-active");
  });
})();