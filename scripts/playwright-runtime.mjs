import {createRequire} from 'node:module';

// A regular local installation, NODE_PATH, or the documented review-tools install.
export function loadPlaywright() {
  for (const base of [import.meta.url, new URL('../.review-tools/package.json', import.meta.url)]) {
    try { return createRequire(base)('playwright'); }
    catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  }
  throw new Error('Playwright is missing. Run: npm install --prefix .review-tools --no-save playwright. Install Google Chrome for channel: chrome.');
}
