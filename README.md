# Lirune Official Product Website

The official product website for **Lirune Reader**, a free, open-source, and offline ebook and document reader for Windows and Android.

Website domain: `https://lirune-reader.web.app`  
Main Application Repository: `https://github.com/vasanthgajavelly5-sys/Lirune`

---

## 1. Project Overview & Architecture

This repository is maintained as an independent static-site project completely decoupled from the desktop and mobile application codebases. It is built with **Astro** for zero-JS-by-default performance, full HTML pre-rendering, automated sitemap generation, structured data, and deployment to Google Firebase Hosting.

### Key Architectural Highlights
- **Application-Aligned Design Tokens:** Uses the exact startup dark theme palette from the Lirune desktop and Android applications (`#11151B` base background, `#171C24` surface, `#EEECF8` brand lilac, `#8DB7CC` accessible slate accent).
- **Authentic Screenshots:** Uses real screenshots captured from live application runs of Lirune Reader for Windows and Android in device frames.
- **Independent Release Channels:** Tracks Windows (`v5.6.2`) and Android (`v4.9.3`) independently from GitHub Releases.
- **Zero Third-Party Trackers:** No Google Analytics, cookies, or tracking pixels.

---

## 2. Directory Structure

```text
Lirune-Website/
├── astro.config.mjs         # Astro site configuration
├── firebase.json            # Firebase Hosting headers, cleanUrls, and caching
├── .firebaserc              # Firebase active project specification
├── package.json             # NPM dependencies and build scripts
├── public/                  # Static assets served at site root
│   ├── favicon.ico
│   ├── robots.txt
│   └── images/
│       ├── branding/        # Official icons and logos
│       └── screenshots/     # Real Windows & Android application screenshots
├── scripts/
│   ├── fetch-releases.js    # Build-time release fetcher querying GitHub API
│   ├── generate-sitemap.js  # XML sitemap generator
│   └── test-routes.js       # Comprehensive QA test suite (103 checks)
└── src/
    ├── data/
    │   ├── config.json      # Site-wide settings, URLs, and creator config
    │   ├── releases.json    # Build-time release manifest with SHA-256
    │   ├── formats.json     # 19-format compatibility matrix
    │   ├── features.json    # Feature highlights and screenshots
    │   └── faq.json         # Complete Q&A database
    ├── styles/
    │   ├── tokens.css       # Design tokens matching app styling
    │   └── global.css       # Typography, resets, button and card primitives
    ├── components/          # Reusable Astro UI components
    ├── layouts/
    │   └── BaseLayout.astro # HTML shell, SEO metadata, JSON-LD
    └── pages/               # 11 distinct static routes + 404
```

---

## 3. Development Setup & Commands

### Prerequisites
- Node.js 20 or newer
- npm 10 or newer

### Installation
```bash
npm install
```

### Local Development Server
```bash
npm run dev
# Starts local development server at http://localhost:4321
```

### Static Production Build
```bash
npm run build
# Runs:
# 1. node scripts/fetch-releases.js (fetches published GitHub releases)
# 2. astro build (pre-renders all static pages to /dist)
# 3. node scripts/generate-sitemap.js (builds XML sitemaps)
```

### Quality Assurance Testing
```bash
npm run test:site
# Executes scripts/test-routes.js: validates all 103 checks including routes,
# meta tags, JSON-LD, internal links, images, and sitemaps.
```

### Local Static Preview
```bash
npm run preview
# Previews the production dist/ folder at http://localhost:4321
```

---

## 4. Maintenance Guide

### How Release Information Updates Automatically
When a new stable release of Lirune Reader is published on GitHub:
1. Running `npm run build` triggers `scripts/fetch-releases.js`.
2. The script queries `https://api.github.com/repos/vasanthgajavelly5-sys/Lirune/releases`.
3. It identifies the latest stable Windows release (`.exe` or `.appx`) and Android release (`.apk`) independently.
4. It updates `src/data/releases.json` with the new version, date, asset URLs, and filename.
5. If GitHub API rate limits occur or offline builds run, a verified fallback manifest is preserved.
6. Local development candidates (e.g. v5.6.4) are never advertised until published to GitHub Releases.

### Replacing Screenshots
All screenshot assets live in `public/images/screenshots/`:
- Windows screenshots are prefixed with `win-` (e.g., `win-library-grid.png`, `win-reader-story.png`).
- Android screenshots are prefixed with `android-` (e.g., `android-library.png`, `android-reader-epub.png`).
To update a screenshot, capture the running application UI, crop away unrelated desktop background, and overwrite the existing file in `public/images/screenshots/`. Then rebuild with `npm run build`.

### Buy Me a Coffee Configuration
The Buy Me a Coffee URL is centrally defined in `src/data/config.json`:
```json
{
  "buyMeACoffeeUrl": "https://buymeacoffee.com/vasanthgajavelly"
}
```
All buttons and navigation links across the website reference this single authoritative configuration.

### SEO & Search Console Configuration
1. **Sitemap:** Automatically generated at `https://lirune-reader.web.app/sitemap-index.xml`.
2. **Robots.txt:** Deployed at `https://lirune-reader.web.app/robots.txt`.
3. **Google Search Console Verification:**
   - Log in to Google Search Console with your Google account.
   - Add property: `https://lirune-reader.web.app`.
   - Choose HTML tag or file verification.
   - Submit `https://lirune-reader.web.app/sitemap-index.xml`.

---

## 5. Google Firebase Hosting

### Configuration
Firebase Hosting configuration is defined in `firebase.json`:
- Public directory: `dist`
- Clean URLs: `true` (enables extensionless URLs such as `/features`, `/downloads`)
- Cache headers: 1 year for immutable images, scripts, and fonts; 1 hour for HTML pages.
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.

### Deployment Commands
1. Login to Firebase CLI (if not already authenticated):
   ```bash
   npx firebase-tools login
   ```
2. Deploy website:
   ```bash
   npx firebase-tools deploy --only hosting
   ```

### Rollback Instructions
If a rollback is ever needed:
```bash
# View release history
npx firebase-tools hosting:releases:list

# Roll back to a previous deployment version
npx firebase-tools hosting:releases:rollback
```

---

## 6. License
Lirune Reader is licensed under the **GNU General Public License v3.0**.  
Copyright © 2026 Vasanth Gajavelly.
