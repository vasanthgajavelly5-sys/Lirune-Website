import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const SITE_URL = 'https://lirune-reader.web.app';

const routes = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: 'features', priority: '0.9', changefreq: 'monthly' },
  { path: 'formats', priority: '0.9', changefreq: 'monthly' },
  { path: 'downloads', priority: '1.0', changefreq: 'weekly' },
  { path: 'screenshots', priority: '0.8', changefreq: 'monthly' },
  { path: 'changelog', priority: '0.9', changefreq: 'weekly' },
  { path: 'getting-started', priority: '0.8', changefreq: 'monthly' },
  { path: 'faq', priority: '0.8', changefreq: 'monthly' },
  { path: 'privacy', priority: '0.7', changefreq: 'monthly' },
  { path: 'licenses', priority: '0.6', changefreq: 'monthly' },
  { path: 'support', priority: '0.8', changefreq: 'monthly' }
];

const today = new Date().toISOString().split('T')[0];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    r => `  <url>
    <loc>${SITE_URL}/${r.path ? r.path : ''}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-0.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;

fs.writeFileSync(path.join(DIST_DIR, 'sitemap-0.xml'), sitemapXml, 'utf-8');
fs.writeFileSync(path.join(DIST_DIR, 'sitemap-index.xml'), sitemapIndexXml, 'utf-8');
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');

console.log('[generate-sitemap] Successfully generated sitemap-index.xml and sitemap-0.xml');
