const DEFAULT_TTL_MS = 30 * 60 * 1000;
// Exact published mount points; do not route material to a lookalike app path.
const TRUSTED_STUDIO_PATHS = new Set(['/AI-Studio-GHRAB/', '/ai-studio/']);
// Keep the source-app helper self-contained for standalone consumers.
// This is a conservative first gate; Studio revalidates the complete package.
const PERSONAL_FIELD = /(?:student|pupil|learner|roster|classlist|attendance|dateofbirth|birthdate|personaldata|rodnecislo|firstname|lastname|fullname|studentid|emailaddress|resultsbyname)/i;
const UNSAFE_MARKUP = /<\s*(?:script|iframe|object|embed)\b|\bon\w+\s*=|javascript\s*:/i;
function hasPrivateField(json) {
  const keys = json.matchAll(/"([^"\\]{1,128})"\s*:/g);
  for (const match of keys) {
    const key = match[1].replace(/[^a-zA-Z0-9]/g, '');
    if (key !== 'containsPersonalData' && PERSONAL_FIELD.test(key)) return true;
  }
  return false;
}


function normaliseStudioRoot(value) {
  const url = new URL(String(value || ""), globalThis.location?.href || "http://localhost/");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Shared source-app contract for the button "Uložit do AI Studia".
 *
 * This is intentionally transport-only. The source application remains the
 * editor; AI Studio receives a GHRAB Material v1 package and stores it in the
 * user's workspace. In the future school-server profile the transport can be
 * replaced by a one-time server handoff without changing the user-facing flow.
 */
export function saveMaterialToStudio({
  material,
  studioUrl,
  sourceAppId,
  sourceAppVersion,
  navigate = true,
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  const bridge = globalThis.GHRAB_PLATFORM?.bridge;
  if (typeof bridge?.create !== "function") {
    throw new Error("GHRAB Platform Bridge v2 is not available.");
  }
  if (!material || material.schema !== "ghrab-material-v1") {
    throw new Error("A valid GHRAB Material v1 package is required.");
  }
  // This helper can be copied to a standalone consumer. It performs a first
  // privacy/size gate; AI Studio applies the canonical full validation on receipt.
  let serialized;
  try { serialized = JSON.stringify(material); }
  catch { return { ok: false, packet: null, targetUrl: null, reason: "unsafe-material" }; }
  if (material.provenance?.containsPersonalData !== false ||
      new TextEncoder().encode(serialized).byteLength > 480000 ||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(serialized) ||
      hasPrivateField(serialized) || UNSAFE_MARKUP.test(serialized)) {
    return { ok: false, packet: null, targetUrl: null, reason: "unsafe-material" };
  }
  const configuredStudioUrl =
    studioUrl || globalThis.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl;
  if (!configuredStudioUrl) {
    throw new Error("AI Studio URL is not configured.");
  }
  const root = normaliseStudioRoot(configuredStudioUrl);
  if (root.origin !== new URL(globalThis.location?.href || root.href).origin ||
      !(root.protocol === "https:" || (root.protocol === "http:" && root.hostname === "localhost"))) {
    return { ok: false, packet: null, targetUrl: null, reason: "different-origin" };
  }
  if (!TRUSTED_STUDIO_PATHS.has(root.pathname)) {
    return { ok: false, packet: null, targetUrl: null, reason: "untrusted-studio-path" };
  }
  const targetUrl = new URL("library/?studioHandoff=1", root).href;
  let packet = null;
  try {
    packet = bridge.create({
      target: "ai-studio",
      targetVersionRange: ">=0.21.6 <1.0.0",
      sourceAppId: String(sourceAppId || document.documentElement.dataset.ghrabAppId || "unknown-app"),
      sourceAppVersion: String(sourceAppVersion || document.documentElement.dataset.ghrabAppVersion || "0.0.0"),
      studioUrl: root.href,
      ttlMs,
      material,
      writeLegacy: true,
    });
  } catch {
    return { ok: false, packet: null, targetUrl, reason: "handoff-write-failed" };
  }
  if (!packet) {
    const pending = typeof bridge.peek === "function"
      ? bridge.peek({ allowAnyTarget: true, maxBytes: 500000 })
      : null;
    return { ok: false, packet: null, targetUrl, reason: pending ? "handoff-pending" : "handoff-write-failed" };
  }
  if (navigate) globalThis.location.assign(targetUrl);
  return { ok: true, packet, targetUrl, reason: null };
}
