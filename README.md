# MCCPS — Merchant Credit Card Processing Services

Website refresh for **mccp.services** — static, framework-free, hosted on GitHub Pages.

**Live (GitHub Pages):** https://joe-miz.com/mccp-services/

## Stack
- Plain HTML / CSS / JS (no build step, no framework). ES modules + import map (`three` → vendored r169 build, `three/addons/` → vendored postprocessing/geometry addons).
- **Home = one continuous 3D world** (`experience.js`): a single persistent three.js scene with bloom; the camera flies between "stages" as you scroll through pinned chapters (hero → exploded card with hotspots → tap-to-pay on a 3D terminal → terminal-to-bank network → fee stack collapsing to zero with a live savings slider → 3D analytics with hover → security shell → agent network → contact). Everything is procedural — no model files.
- Sub-pages share the nav/footer and run a light ambient 3D background (`scene.js`, `data-scene="ambient"`).
- Google Fonts: Outfit (display) + Inter (body). Forms: Formspree (AJAX, no backend).

## Interactions (home)
drag/flip the hero card · hover/click hotspots on the exploded card · "Replay the tap" · monthly-volume slider (drives the fee stack + savings math) · hover the 3D chart · chapter dots (right) · custom cursor · preloader. **Phones / touch:** the story switches to **tap-to-advance** (no page scrolling): each chapter is a full-screen slide, the 3D plays to a hold point, then tap anywhere / swipe left / the Continue pill advances to the next beat or chapter; tap the left edge / back button to go back; story progress bar under the nav; the contact slide scrolls internally with the footer. Motion respects `prefers-reduced-motion`.

## Editing pages
Pages are generated from `tools/gen.py` (shared head/nav/footer) + `tools/home.part.html` (home chapters). Edit those, then run `python3 tools/gen.py` from anywhere — it rewrites the HTML in the repo root.

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
