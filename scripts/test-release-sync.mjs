import assert from 'node:assert';
import { syncReleases, parseChecksumFile, cleanVersion } from './sync-releases.mjs';

console.log('=== LIRUNE RELEASE SYNCHRONISATION TEST SUITE ===\n');

const BASE_MANIFEST = {
  lastUpdated: '2026-10-28T00:00:00.000Z',
  windows: {
    version: '5.6.2',
    tag: 'v5.6.2',
    name: 'Lirune Reader 5.6.2',
    releaseDate: '2026-10-27',
    releaseUrl: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v5.6.2',
    installerUrl: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.2/Lirune.Reader-5.6.2-Setup.exe',
    installerFilename: 'Lirune.Reader-5.6.2-Setup.exe',
    sha256: '7e11f4f8512925aebe125d688cb2f1350078e928d58b105df746df845d354843',
    requirements: 'Windows 10 / 11 (64-bit)'
  },
  android: {
    version: '4.9.3',
    tag: 'v4.9.3',
    name: 'Lirune Reader v4.9.3',
    releaseDate: '2026-10-28',
    releaseUrl: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v4.9.3',
    apkUrl: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v4.9.3/Lirune-Reader-v4.9.3-release.apk',
    apkFilename: 'Lirune-Reader-v4.9.3-release.apk',
    sha256: 'f347c0658964e06467cba09d95d5dc7f66631f48b5615f7ac358e041d2a686c0',
    requirements: 'Android 8.0 (Oreo) or higher'
  }
};

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function main() {
  // Test Checksum Parser
  runTest('Checksum parser: valid SHA256SUMS format', () => {
    const raw = `
# Comment line
7e11f4f8512925aebe125d688cb2f1350078e928d58b105df746df845d354843  Lirune.Reader-5.6.2-Setup.exe
f347c0658964e06467cba09d95d5dc7f66631f48b5615f7ac358e041d2a686c0 *Lirune-Reader-v4.9.3-release.apk
    `;
    const map = parseChecksumFile(raw);
    assert.strictEqual(map['Lirune.Reader-5.6.2-Setup.exe'], '7e11f4f8512925aebe125d688cb2f1350078e928d58b105df746df845d354843');
    assert.strictEqual(map['Lirune-Reader-v4.9.3-release.apk'], 'f347c0658964e06467cba09d95d5dc7f66631f48b5615f7ac358e041d2a686c0');
  });

  // Scenario A: Stable Windows Release
  await runAsyncTest('Scenario A: Stable Windows release updates Windows and leaves Android intact', async () => {
    const mockReleases = [
      {
        tag_name: 'v5.6.4',
        name: 'Lirune Reader 5.6.4 — Security Patch',
        published_at: '2026-11-14T10:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v5.6.4',
        assets: [
          {
            name: 'Lirune.Reader-5.6.4-Setup.exe',
            size: 125000000,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.4/Lirune.Reader-5.6.4-Setup.exe'
          }
        ]
      },
      {
        tag_name: 'v4.9.3',
        name: 'Lirune Reader v4.9.3',
        published_at: '2026-10-28T10:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v4.9.3',
        assets: [
          {
            name: 'Lirune-Reader-v4.9.3-release.apk',
            size: 71000000,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v4.9.3/Lirune-Reader-v4.9.3-release.apk'
          }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.data.windows.version, '5.6.4');
    assert.strictEqual(result.data.windows.installerFilename, 'Lirune.Reader-5.6.4-Setup.exe');
    assert.strictEqual(result.data.android.version, '4.9.3');
  });

  // Scenario B: Stable Android Release
  await runAsyncTest('Scenario B: Stable Android release updates Android and leaves Windows intact', async () => {
    const mockReleases = [
      {
        tag_name: 'v4.9.5',
        name: 'Lirune Reader v4.9.5 — Android Fixes',
        published_at: '2026-11-14T12:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v4.9.5',
        assets: [
          {
            name: 'Lirune-Reader-v4.9.5-release.apk',
            size: 72000000,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v4.9.5/Lirune-Reader-v4.9.5-release.apk'
          }
        ]
      },
      {
        tag_name: 'v5.6.2',
        name: 'Lirune Reader 5.6.2',
        published_at: '2026-10-27T10:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v5.6.2',
        assets: [
          {
            name: 'Lirune.Reader-5.6.2-Setup.exe',
            size: 122620743,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.2/Lirune.Reader-5.6.2-Setup.exe'
          }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.data.android.version, '4.9.5');
    assert.strictEqual(result.data.android.apkFilename, 'Lirune-Reader-v4.9.5-release.apk');
    assert.strictEqual(result.data.windows.version, '5.6.2');
  });

  // Scenario C: Both Platforms Updated
  await runAsyncTest('Scenario C: Both platforms independently updated', async () => {
    const mockReleases = [
      {
        tag_name: 'v5.7.0',
        name: 'Lirune Reader 5.7.0',
        published_at: '2026-11-14T14:00:00Z',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune.Reader-5.7.0-Setup.exe', size: 126000000, browser_download_url: 'https://example.com/setup.exe' }
        ]
      },
      {
        tag_name: 'v5.0.0',
        name: 'Lirune Reader v5.0.0 Android',
        published_at: '2026-11-14T14:00:00Z',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune-Reader-v5.0.0-release.apk', size: 75000000, browser_download_url: 'https://example.com/lirune.apk' }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.changed, true);
    assert.strictEqual(result.data.windows.version, '5.7.0');
    assert.strictEqual(result.data.android.version, '5.0.0');
  });

  // Scenario D: Pre-release is ignored
  await runAsyncTest('Scenario D: Pre-releases are strictly ignored for stable downloads', async () => {
    const mockReleases = [
      {
        tag_name: 'v6.0.0-beta.1',
        name: 'Lirune 6.0.0 Beta',
        draft: false,
        prerelease: true, // PRE-RELEASE!
        assets: [
          { name: 'Lirune.Reader-6.0.0-beta.exe', size: 120000000, browser_download_url: 'https://example.com/beta.exe' }
        ]
      },
      {
        tag_name: 'v5.6.2',
        name: 'Lirune Reader 5.6.2',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune.Reader-5.6.2-Setup.exe', size: 122620743, browser_download_url: 'https://example.com/setup.exe' }
        ]
      },
      {
        tag_name: 'v4.9.3',
        name: 'Lirune Reader v4.9.3',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune-Reader-v4.9.3-release.apk', size: 71000000, browser_download_url: 'https://example.com/app.apk' }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.data.windows.version, '5.6.2');
    assert.strictEqual(result.data.android.version, '4.9.3');
  });

  // Scenario E: Missing Installer Asset Rejects Release and Preserves Previous
  await runAsyncTest('Scenario E: Release missing installer asset preserves previous valid metadata', async () => {
    const mockReleases = [
      {
        tag_name: 'v5.8.0',
        name: 'Empty Release with no binaries',
        draft: false,
        prerelease: false,
        assets: [] // NO ASSETS!
      },
      {
        tag_name: 'v5.6.2',
        name: 'Lirune Reader 5.6.2',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune.Reader-5.6.2-Setup.exe', size: 122620743, browser_download_url: 'https://example.com/setup.exe' }
        ]
      },
      {
        tag_name: 'v4.9.3',
        name: 'Lirune Reader v4.9.3',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'Lirune-Reader-v4.9.3-release.apk', size: 71000000, browser_download_url: 'https://example.com/app.apk' }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.data.windows.version, '5.6.2'); // preserved!
    assert.strictEqual(result.data.android.version, '4.9.3');
  });

  // Scenario F: GitHub API Empty / Failure Preserves Existing
  await runAsyncTest('Scenario F: Empty releases list preserves existing manifest', async () => {
    const result = await syncReleases([], BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.changed, false);
    assert.strictEqual(result.data.windows.version, '5.6.2');
    assert.strictEqual(result.data.android.version, '4.9.3');
  });

  // Scenario G: Same Release Received Twice (Idempotency)
  await runAsyncTest('Scenario G: Idempotent processing detects no changes when release is unchanged', async () => {
    const mockReleases = [
      {
        tag_name: 'v5.6.2',
        name: 'Lirune Reader 5.6.2',
        published_at: '2026-10-27T10:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v5.6.2',
        assets: [
          {
            name: 'Lirune.Reader-5.6.2-Setup.exe',
            size: 122620743,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v5.6.2/Lirune.Reader-5.6.2-Setup.exe'
          }
        ]
      },
      {
        tag_name: 'v4.9.3',
        name: 'Lirune Reader v4.9.3',
        published_at: '2026-10-28T10:00:00Z',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/tag/v4.9.3',
        assets: [
          {
            name: 'Lirune-Reader-v4.9.3-release.apk',
            size: 71275218,
            browser_download_url: 'https://github.com/vasanthgajavelly5-sys/Lirune/releases/download/v4.9.3/Lirune-Reader-v4.9.3-release.apk'
          }
        ]
      }
    ];

    const result = await syncReleases(mockReleases, BASE_MANIFEST, { skipNetworkChecksums: true });
    assert.strictEqual(result.changed, false);
  });

  // Scenario H: Fallback Validation
  runTest('Scenario H: Semantic version tag cleaner handles varied prefixes', () => {
    assert.strictEqual(cleanVersion('v5.6.2'), '5.6.2');
    assert.strictEqual(cleanVersion('V4.9.3'), '4.9.3');
    assert.strictEqual(cleanVersion('5.0.0'), '5.0.0');
  });

  console.log(`\n========================================`);
  console.log(`RELEASE SYNC TESTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log(`========================================\n`);

  if (testsFailed > 0) process.exit(1);
}

main();
