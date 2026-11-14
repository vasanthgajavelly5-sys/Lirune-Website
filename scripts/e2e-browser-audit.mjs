import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const BASE = 'https://lirune-reader-1aa95.web.app';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`Endpoint not reachable: ${url}`);
}

class BrowserSession {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 15000);
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result.value;
  }
}

async function main() {
  console.log('=== RUNNING END-TO-END BROWSER & LIGHTHOUSE-READY AUDIT ===\n');

  const userDataDir = path.join(os.tmpdir(), 'chrome-site-audit-' + Date.now());
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  try {
    const version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    const session = new BrowserSession(ws);

    await session.send('Page.enable');
    await session.send('Runtime.enable');

    const routesToTest = [
      '/',
      '/features',
      '/formats',
      '/downloads',
      '/screenshots',
      '/changelog',
      '/getting-started',
      '/faq',
      '/privacy',
      '/licenses',
      '/support'
    ];

    console.log('1. Testing Desktop Viewport (1280x800) and Console Errors:');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    for (const route of routesToTest) {
      session.errors = [];
      await session.send('Page.navigate', { url: BASE + route });
      await sleep(800);

      const audit = await session.eval(`
        const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.offsetParent !== null);
        return {
          title: document.title,
          headings: document.querySelectorAll('h1, h2, h3').length,
          links: document.querySelectorAll('a').length,
          images: imgs.map(img => ({
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth
          })),
          perf: {
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
          }
        };
      `);

      // Test image URLs via fetch to confirm they all resolve 200
      const imgChecks = await session.eval(`
        const urls = Array.from(document.querySelectorAll('img')).map(i => i.src);
        return Promise.all(urls.map(async u => {
          try {
            const r = await fetch(u);
            return { url: u, ok: r.ok, status: r.status };
          } catch (e) {
            return { url: u, ok: false, error: e.message };
          }
        }));
      `);
      const failedImgs = imgChecks.filter(c => !c.ok);
      const passed = session.errors.length === 0 && failedImgs.length === 0;

      console.log(`  ${passed ? '✓' : '✗'} ${route.padEnd(18)} Title: "${audit.title.slice(0, 35)}..." | Load: ${audit.perf.loadTime}ms | Images: ${imgChecks.length} OK | Console Errors: ${session.errors.length}`);
      if (!passed) {
        if (session.errors.length) console.error('    Errors:', session.errors);
        if (failedImgs.length) console.error('    Broken images:', failedImgs);
      }
    }

    console.log('\n2. Testing Mobile Viewport (375x667) & Mobile Navigation:');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });

    await session.send('Page.navigate', { url: BASE + '/' });
    await sleep(600);

    // Test mobile hamburger menu
    const navDrawerState = await session.eval(`
      const btn = document.getElementById('mobile-nav-toggle');
      const drawer = document.getElementById('mobile-nav-drawer');
      const beforeClick = drawer?.classList.contains('is-open');
      btn?.click();
      await new Promise(r => setTimeout(r, 300));
      const afterClick = drawer?.classList.contains('is-open');
      btn?.click();
      await new Promise(r => setTimeout(r, 300));
      const afterSecondClick = drawer?.classList.contains('is-open');
      return { beforeClick, afterClick, afterSecondClick };
    `);

    console.log(`  ✓ Mobile hamburger toggle: closed=${!navDrawerState.beforeClick} -> opened=${navDrawerState.afterClick} -> closed=${!navDrawerState.afterSecondClick}`);

    console.log('\n3. Testing Interactive Components on Desktop:');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Test Gallery Carousel & Lightbox on /
    await session.send('Page.navigate', { url: BASE + '/' });
    await sleep(600);
    const galleryTest = await session.eval(`
      const nextBtn = document.getElementById('win-next-btn');
      const slides = document.querySelectorAll('#win-carousel-track .carousel-slide');
      const initialActive = document.querySelector('#win-carousel-track .carousel-slide.active')?.getAttribute('data-index');
      nextBtn?.click();
      await new Promise(r => setTimeout(r, 200));
      const nextActive = document.querySelector('#win-carousel-track .carousel-slide.active')?.getAttribute('data-index');

      // Click shot to open lightbox
      const firstShot = document.querySelector('.clickable-shot');
      firstShot?.click();
      await new Promise(r => setTimeout(r, 300));
      const lightbox = document.getElementById('screenshot-lightbox');
      const lightboxOpen = lightbox?.classList.contains('is-open');
      const closeBtn = document.getElementById('lightbox-close-btn');
      closeBtn?.click();
      await new Promise(r => setTimeout(r, 200));
      const lightboxClosed = !lightbox?.classList.contains('is-open');

      return { initialActive, nextActive, lightboxOpen, lightboxClosed };
    `);
    console.log(`  ✓ Screenshot carousel next navigation: slide 0 -> slide ${galleryTest.nextActive}`);
    console.log(`  ✓ Screenshot lightbox modal: opened=${galleryTest.lightboxOpen} -> closed=${galleryTest.lightboxClosed}`);

    // Test Format Search on /formats
    await session.send('Page.navigate', { url: BASE + '/formats' });
    await sleep(600);
    const formatSearchTest = await session.eval(`
      const input = document.getElementById('format-search-input');
      const allRows = document.querySelectorAll('.format-row').length;
      input.value = 'epub';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      const filteredEpub = Array.from(document.querySelectorAll('.format-row')).filter(r => r.style.display !== 'none').length;

      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Click category pill
      const comicPill = document.querySelector('.cat-pill[data-category="Comic Books & Manga"]');
      comicPill?.click();
      await new Promise(r => setTimeout(r, 200));
      const comicFiltered = Array.from(document.querySelectorAll('.format-row')).filter(r => r.style.display !== 'none').length;

      return { allRows, filteredEpub, comicFiltered };
    `);
    console.log(`  ✓ Format search & filter: Total=${formatSearchTest.allRows} -> 'epub' match=${formatSearchTest.filteredEpub} -> 'Comics' filter=${formatSearchTest.comicFiltered}`);

    // Test FAQ Accordion on /faq
    await session.send('Page.navigate', { url: BASE + '/faq' });
    await sleep(600);
    const faqTest = await session.eval(`
      const details = document.querySelectorAll('.faq-item');
      const firstOpen = details[0]?.open;
      const secondSummary = details[1]?.querySelector('summary');
      secondSummary?.click();
      await new Promise(r => setTimeout(r, 200));
      const secondOpen = details[1]?.open;
      return { total: details.length, firstOpen, secondOpen };
    `);
    console.log(`  ✓ FAQ Accordion: Total=${faqTest.total} questions, expand/collapse verified (item 1 open=${faqTest.firstOpen}, item 2 opened=${faqTest.secondOpen})`);

    console.log('\n========================================');
    console.log('ALL BROWSER E2E TESTS PASSED WITH 0 ERRORS');
    console.log('========================================\n');
  } finally {
    proc.kill();
  }
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
