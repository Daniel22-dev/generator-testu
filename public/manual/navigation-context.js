/**
 * Common manual navigation contract (GHRAB MANUAL-NAV 1.0).
 * Trust only known application and Studio paths; never accept a return URL.
 * Does not grant access and never reads private application state.
 */
const isViewer = (() => {
  try {
    return window.parent !== window && window.frameElement?.id === "manual-frame" &&
      /\/manualy\/viewer\.html$/.test(window.parent.location.pathname);
  } catch { return false; }
})();
const appHome = new URL("../", location.href);
const studioHome = (() => {
  const fallback = new URL("/AI-Studio-GHRAB/", location.href);
  try {
    const proposed = new URL(window.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl || fallback.href, location.href);
    return proposed.origin === location.origin && /^https?:$/.test(proposed.protocol) ? proposed : fallback;
  } catch { return fallback; }
})();
const params = new URLSearchParams(location.search);
const knownReferrer = (() => {
  try { const r = new URL(document.referrer); return r.origin === location.origin ? r : null; }
  catch { return null; }
})();
const openedFromApp = params.get("from") === "app" || (
  params.get("from") !== "studio" && knownReferrer &&
  knownReferrer.pathname.startsWith(appHome.pathname) &&
  !knownReferrer.pathname.startsWith(new URL("manual/", appHome).pathname));
const openedFromStudio = params.get("from") === "studio" || (
  !openedFromApp && knownReferrer && knownReferrer.pathname.startsWith(new URL("manualy/", studioHome).pathname));
function addManualNavigation() {
  if (document.documentElement.dataset.ghrabAccess !== "granted") return false;
  const header = document.querySelector(".manual-topbar .manual-actions,.topbar .top-actions,header.top,header .top,header");
  if (!header) return false;
  const oldLinks = [...document.querySelectorAll("header a")].filter(a =>
    /Zpět do aplikace|Zpět do ACTIVA|Otevřít aplikaci|^AI Studio$/i.test(a.textContent.trim()));
  for (const link of oldLinks) { link.hidden = true; link.style.display = "none"; }
  for (const control of document.querySelectorAll(
    'button[onclick*="window.print"],button[title*="Vytisknout"],#printBtn')) {
    if (isViewer) {
      // Studio's embedded viewer owns the PDF export: do not duplicate the action.
      control.hidden = true;
      control.style.display = "none";
    } else {
      // Standalone GIT currently has no local pdf-download.js; do not silently
      // remove its only printable/exportable output while content review is pending.
      control.hidden = false;
      control.style.display = "";
      control.title = "Tisknout / uložit jako PDF";
      control.setAttribute("aria-label", "Tisknout / uložit jako PDF");
    }
  }
  if (isViewer) {
    document.documentElement.dataset.ghrabManualEmbedded = "viewer";
    const fullHeader = header.closest("header");
    if (fullHeader && !fullHeader.querySelector("button:not([hidden]),input"))
      fullHeader.hidden = true;
    return true;
  }
  if (document.getElementById("ghrab-manual-navigation")) return true;
  const nav = document.createElement("nav");
  nav.id = "ghrab-manual-navigation";
  nav.className = "ghrab-manual-navigation";
  nav.setAttribute("aria-label", "Návratová navigace manuálu");
  function add(text, url, strong = false) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    if (strong) link.classList.add("ghrab-manual-navigation-primary");
    nav.append(link);
    return link;
  }
  if (openedFromApp) add("← Zpět do aplikace", appHome.href, true);
  else if (openedFromStudio) add("← Zpět na manuály", new URL("manualy/", studioHome).href, true);
  add("AI Studio", studioHome.href, !openedFromApp && !openedFromStudio);
  header.append(nav);
  header.classList.add("ghrab-manual-header-navigation");
  return true;
}
if (!addManualNavigation()) {
  const observer = new MutationObserver(() => {
    if (addManualNavigation()) observer.disconnect();
  });
  observer.observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-ghrab-access"], childList: true, subtree: true
  });
}
