/**
 * Build-time script to fetch latest published stable releases from GitHub API.
 * Keeps Windows and Android release channels independent.
 * Never replaces stable downloads with unpublished local candidates or prereleases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = 'vasanthgajavelly5-sys/Lirune';
const OUT_FILE = path.resolve(__dirname, '../src/data/releases.json');

// Authoritative verified fallback matching published GitHub Releases
const VERIFIED_FALLBACK = {
  lastUpdated: new Date().toISOString(),
  windows: {
    version: "5.6.2",
    tag: "v5.6.2",
    name: "Lirune Reader 5.6.2 — Security Hardening, FB2 Sanitization & Windows Release",
    releaseDate: "2026-10-27",
    releaseUrl: "https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v5.6.2",
    installerUrl: "https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.2/Lirune.Reader-5.6.2-Setup.exe",
    installerFilename: "Lirune.Reader-5.6.2-Setup.exe",
    appxUrl: "https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.2/Lirune.Reader-5.6.2-Setup.appx",
    appxFilename: "Lirune.Reader-5.6.2-Setup.appx",
    sha256: "7e11f4f8512925aebe125d688cb2f1350078e928d58b105df746df845d354843",
    appxSha256: "6d277cf50648819b3e8ce64b53be9ab9606fc6ff604153152a1a75acb2fe59ff",
    requirements: "Windows 10 / 11 (64-bit)",
    storeId: "9PDNFZ146HDX",
    storeUrl: "https://apps.microsoft.com/detail/9PDNFZ146HDX?gl=IN&hl=en-US",
    highlights: [
      "Strict DOMPurify HTML sanitization for FB2, HTML, and Markdown formats",
      "Unified rounded glass dropdowns across all settings tabs",
      "Fullscreen reading immersion with auto-hiding navigation bars",
      "Path traversal (Zip-Slip) guards and 512 MB file bounds check",
      "Offline multi-format reader engine without telemetry"
    ]
  },
  android: {
    version: "4.9.3",
    tag: "v4.9.3",
    name: "Lirune Reader v4.9.3 — Scroll Engine v2 Exclusivity & Hardened Zero-Permission Release",
    releaseDate: "2026-10-28",
    releaseUrl: "https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v4.9.3",
    apkUrl: "https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v4.9.3/Lirune-Reader-v4.9.3-release.apk",
    apkFilename: "Lirune-Reader-v4.9.3-release.apk",
    sha256: "f347c0658964e06467cba09d95d5dc7f66631f48b5615f7ac358e041d2a686c0",
    requirements: "Android 8.0 (Oreo) or higher",
    highlights: [
      "Scroll Engine v2 is now exclusive, delivering unified 60fps virtualized continuous scrolling",
      "Zero internet permissions: android.permission.INTERNET permanently stripped from production release builds",
      "Android Storage Access Framework (SAF) folder browsing and local SQLite storage",
      "Offline Text-to-Speech (TTS) audio narration",
      "Complete typography customization (line height, margins, letter spacing, font families)"
    ]
  }
};

async function fetchReleases() {
  try {
    console.log(`[fetch-releases] Querying GitHub Releases API for ${REPO}...`);
    const headers = {
      'User-Agent': 'Lirune-Website-Builder/1.0'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, { headers });
    if (!res.ok) {
      console.warn(`[fetch-releases] GitHub API returned status ${res.status}. Using verified fallback manifest.`);
      fs.writeFileSync(OUT_FILE, JSON.stringify(VERIFIED_FALLBACK, null, 2), 'utf-8');
      return;
    }

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      console.warn(`[fetch-releases] No releases found in GitHub response. Using verified fallback manifest.`);
      fs.writeFileSync(OUT_FILE, JSON.stringify(VERIFIED_FALLBACK, null, 2), 'utf-8');
      return;
    }

    // Identify latest stable Windows release (must have .exe or .appx, ignore prerelease & draft)
    const winRelease = releases.find(r => !r.prerelease && !r.draft && r.assets && r.assets.some(a => a.name.endsWith('.exe')));
    // Identify latest stable Android release (must have .apk, ignore prerelease & draft)
    const androidRelease = releases.find(r => !r.prerelease && !r.draft && r.assets && r.assets.some(a => a.name.endsWith('.apk')));

    const manifest = {
      lastUpdated: new Date().toISOString(),
      windows: { ...VERIFIED_FALLBACK.windows },
      android: { ...VERIFIED_FALLBACK.android }
    };

    if (winRelease) {
      const exeAsset = winRelease.assets.find(a => a.name.endsWith('.exe'));
      const appxAsset = winRelease.assets.find(a => a.name.endsWith('.appx'));
      const versionClean = winRelease.tag_name.replace(/^v/, '');
      manifest.windows.version = versionClean;
      manifest.windows.tag = winRelease.tag_name;
      manifest.windows.name = winRelease.name || `Lirune Reader ${versionClean}`;
      manifest.windows.releaseDate = winRelease.published_at.split('T')[0];
      manifest.windows.releaseUrl = winRelease.html_url;
      if (exeAsset) {
        manifest.windows.installerUrl = exeAsset.browser_download_url;
        manifest.windows.installerFilename = exeAsset.name;
      }
      if (appxAsset) {
        manifest.windows.appxUrl = appxAsset.browser_download_url;
        manifest.windows.appxFilename = appxAsset.name;
      }
    }

    if (androidRelease) {
      const apkAsset = androidRelease.assets.find(a => a.name.endsWith('.apk'));
      const versionClean = androidRelease.tag_name.replace(/^v/, '');
      manifest.android.version = versionClean;
      manifest.android.tag = androidRelease.tag_name;
      manifest.android.name = androidRelease.name || `Lirune Reader v${versionClean}`;
      manifest.android.releaseDate = androidRelease.published_at.split('T')[0];
      manifest.android.releaseUrl = androidRelease.html_url;
      if (apkAsset) {
        manifest.android.apkUrl = apkAsset.browser_download_url;
        manifest.android.apkFilename = apkAsset.name;
      }
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`[fetch-releases] Wrote release manifest to ${OUT_FILE}:`);
    console.log(`  Windows: ${manifest.windows.tag} (${manifest.windows.installerFilename})`);
    console.log(`  Android: ${manifest.android.tag} (${manifest.android.apkFilename})`);
  } catch (err) {
    console.error(`[fetch-releases] Error querying GitHub:`, err.message);
    console.log(`[fetch-releases] Writing verified fallback manifest.`);
    fs.writeFileSync(OUT_FILE, JSON.stringify(VERIFIED_FALLBACK, null, 2), 'utf-8');
  }
}

fetchReleases();
