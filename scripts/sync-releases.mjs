#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RELEASES_PATH = path.resolve(__dirname, '../src/data/releases.json');

const REPO_OWNER = process.env.LIRUNE_REPO_OWNER || 'vasanthgajavelly5-sys';
const REPO_NAME = process.env.LIRUNE_REPO_NAME || 'Lirune';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

/**
 * Fetch a JSON payload from GitHub API with optional auth
 */
export async function fetchJson(url, token = GITHUB_TOKEN) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Lirune-Website-Release-Sync/1.0',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location, token).then(resolve).catch(reject);
      }
      if (res.statusCode === 403 || res.statusCode === 429) {
        return reject(new Error(`GitHub API rate limit exceeded (HTTP ${res.statusCode})`));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} while fetching ${url}`));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Fetch text (such as SHA256SUMS.txt)
 */
export async function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Lirune-Website-Release-Sync/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} while fetching text`));
      }
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve(text));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error(`Timeout fetching text from ${url}`));
    });
  });
}

/**
 * Parse SHA256SUMS.txt into a map of filename -> sha256
 */
export function parseChecksumFile(content) {
  const map = {};
  if (!content) return map;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const hash = parts[0].toLowerCase();
      const filename = path.basename(parts[1].replace(/^\*/, ''));
      if (/^[a-f0-9]{64}$/.test(hash)) {
        map[filename] = hash;
      }
    }
  }
  return map;
}

/**
 * Clean version string (e.g. 'v5.6.2' -> '5.6.2')
 */
export function cleanVersion(tag) {
  return (tag || '').replace(/^(?:android-)?v?/i, '').trim();
}

/**
 * Synchronise releases from GitHub releases list
 */
