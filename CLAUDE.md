# المدّخر الصغير: PROTOTYPE of a Three.js kids' banking game (Arabic-only, mobile, white-label; pitch for QIB)

## Working rules (token budget matters)
- Do exactly the phase prompt. No extra features, refactors, READMEs or long summaries.
- Don't explore. Files you need are named in the prompt or the map below. Don't read PLAN.md or PLAN-FULL.md unless asked.
- Never read binaries: public/models, public/audio, public/fonts, public/brand, public/icons, *.glb, *.mp3, *.png, *.woff2.
- When unsure of a three.js API, grep node_modules/three (src/ or examples/jsm/) for it. Don't guess and don't read whole files.
- Verify with `npm run build` once at the end (plus `npm test` if the economy changed). Never start the dev server.
- Plain JS ES modules. No TypeScript, frameworks or extra deps unless the prompt says so. Keep files ≤250 lines.
- All player-facing text is Arabic, via `t('key')` from data/ar.json. Never hardcode UI strings.
- White-label: the brand (name, colours, logo), the content (prices, jobs, items, stores, quests) and the town map live in data/*.json, never in code.

## Tech
- `three/webgpu` WebGPURenderer (auto WebGL2 fallback, which is the baseline target). TSL for custom shaders; keep TSL inside src/world/light.js and fx.js.
- Lighting: TSL `fakeSun()` on all materials, no realtime lighting. Mid/high: one DirectionalLight shadow map rendered ONCE after load. Low: no shadow map, fake contact-shadow quads instead. Characters get blob shadows.
- Tiers in src/quality.js (low/mid/high), and every effect checks the tier. Particles 20/60/150. Post: none on low, grade+vignette on mid/high. 30fps cap on low.
- No per-frame allocations; prefer GPU (TSL `time`) animation. Pause rendering while full-screen UI or DOM jobs are open.
- Two scenes, the town and the bank interior, both kept in memory and swapped by `setActiveScene()` behind a fade.
- Events go through src/bus.js. src/economy.js is pure logic (no DOM/three) with tests in tests/.
- Islamic finance: never use interest/فائدة or percentage returns. No gambling or random money rewards.

## Map
src/: main.js · quality.js · camera.js · input.js · player.js · bus.js · economy.js · save.js · audio.js · quests.js
src/world/: town.js (ASCII map → tiles) · interior.js (bank + market rooms from data/bank.json, market.json) · doors.js · light.js · fx.js   src/ui/: screens, hud, base.css   src/jobs/: runner, assemble.js
data/: brand.json ar.json town.json tiles.json items.json stores.json jobs.json quests.json
