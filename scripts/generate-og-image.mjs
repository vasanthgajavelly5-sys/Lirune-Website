import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #0F1217;
    color: #F0EEF8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 72px 84px;
    position: relative;
    overflow: hidden;
  }
  .bg-glow {
    position: absolute;
    top: -120px;
    right: -100px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(141, 183, 204, 0.18) 0%, rgba(238, 236, 248, 0.06) 50%, transparent 70%);
    pointer-events: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .logo-icon {
    width: 68px;
    height: 68px;
    border-radius: 16px;
    background: #171C24;
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
  .logo-text {
    font-size: 38px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #F0EEF8;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 9999px;
    background: rgba(141, 183, 204, 0.12);
    border: 1px solid rgba(141, 183, 204, 0.28);
    color: #8DB7CC;
    font-size: 14px;
    font-weight: 600;
    margin-left: 12px;
  }
  .main-copy {
    max-width: 900px;
  }
  .title {
    font-size: 52px;
    font-weight: 700;
    line-height: 1.18;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
    color: #F0EEF8;
  }
  .title span {
    color: #8DB7CC;
  }
  .desc {
    font-size: 24px;
    line-height: 1.45;
    color: #A2A0B8;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 28px;
    border-top: 1px solid rgba(255, 255, 255, 0.10);
  }
  .platforms {
    display: flex;
    align-items: center;
    gap: 24px;
    font-size: 18px;
    color: #A2A0B8;
  }
  .platform-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8DB7CC;
  }
  .domain {
    font-size: 20px;
    font-weight: 600;
    color: #8DB7CC;
  }
</style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="header">
    <div class="logo-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8DB7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
        <path d="M6 6h10"/>
        <path d="M6 10h10"/>
      </svg>
    </div>
    <div class="logo-text">Lirune Reader</div>
    <div class="badge">Offline & Private</div>
  </div>
  <div class="main-copy">
    <h1 class="title">A calm, private home for your library on <span>Windows & Android</span>.</h1>
    <p class="desc">Free, open-source offline document reader supporting 19 formats. Zero telemetry, local storage, and distraction-free reading.</p>
  </div>
  <div class="footer">
    <div class="platforms">
      <div class="platform-item"><span class="dot"></span> Windows 10 / 11</div>
      <div class="platform-item"><span class="dot"></span> Android 8.0+</div>
      <div class="platform-item"><span class="dot"></span> 19 Formats</div>
      <div class="platform-item"><span class="dot"></span> GPL-3.0 Open Source</div>
    </div>
    <div class="domain">lirune-reader-1aa95.web.app</div>
  </div>
</body>
</html>`;

const tmpHtml = path.resolve(__dirname, '../scratch/og-card.html');
const outPng = path.resolve(__dirname, '../public/images/branding/og-preview.png');
fs.mkdirSync(path.dirname(tmpHtml), { recursive: true });
fs.mkdirSync(path.dirname(outPng), { recursive: true });
fs.writeFileSync(tmpHtml, htmlContent, 'utf-8');

const p = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  '--window-size=1200,630',
  '--screenshot=' + outPng,
  'file:///' + tmpHtml.replace(/\\/g, '/')
]);

p.on('close', code => {
  if (code === 0 && fs.existsSync(outPng)) {
    console.log('[generate-og-image] Generated 1200x630 og-preview.png (' + fs.statSync(outPng).size + ' bytes)');
  } else {
    console.error('[generate-og-image] Failed with exit code:', code);
  }
});
