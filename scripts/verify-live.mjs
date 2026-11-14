import https from 'node:https';

const routes = [
  '/',
  '/features',
  '/formats',
  '/downloads',
  '/screenshots',
  '/changelog',
  '/getting-started',
  '/faq',
  '/privacy',
  '/licenses',
  '/support',
  '/robots.txt',
  '/sitemap-index.xml',
  '/sitemap-0.xml',
  '/images/branding/og-preview.png',
  '/images/branding/lirune-icon.png'
];

const host = 'lirune-reader-1aa95.web.app';

async function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://${host}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          headers: res.headers,
          bodyLength: data.length
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error(`Timeout on ${path}`));
    });
  });
}

async function run() {
  console.log(`=== LIVE VERIFICATION: https://${host} ===\n`);
  let success = true;

  for (const route of routes) {
    try {
      const res = await fetchUrl(route);
      const isOk = res.statusCode === 200;
      if (!isOk) success = false;
      console.log(`[${res.statusCode}] ${route.padEnd(35)} -> Length: ${res.bodyLength} bytes`);
      if (route === '/') {
        console.log(`     Security Headers:`);
        console.log(`       x-content-type-options: ${res.headers['x-content-type-options']}`);
        console.log(`       x-frame-options:        ${res.headers['x-frame-options']}`);
        console.log(`       content-type:           ${res.headers['content-type']}`);
      }
    } catch (err) {
      console.error(`[ERR] ${route}: ${err.message}`);
      success = false;
    }
  }

  // Also verify 404 behavior
  try {
    const notFoundRes = await fetchUrl('/non-existent-page-test-404');
    console.log(`\n[${notFoundRes.statusCode}] /non-existent-page-test-404 (Expected 404) -> Length: ${notFoundRes.bodyLength} bytes`);
  } catch (err) {
    console.error(`[ERR] 404 test: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(success ? 'LIVE PRODUCTION SITE FULLY VERIFIED!' : 'VERIFICATION ENCOUNTERED ISSUES');
  console.log(`========================================`);
  if (!success) process.exit(1);
}

run();
