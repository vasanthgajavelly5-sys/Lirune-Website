import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '../dist');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../visual-qa-screenshots');

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
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Inject data-theme="light" into HTML for the light theme capture server
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
  if (ext === '.html') {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace('<html lang="en">', '<html lang="en" data-theme="light">');
    res.end(content);
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
});

async function captureScreenshot(url, outputPath, width, height) {
  return new Promise((resolve, reject) => {
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

    execFile(CHROME_PATH, flags, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

const LIGHT_TASKS = [
  { name: '20-home-desktop-light', path: '/', width: 1440, height: 900 },
  { name: '21-features-desktop-light', path: '/features', width: 1440, height: 1600 },
  { name: '22-formats-desktop-light', path: '/formats', width: 1440, height: 1000 },
  { name: '23-downloads-desktop-light', path: '/downloads', width: 1440, height: 1100 }
];

server.listen(4322, async () => {
  console.log(`=== CAPTURING LIGHT THEME VALIDATION SCREENSHOTS ===`);
  for (const task of LIGHT_TASKS) {
    const outPath = path.join(SCREENSHOTS_DIR, `${task.name}.png`);
    const targetUrl = `http://localhost:4322${task.path}`;
    try {
      await captureScreenshot(targetUrl, outPath, task.width, task.height);
      const stat = fs.statSync(outPath);
      console.log(`  ✓ Captured: ${task.name}.png (${task.width}x${task.height}, ${Math.round(stat.size / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed: ${task.name}: ${err.message}`);
    }
  }

  server.close(() => {
    console.log(`Light theme captures completed.\n`);
  });
});
