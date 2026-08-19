# MCCPS — Merchant Credit Card Processing Services

Website refresh for **mccp.services** — static, framework-free, hosted on GitHub Pages.

**Live (GitHub Pages):** https://joe-miz.com/mccp-services/

## Stack
- Plain HTML / CSS / JS (no build step, no framework)
- [three.js](https://threejs.org) r169 (vendored at `assets/vendor/three.module.min.js`) — 3D hero: floating MCCPS card, orbit rings, particle field
- Google Fonts: Outfit (display) + Inter (body)
- Forms: Formspree (AJAX, no backend)

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home — hero, platform features, Zero Processing Fees, 3-step analysis, agents CTA, quick contact |
| `free-analysis.html` | 3-step free savings analysis form (with statement uploads) |
| `agents.html` | Become an MCCPS Agent — benefits, marketing packages, application form |
| `faq.html` | Independent agent FAQ (FAQPage schema) |
| `terms.html`, `privacy.html` | Legal (carried over from the previous site) |
| `404.html` | Not found |

## Setup: forms
1. Create a form at https://formspree.io (free) — it emails submissions to you.
2. Put the form ID in `site.config.js`:
   ```js
   window.MCCPS_CONFIG = { formspreeId: 'abcdwxyz' };
   ```
   All three forms post to that endpoint with a distinct `_subject`.
3. File uploads on the Free Analysis form need a Formspree plan with attachments; on the free plan the text fields still arrive and statements are collected on the call.

Until an ID is set, submitting shows a "not configured" notice (and the phone number).

## Editing
- Styling lives in `styles.css` (design tokens at the top: brand blue `--blue`, brand green `--green`).
- Shared behaviour (nav, reveals, tilt, counters, forms) in `app.js`.
- 3D hero in `scene.js`. It respects `prefers-reduced-motion`, pauses when off-screen / tab hidden, lowers particle count on phones, and caps pixel ratio.
- Phone number appears as `844.826.6227` / `tel:+18448266227` — search/replace if it changes.

## Deploy
Push to `master`; GitHub Pages serves the repo root. Custom domain: add a `CNAME` file containing `mccp.services` and point DNS at GitHub Pages.
