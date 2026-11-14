import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.resolve(__dirname, '../dist');

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
console.log('\n2. Checking SEO metadata and structured data:');
for (const page of expectedPages) {
  const fullPath = path.join(DIST, page);
  if (!fs.existsSync(fullPath)) continue;

  const html = fs.readFileSync(fullPath, 'utf-8');
  assert(/<title>.*<\/title>/i.test(html), `Has <title>: ${page}`);
  assert(/<meta\s+name=["']description["']/i.test(html), `Has meta description: ${page}`);
  assert(/<link\s+rel=["']canonical["']/i.test(html), `Has canonical link: ${page}`);
  assert(/<meta\s+property=["']og:image["']/i.test(html), `Has Open Graph image: ${page}`);

  if (page === 'index.html') {
    const jsonLdMatch = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i.exec(html);
    assert(jsonLdMatch !== null, 'Homepage includes JSON-LD structured data');
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        assert(parsed['@context'] === 'https://schema.org', 'Structured data has schema.org context');
        assert(Array.isArray(parsed['@graph']), 'Structured data contains @graph array');
      } catch (err) {
        assert(false, `Structured data JSON parse error: ${err.message}`);
      }
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
console.log('\n4. Checking discoverability assets:');
assert(fs.existsSync(path.join(DIST, 'robots.txt')), 'robots.txt exists');
assert(fs.existsSync(path.join(DIST, 'sitemap-index.xml')), 'sitemap-index.xml exists');
assert(fs.existsSync(path.join(DIST, 'sitemap-0.xml')), 'sitemap-0.xml exists');

const robotsContent = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf-8');
assert(robotsContent.includes('sitemap-index.xml'), 'robots.txt references sitemap-index.xml');

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
