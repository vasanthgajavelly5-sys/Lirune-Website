---
name: Lirune Reader Website
description: Official product website for Lirune Reader, offline ebook and document reader for Windows and Android
colors:
  dark-base: "#11151B"
  dark-surface: "#171C24"
  dark-elevated: "#1D232D"
  dark-text-primary: "#E9E7F5"
  dark-text-secondary: "#A6A4B5"
  dark-text-muted: "#717082"
  dark-accent: "#8DB7CC"
  dark-brand-lilac: "#EEECF8"
  dark-border: "rgba(255, 255, 255, 0.08)"
  dark-border-active: "rgba(141, 183, 204, 0.35)"
  light-base: "#F9F9FB"
  light-surface: "#FFFFFF"
  light-elevated: "#F1F1F5"
  light-text-primary: "#14171F"
  light-text-secondary: "#505463"
  light-text-muted: "#7C8091"
  light-accent: "#2D5A7B"
  light-brand-lilac: "#635B88"
  light-border: "rgba(20, 23, 31, 0.09)"
  light-border-active: "rgba(45, 90, 123, 0.35)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
---

## Overview
Lirune is an offline reading application for Windows and Android. The website reflects the experience of a thoughtful, serene digital reading sanctuary rather than a generic SaaS product.

## Colors
Dual-theme system supporting Light, Dark, and System modes:
- **Dark Theme (Default Lirune App Shell):** Deep obsidian slate (`#11151B`), surface panels (`#171C24`), elevated cards (`#1D232D`), and crisp lilac text (`#E9E7F5`).
- **Light Theme (Bookish Paper):** Warm off-white reading paper (`#F9F9FB`), crisp white cards (`#FFFFFF`), slate text (`#14171F`), and muted ink accents (`#2D5A7B`).

## Typography
Strong editorial hierarchy with tight, deliberate letter-spacing on display headings, generous body leading (1.6), and monospace code/checksum badges.

## Layout
- Maximum content width: 1200px with 24px responsive horizontal gutters.
- Visual rhythm alternating between full-bleed editorial hero compositions, asymmetrical feature splits, device frame showcases, and compact reference tables.
- Zero horizontal overflow across viewports from 360px mobile to 1920px desktop.

## Elevation & Depth
- Flat or subtle paper layering; avoid heavy artificial drop-shadows.
- Dark mode depth expressed through border luminance (`rgba(255, 255, 255, 0.08)`) and surface brightness stepping.
- Light mode depth expressed through hairline borders (`rgba(20, 23, 31, 0.09)`) and soft ambient diffusion.

## Components
- **Header:** Sticky backdrop-blur glass header with grouped navigation dropdowns (Product, Explore, About), theme segmented toggle, and primary CTA.
- **Device Frames:** Realistic desktop monitor framing for Windows screenshots and mobile smartphone framing for Android screenshots.
- **Lightbox:** Accessible full-resolution screenshot viewer with keyboard navigation (Esc to close, Left/Right arrow cycling).

## Do's and Don'ts
- **DO:** Use genuine application screenshots; preserve clear editorial typography; respect `prefers-reduced-motion`; test both light and dark themes.
- **DON'T:** Use generic AI illustrations, endless uniform card grids, excessive glowing neon gradients, or crowded single-row navigation bars.
