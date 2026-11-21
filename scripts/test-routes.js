import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '../dist');
const CANONICAL_DOMAIN = 'https://lirune-reader.web.app';

const expectedPages = [
  'index.html',
  'features/index.html',
  'formats/index.html',
  'downloads/index.html',
  'screenshots/index.html',
  'changelog/index.html',
  'getting-started/index.html',
  'faq/index.html',
  'privacy/index.html',
  'licenses/index.html',
  'support/index.html',
  '404.html'
];

let totalChecks = 0;
let passedChecks = 0;
const errors = [];

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    errors.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== LIRUNE WEBSITE VALIDATION SUITE ===\n');

// 1. Check expected pages
console.log('1. Checking compiled static pages:');
for (const page of expectedPages) {
  const fullPath = path.join(DIST, page);
  assert(fs.existsSync(fullPath), `Page exists: ${page}`);
}

// 2. Check metadata & HTML structure on each page
console.log('\n2. Checking SEO metadata, canonical URLs and structured data:');
for (const page of expectedPages) {
  const fullPath = path.join(DIST, page);
  if (!fs.existsSync(fullPath)) continue;

  const html = fs.readFileSync(fullPath, 'utf-8');
  assert(/<title>.*<\/title>/i.test(html), `Has <title>: ${page}`);
  assert(/<meta\s+name=["']description["']/i.test(html), `Has meta description: ${page}`);
  assert(/<link\s+rel=["']canonical["']/i.test(html), `Has canonical link: ${page}`);
  assert(/<meta\s+property=["']og:image["']/i.test(html), `Has Open Graph image: ${page}`);

  // Canonical tag must use CANONICAL_DOMAIN and must NOT contain secondary domain
  const canonicalMatch = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i.exec(html) ||
                         /<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i.exec(html);
  assert(canonicalMatch !== null, `Found canonical link tag in ${page}`);
  if (canonicalMatch) {
    const canonicalHref = canonicalMatch[1];
    assert(canonicalHref.startsWith(CANONICAL_DOMAIN), `Canonical uses ${CANONICAL_DOMAIN}: ${page} (${canonicalHref})`);
    assert(!canonicalHref.includes('lirune-reader-1aa95.web.app'), `Canonical does NOT reference 1aa95 domain: ${page}`);
  }

  // og:url check
  const ogUrlMatch = /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i.exec(html) ||
                     /<meta\s+content=["']([^"']+)["']\s+property=["']og:url["']/i.exec(html);
  assert(ogUrlMatch !== null, `Found og:url in ${page}`);
  if (ogUrlMatch) {
    const ogUrl = ogUrlMatch[1];
    assert(ogUrl.startsWith(CANONICAL_DOMAIN), `og:url uses canonical domain: ${page} (${ogUrl})`);
    assert(!ogUrl.includes('lirune-reader-1aa95.web.app'), `og:url does NOT reference 1aa95 domain: ${page}`);
  }

  // robots meta tag check: 404 must be noindex, others must be index
  if (page === '404.html') {
    assert(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(html), '404.html has robots noindex, nofollow');
  } else {
    assert(/<meta\s+name=["']robots["']\s+content=["']index,\s*follow/i.test(html), `Public page ${page} has robots index, follow`);
  }

  if (page === 'index.html') {
    const jsonLdMatch = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i.exec(html);
    assert(jsonLdMatch !== null, 'Homepage includes JSON-LD structured data');
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        assert(parsed['@context'] === 'https://schema.org', 'Structured data has schema.org context');
        assert(Array.isArray(parsed['@graph']), 'Structured data contains @graph array');
        const websiteData = parsed['@graph'].filter(item => item['@type'] === 'WebSite');
        assert(websiteData.length === 1, 'Homepage has exactly one WebSite structured-data item');
        if (websiteData.length === 1) {
          assert(websiteData[0].name === 'Lirune Reader', 'WebSite structured data names Lirune Reader');
          assert(websiteData[0].alternateName === 'Lirune', 'WebSite structured data has Lirune alternateName');
          assert(websiteData[0].url === `${CANONICAL_DOMAIN}/`, 'WebSite structured data uses the canonical homepage URL');
        }
        const jsonText = JSON.stringify(parsed);
        assert(!jsonText.includes('lirune-reader-1aa95.web.app'), 'Structured data does NOT reference 1aa95 domain');
      } catch (err) {
        assert(false, `Structured data JSON parse error: ${err.message}`);
      }
    }

    if (page === 'index.html') {
      assert(/<meta\s+property=["']og:site_name["']\s+content=["']Lirune Reader["']/i.test(html), 'Homepage Open Graph site name is Lirune Reader');
      assert(/<meta\s+property=["']og:type["']\s+content=["']website["']/i.test(html), 'Homepage Open Graph type is website');
      assert(/<meta\s+property=["']og:url["']\s+content=["']https:\/\/lirune-reader\.web\.app\/["']/i.test(html), 'Homepage Open Graph URL is canonical');
      assert(/50\+ formats/i.test(html), 'Homepage metadata includes the 50+ formats positioning');
    }
  }
}

// 3. Check image references
console.log('\n3. Checking image asset integrity:');
const imageMatches = new Set();
for (const page of expectedPages) {
  const fullPath = path.join(DIST, page);
  if (!fs.existsSync(fullPath)) continue;

  const html = fs.readFileSync(fullPath, 'utf-8');
  const imgRegex = /(?:src|href|data-full)=["'](\/images\/[^"']+)["']/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    imageMatches.add(match[1]);
  }
}

for (const imgUrl of imageMatches) {
  const localImgPath = path.join(DIST, imgUrl.replace(/^\//, ''));
  assert(fs.existsSync(localImgPath), `Image file exists on disk: ${imgUrl}`);
}

// 4. Check sitemap and robots.txt
console.log('\n4. Checking discoverability assets (Sitemap & Robots.txt):');
const sitemapPath = path.join(DIST, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'Canonical sitemap.xml exists');

// Verify obsolete sitemaps do NOT exist
assert(!fs.existsSync(path.join(DIST, 'sitemap-index.xml')), 'Obsolete sitemap-index.xml is absent');
assert(!fs.existsSync(path.join(DIST, 'sitemap-0.xml')), 'Obsolete sitemap-0.xml is absent');

if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  assert(sitemapContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'sitemap.xml has UTF-8 XML declaration');
  assert(sitemapContent.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'sitemap.xml uses standard urlset schema');
  assert(!sitemapContent.includes('<sitemapindex'), 'sitemap.xml is a urlset, not a sitemap index');

  // Extract all <loc>
  const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  const locs = [];
  let locMatch;
  while ((locMatch = locRegex.exec(sitemapContent)) !== null) {
    locs.push(locMatch[1]);
  }

  assert(locs.length === 11, `sitemap.xml contains exactly 11 canonical routes (found ${locs.length})`);

  for (const loc of locs) {
    assert(loc.startsWith(CANONICAL_DOMAIN), `Sitemap loc uses ${CANONICAL_DOMAIN}: ${loc}`);
    assert(!loc.includes('lirune-reader-1aa95.web.app'), `Sitemap loc does NOT use 1aa95 domain: ${loc}`);
    assert(!loc.includes('404'), `Sitemap loc does NOT contain 404 page: ${loc}`);

    // Map loc back to disk file
    const urlObj = new URL(loc);
    const cleanPath = urlObj.pathname === '/' ? 'index.html' : `${urlObj.pathname.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
    const targetFile = path.join(DIST, cleanPath);
    assert(fs.existsSync(targetFile), `Sitemap route resolves to real static page on disk: ${loc} -> ${cleanPath}`);
  }

  // Validate lastmod format
  const lastmodRegex = /<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g;
  let lastmodCount = 0;
  while (lastmodRegex.exec(sitemapContent) !== null) {
    lastmodCount++;
  }
  assert(lastmodCount === locs.length, `Every sitemap URL has a valid YYYY-MM-DD lastmod (${lastmodCount}/${locs.length})`);
}

// Check robots.txt
const robotsPath = path.join(DIST, 'robots.txt');
assert(fs.existsSync(robotsPath), 'robots.txt exists');
if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
  assert(robotsContent.includes('User-agent: *'), 'robots.txt contains User-agent: *');
  assert(robotsContent.includes('Allow: /'), 'robots.txt contains Allow: /');
  assert(robotsContent.includes(`Sitemap: ${CANONICAL_DOMAIN}/sitemap.xml`), `robots.txt references ${CANONICAL_DOMAIN}/sitemap.xml`);
  assert(!robotsContent.includes('sitemap-index.xml'), 'robots.txt does NOT reference sitemap-index.xml');
  assert(!robotsContent.includes('sitemap-0.xml'), 'robots.txt does NOT reference sitemap-0.xml');
}

// 5. Check internal navigation links
console.log('\n5. Checking internal hyperlinks:');
const internalLinks = new Set();
for (const page of expectedPages) {
  const fullPath = path.join(DIST, page);
  if (!fs.existsSync(fullPath)) continue;

  const html = fs.readFileSync(fullPath, 'utf-8');
  const linkRegex = /<a\s+[^>]*href=["'](\/[^"']*)["']/g;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const raw = m[1].split('#')[0]; // strip hash
    if (raw && !raw.startsWith('/images/')) {
      internalLinks.add(raw);
    }
  }
}

for (const link of internalLinks) {
  const clean = link === '/' ? 'index.html' : `${link.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
  const targetPath = path.join(DIST, clean);
  assert(fs.existsSync(targetPath), `Internal link resolves to valid page: ${link} -> ${clean}`);
}

console.log(`\n========================================`);
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${errors.length}`);
console.log(`========================================\n`);

if (errors.length > 0) {
  process.exit(1);
}