export async function syncReleases(releasesList, existingData = null, options = {}) {
  const current = existingData || (fs.existsSync(RELEASES_PATH) ? JSON.parse(fs.readFileSync(RELEASES_PATH, 'utf8')) : {
    windows: { version: '0.0.0' },
    android: { version: '0.0.0' }
  });

  if (!Array.isArray(releasesList)) {
    throw new Error('Invalid releases payload: expected array of releases');
  }

  // Filter only published, non-draft, non-prerelease
  const stableReleases = releasesList.filter(r => !r.draft && !r.prerelease);
  if (stableReleases.length === 0) {
    console.warn('[sync-releases] No published stable releases found in payload.');
    return { data: current, changed: false };
  }

  let latestWinRelease = null;
  let winExeAsset = null;
  let winAppxAsset = null;
  let winChecksums = {};

  let latestAndroidRelease = null;
  let androidApkAsset = null;
  let androidChecksums = {};

  // 1. Search for latest Windows release with .exe installer
  for (const r of stableReleases) {
    const exe = (r.assets || []).find(a => /\.exe$/i.test(a.name) && !/blockmap$/i.test(a.name));
    if (exe && exe.size > 0) {
      latestWinRelease = r;
      winExeAsset = exe;
      winAppxAsset = (r.assets || []).find(a => /\.appx$/i.test(a.name));
      const sumsAsset = (r.assets || []).find(a => /sha256sums?\.txt$/i.test(a.name));
      if (sumsAsset && !options.skipNetworkChecksums) {
        try {
          const sumsText = await fetchText(sumsAsset.browser_download_url);
          winChecksums = parseChecksumFile(sumsText);
        } catch (e) {
          console.warn(`[sync-releases] Could not fetch Windows SHA256SUMS.txt: ${e.message}`);
        }
      }
      break;
    }
  }

  // 2. Search for latest Android release with .apk asset (prefer Lirune-Reader-*.apk over generic app-release.apk)
  for (const r of stableReleases) {
    const apk = (r.assets || []).find(a => /lirune.*\.apk$/i.test(a.name)) || (r.assets || []).find(a => /\.apk$/i.test(a.name));
    if (apk && apk.size > 0) {
      latestAndroidRelease = r;
      androidApkAsset = apk;
      const sumsAsset = (r.assets || []).find(a => /sha256sums?\.txt$/i.test(a.name));
      if (sumsAsset && !options.skipNetworkChecksums) {
        try {
          const sumsText = await fetchText(sumsAsset.browser_download_url);
          androidChecksums = parseChecksumFile(sumsText);
        } catch (e) {
          console.warn(`[sync-releases] Could not fetch Android SHA256SUMS.txt: ${e.message}`);
        }
      }
      break;
    }
  }

  const updated = JSON.parse(JSON.stringify(current));
  let changed = false;

  // Process Windows
  if (latestWinRelease && winExeAsset) {
    const winVer = cleanVersion(latestWinRelease.tag_name);
    const winSha = winChecksums[winExeAsset.name] || (winVer === current.windows?.version ? current.windows.sha256 : '');
    const winAppxSha = winAppxAsset ? (winChecksums[winAppxAsset.name] || (winVer === current.windows?.version ? current.windows.appxSha256 : '')) : '';

    const newWin = {
      version: winVer,
      tag: latestWinRelease.tag_name,
      name: latestWinRelease.name || `Lirune Reader ${winVer}`,
      releaseDate: (latestWinRelease.published_at || '').split('T')[0] || current.windows?.releaseDate || '2026-10-27',
      releaseUrl: latestWinRelease.html_url,
      installerUrl: winExeAsset.browser_download_url,
      installerFilename: winExeAsset.name,
      appxUrl: winAppxAsset ? winAppxAsset.browser_download_url : (current.windows?.appxUrl || ''),
      appxFilename: winAppxAsset ? winAppxAsset.name : (current.windows?.appxFilename || ''),
      sha256: winSha || current.windows?.sha256 || '',
      appxSha256: winAppxSha || current.windows?.appxSha256 || '',
      requirements: current.windows?.requirements || 'Windows 10 / 11 (64-bit)',
      storeId: current.windows?.storeId || '9PDNFZ146HDX',
      storeUrl: current.windows?.storeUrl || 'https://apps.microsoft.com/detail/9PDNFZ146HDX?gl=IN&hl=en-US',
      highlights: current.windows?.highlights || [
        "Strict DOMPurify HTML sanitization for FB2, HTML, and Markdown formats",
        "Unified rounded glass dropdowns across all settings tabs",
        "Fullscreen reading immersion with auto-hiding navigation bars",
        "Path traversal (Zip-Slip) guards and 512 MB file bounds check",
        "Offline multi-format reader engine without telemetry"
      ]
    };

    const winChanged = !current.windows ||
      newWin.version !== current.windows.version ||
      newWin.installerFilename !== current.windows.installerFilename ||
      newWin.installerUrl !== current.windows.installerUrl ||
      newWin.sha256 !== current.windows.sha256;

    if (winChanged) {
      updated.windows = newWin;
      changed = true;
    }
  } else {
    console.warn('[sync-releases] Preserving existing Windows release data (no valid installer asset found in new releases).');
  }

  // Process Android
  if (latestAndroidRelease && androidApkAsset) {
    const androidVer = cleanVersion(latestAndroidRelease.tag_name);
    const androidSha = androidChecksums[androidApkAsset.name] || (androidVer === current.android?.version ? current.android.sha256 : '');

    const newAndroid = {
      version: androidVer,
      tag: latestAndroidRelease.tag_name,
      name: latestAndroidRelease.name || `Lirune Reader v${androidVer}`,
      releaseDate: (latestAndroidRelease.published_at || '').split('T')[0] || current.android?.releaseDate || '2026-10-28',
      releaseUrl: latestAndroidRelease.html_url,
      apkUrl: androidApkAsset.browser_download_url,
      apkFilename: androidApkAsset.name,
      sha256: androidSha || current.android?.sha256 || '',
      requirements: current.android?.requirements || 'Android 8.0 (Oreo) or higher',
      highlights: current.android?.highlights || [
        "Scroll Engine v2 is now exclusive, delivering unified 60fps virtualized continuous scrolling",
        "Zero internet permissions: android.permission.INTERNET permanently stripped from production release builds",
        "Android Storage Access Framework (SAF) folder browsing and local SQLite storage",
        "Offline Text-to-Speech (TTS) audio narration",
        "Complete typography customization (line height, margins, letter spacing, font families)"
      ]
    };

    const androidChanged = !current.android ||
      newAndroid.version !== current.android.version ||
      newAndroid.apkFilename !== current.android.apkFilename ||
      newAndroid.apkUrl !== current.android.apkUrl ||
      newAndroid.sha256 !== current.android.sha256;

    if (androidChanged) {
      updated.android = newAndroid;
      changed = true;
    }
  } else {
    console.warn('[sync-releases] Preserving existing Android release data (no valid APK asset found in new releases).');
  }

  updated.lastUpdated = new Date().toISOString();

  return { data: updated, changed };
}

// CLI execution
if (process.argv[1] === __filename) {
  (async () => {
    try {
      console.log(`[sync-releases] Querying GitHub Releases for ${REPO_OWNER}/${REPO_NAME}...`);
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
      let releasesList = [];
      try {
        releasesList = await fetchJson(apiUrl);
      } catch (err) {
        console.warn(`[sync-releases] Warning: Failed to query GitHub API (${err.message}). Preserving existing release manifest.`);
        process.exit(0);
      }

      const existingData = fs.existsSync(RELEASES_PATH) ? JSON.parse(fs.readFileSync(RELEASES_PATH, 'utf8')) : null;
      const { data, changed } = await syncReleases(releasesList, existingData);

      fs.writeFileSync(RELEASES_PATH, JSON.stringify(data, null, 2) + '\n');
      console.log(`[sync-releases] Manifest updated: Windows v${data.windows.version}, Android v${data.android.version}. (Changed: ${changed})`);

      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nwindows_version=${data.windows.version}\nandroid_version=${data.android.version}\n`);
      }
    } catch (err) {
      console.error(`[sync-releases] Error: ${err.message}`);
      process.exit(1);
    }
  })();
}
