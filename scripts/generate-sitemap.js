import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');
const PAGES_DIR = path.resolve(ROOT_DIR, 'src/pages');
const SITE_URL = 'https://lirune-reader.web.app';

/**
 * Authoritative indexable public pages.
 * Excludes 404.astro and any non-public or internal assets.
 */
const routes = [
  { path: '', file: 'index.astro', priority: '1.0', changefreq: 'weekly' },
  { path: 'features', file: 'features.astro', priority: '0.9', changefreq: 'monthly' },
  { path: 'formats', file: 'formats.astro', priority: '0.9', changefreq: 'monthly' },
  { path: 'downloads', file: 'downloads.astro', priority: '1.0', changefreq: 'weekly' },
  { path: 'screenshots', file: 'screenshots.astro', priority: '0.8', changefreq: 'monthly' },
  { path: 'changelog', file: 'changelog.astro', priority: '0.9', changefreq: 'weekly' },
  { path: 'getting-started', file: 'getting-started.astro', priority: '0.8', changefreq: 'monthly' },
  { path: 'faq', file: 'faq.astro', priority: '0.8', changefreq: 'monthly' },
  { path: 'privacy', file: 'privacy.astro', priority: '0.7', changefreq: 'monthly' },
  { path: 'licenses', file: 'licenses.astro', priority: '0.6', changefreq: 'monthly' },
  { path: 'support', file: 'support.astro', priority: '0.8', changefreq: 'monthly' }
];

/**
 * Get accurate last modified date for a page file.
 * Queries Git commit history first; falls back to filesystem mtime.
 */
function getLastModifiedDate(filename) {
  const filePath = path.join(PAGES_DIR, filename);

  try {
    const gitDate = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', filePath],
      { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(gitDate)) {
      return gitDate;
    }
  } catch {
    // Git unavailable or uncommitted file - fall through to stat
  }

  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Build URL entries
const urlEntries = routes.map(r => {
  const loc = `${SITE_URL}/${r.path ? r.path : ''}`;
  const lastmod = getLastModifiedDate(r.file);
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>
`;

// Ensure dist directory exists before writing
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Write the canonical sitemap.xml to dist and public
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
if (fs.existsSync(PUBLIC_DIR)) {
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
}

// Clean up any obsolete sitemap files
const obsoleteFiles = [
  path.join(DIST_DIR, 'sitemap-0.xml'),
  path.join(DIST_DIR, 'sitemap-index.xml'),
  path.join(PUBLIC_DIR, 'sitemap-0.xml'),
  path.join(PUBLIC_DIR, 'sitemap-index.xml')
];

for (const f of obsoleteFiles) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
  }
}

console.log(`[generate-sitemap] Successfully generated canonical sitemap.xml (${routes.length} routes). Obsolete index/split sitemaps cleaned up.`);
