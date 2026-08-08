import { setupErrorReporter } from './error-reporter.js';

const deployment = globalThis.__GHRAB_DEPLOYMENT_CONFIG__;
const reporterStudioUrl = deployment?.studioBaseUrl || '/AI-Studio-GHRAB/';
const reporterStudioBase = new URL(reporterStudioUrl, document.baseURI);
const reporterGuideUrl = deployment?.access?.guideUrl || new URL('manualy/error-report.html', reporterStudioBase).href;

const reporter = setupErrorReporter({
  appId: 'generator',
  appName: 'Generátor testů',
  appVersion: '7.1.12',
  studioUrl: reporterStudioUrl,
  supportEmail: 'balaz@ghrabuvka.cz',
  guideUrl: reporterGuideUrl,
  themeResolver: () => document.body.classList.contains('light') ? 'light' : 'dark',
  launcherBottom: '92px',
  captureBottom: '114px',
});

export default reporter;
