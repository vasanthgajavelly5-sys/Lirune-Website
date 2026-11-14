import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '../dist');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../visual-qa-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  if (!path.extname(reqPath)) reqPath += '/index.html';

  let filePath = path.join(DIST, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, '404.html');
    res.statusCode = 404;
  } else {
    res.statusCode = 200;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

async function captureScreenshot(url, outputPath, width, height, theme = 'dark') {
  return new Promise((resolve, reject) => {
    // Add theme param or cookie/localStorage via chrome flag
    const flags = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-software-rasterizer',
      `--window-size=${width},${height}`,
      `--screenshot=${outputPath}`,
      '--hide-scrollbars',
      url
    ];

    execFile(CHROME_PATH, flags, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      resolve(outputPath);
    });
  });
}

const CAPTURE_TASKS = [
  // 1. Homepage Desktop (Dark & Light)
  { name: '01-home-desktop-dark', path: '/', width: 1440, height: 900 },
  { name: '02-home-desktop-1920', path: '/', width: 1920, height: 1080 },
  { name: '03-home-desktop-1280', path: '/', width: 1280, height: 800 },
  { name: '04-home-desktop-1024', path: '/', width: 1024, height: 768 },
  { name: '05-home-tablet-768',   path: '/', width: 768, height: 1024 },
  { name: '06-home-mobile-430',   path: '/', width: 430, height: 932 },
  { name: '07-home-mobile-390',   path: '/', width: 390, height: 844 },
  { name: '08-home-mobile-360',   path: '/', width: 360, height: 800 },

  // 2. Features Page (Desktop & Mobile, multiple sections)
  { name: '09-features-desktop-1440', path: '/features', width: 1440, height: 1600 },
  { name: '10-features-desktop-1280', path: '/features', width: 1280, height: 1600 },
  { name: '11-features-tablet-768',   path: '/features', width: 768, height: 1200 },
  { name: '12-features-mobile-390',   path: '/features', width: 390, height: 1400 },

  // 3. Formats Page (Desktop & Mobile)
  { name: '13-formats-desktop-1440', path: '/formats', width: 1440, height: 1000 },
  { name: '14-formats-mobile-390',   path: '/formats', width: 390, height: 900 },

  // 4. Downloads Page (Desktop & Mobile)
  { name: '15-downloads-desktop-1440', path: '/downloads', width: 1440, height: 1100 },
  { name: '16-downloads-mobile-390',   path: '/downloads', width: 390, height: 1200 },

  // 5. Screenshots Page
  { name: '17-screenshots-desktop-1440', path: '/screenshots', width: 1440, height: 1000 },

  // 6. Changelog & FAQ
  { name: '18-changelog-desktop-1440', path: '/changelog', width: 1440, height: 1000 },
  { name: '19-faq-desktop-1440', path: '/faq', width: 1440, height: 1000 }
];

server.listen(4321, async () => {
  console.log(`=== RUNNING VISUAL QA AUDIT VIA HEADLESS CHROME ===`);
  console.log(`Browser: ${CHROME_PATH}`);
  console.log(`Local test server running at http://localhost:4321\n`);

  let successCount = 0;
  for (const task of CAPTURE_TASKS) {
    const outPath = path.join(SCREENSHOTS_DIR, `${task.name}.png`);
    const targetUrl = `http://localhost:4321${task.path}`;
    try {
      await captureScreenshot(targetUrl, outPath, task.width, task.height);
      const stat = fs.statSync(outPath);
      console.log(`  ✓ Captured: ${task.name}.png (${task.width}x${task.height}, ${Math.round(stat.size / 1024)} KB)`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Failed to capture ${task.name}: ${err.message}`);
    }
  }

  server.close(() => {
    console.log(`\n========================================`);
    console.log(`VISUAL QA COMPLETED: ${successCount} / ${CAPTURE_TASKS.length} screenshots saved to:`);
    console.log(SCREENSHOTS_DIR);
    console.log(`========================================\n`);
  });
});
