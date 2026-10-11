# المدّخر الصغير — Kids' Banking Tycoon (Doha) — Master Plan

> **Stage 2–3 (production) plan.** Start from the prototype in PLAN.md. When production begins, add the Blender naming conventions from §5.1 to CLAUDE.md.

A low-poly Doha town where a child (6–11) **works jobs → earns cash → deposits at مصرف قطر الإسلامي (QIB) → saves toward a goal → withdraws → buys things**.
Arabic-only, mobile-first, Three.js WebGPU with automatic WebGL2 fallback, baked lighting, tuned for low-end Android and iOS.

> This file is for **you**. Claude only reads `CLAUDE.md` plus the phase prompt you paste (section 8). That keeps every session small.

---

## 1. How to keep Claude Code usage low (do this every time)

| Rule | Why it saves usage |
|---|---|
| **One phase = one fresh session** (new session or `/clear`). Paste the phase prompt from §8 as-is. | Context stays small; nothing old gets re-sent. |
| Default model **Sonnet 5.5**. Use **Haiku 5.5** for tiny edits. Use **Opus 5.5** only when Sonnet fails twice on the same bug. | Cost per token differs a lot. |
| **You edit content yourself**: prices, pay, item names, Arabic text, colors, quests live in `data/*.json`. | Most "tweaks" need no Claude at all. |
| Bug reports in this form: *file + symptom + pasted console error + device*. Never "it doesn't work, check everything". | Claude doesn't have to look around the whole project. |
| **Commit after every phase** (`git commit`). If something breaks, `git checkout` it yourself. | You never pay Claude to undo things. |
| Never ask for "review / improve / refactor the whole codebase". | Those are the most expensive requests. |
| Art, layout and baking are done by you in Blender. Claude only writes the scripts, once. | Iterating on 3D models through code is very slow. |
| Mini-games are 2D HTML/CSS, not 3D. | Much less code. The 3D renderer pauses during jobs, which also saves battery. |
| Placeholder-first: each phase works without final art. | Code and art run in parallel, and you don't redo phases. |

---

## 2. Game design

### 2.1 Core loop
```
اعمل (job mini-game, ~45s) ──► محفظة (wallet, capped)
      ▲                              │
      │                              ▼
   طاقة/يوم جديد            مصرف قطر الإسلامي: إيداع / هدفي / صندوق الخير
                                     │
     اشترِ من المتاجر ◄── سحب (الصراف الآلي + الرمز السري) or بطاقة
                │
                ▼
   Visible rewards: clothes on the avatar, a bike (moves faster), a falcon (big goal)
```
Teaching theme shown in the UI: **اصرف • ادّخر • تصدّق**

### 2.2 Economy rules (all numbers live in JSON)
- Currency is **ر.ق** with a coin icon. Kid-sized numbers: jobs pay 10–25 per shift, candy costs 5, the bike 300, the falcon 1000.
- **Wallet cap is 100 ر.ق**. A full wallet shows the toast «محفظتك ممتلئة، أودِع في المصرف». This is the main reason to visit the bank.
- **Energy**: 3 shifts per day. A day is about 5 minutes of play, and the day-end card shows earned, saved, spent and given.
- **Savings goal (هدفي)**: the kid picks an item, and a progress ring stays on the HUD.
- **4-digit PIN (الرمز السري)** is set when opening the account and used at the ATM. Tip shown: «لا تخبر أحداً برمزك السري».
- **Bank card (بطاقة مصرفية)** is unlocked after 3 deposits. Card payments come straight from the bank balance, which teaches the difference between cash and card.
- **Charity box (صندوق الخير)** sits at the bank. Giving earns badges.
- **Islamic-finance safe**: no interest (فائدة) and no percentage returns. Saving is rewarded with badges and a gift when a goal is reached. Any Mudarabah/profit-sharing explanation should be written by QIB's own content team.
- **No gambling mechanics**: no loot boxes, spin-wheels or random money rewards.

### 2.3 Jobs (3 templates → 6 jobs, data-driven)
| الوظيفة | المكان | Template | Pay |
|---|---|---|---|
| خبّاز | المخبز (خبز رقاق، خبز تنور، زعتر، جبن، بيض) | assemble | 15 |
| بائع كرك | كشك الكرك (كرك، جباتي، هيل، زعفران) | assemble | 12 |
| عامل في البقالة | البقالة (sort items to shelves) | sort | 15 |
| بائع سمك | سوق السمك at the Corniche | sort | 18 |
| موظف توصيل | across the town | deliver | 20 |
| مرشد سياحي | سوق واقف → landmarks | deliver | 22 |
| *(later)* غوّاص لؤلؤ | dhow at the Corniche | timing (new template) | 25 |

- **assemble**: a customer bubble shows 2–4 icons, and the kid taps ingredients in order.
- **sort**: items slide in, and the kid drags each one to the correct bin or shelf.
- **deliver**: 3D. Pick up at POI A, then a compass arrow guides to POI B against a timer.
- Every job gives 0–3 stars, and pay = base × stars.

### 2.4 Stores
| المتجر | Items (examples) |
|---|---|
| محل الحلويات | آيسكريم، حلاوة، عصير (5–10) |
| محل الألعاب | كرة، طائرة ورقية، سيارة لعبة (20–60) |
| محل الملابس | غترة وعقال، ثوب، بخنق، جلابية، حذاء رياضي (30–120). These are worn on the avatar. |
| محل الدراجات | دراجة (300). Movement speed goes from 4 to 7 m/s. |
| سوق الصقور | صقر (1000). It perches on the avatar's arm and is the long-term goal. |

### 2.5 Town & Qatari landmarks
A small 3×3-block town (~120 m × 120 m) with a fixed ¾ top-down follow camera.

| Area | Content | Detail |
|---|---|---|
| Centre plaza | **مصرف قطر الإسلامي** branch (hub) + 3 ATMs around town | Full, interactive |
| West | **سوق واقف** district: mud-plaster walls, wooden beams, lanterns. It holds the stores, سوق الصقور and the karak stall. | Full, interactive |
| North | **الكورنيش**: water, palms, **مراكب الداو**, fish market | Full |
| Skyline across the bay | **برج الدوحة**، **متحف الفن الإسلامي**، **برج الشعلة (أسباير)** | Backdrop only (SKY_*, very low poly, unlit) |
| Later | المتحف الوطني (وردة الصحراء)، استاد لوسيل، أبراج الحمام في كتارا، قلعة الزبارة | Backdrop |

Palette: sand and beige, white, Qatar maroon, turquoise sea, palm green, warm golden-hour light.

### 2.6 Culture & compliance checklist
- [ ] **Get QIB's written approval** for the name, logo and colours, and their brand kit. Until then use the placeholder «المصرف».
- [ ] No فائدة/interest wording. No gambling or random money rewards.
- [ ] Modest avatar and NPC clothing: ثوب/غترة/عقال for boys, جلابية/بخنق for girls.
- [ ] No Quran or Adhan audio as game sound. Mosques appear as scenery only.
- [ ] The Qatar flag appears only on poles, never on the ground or on props.
- [ ] Kids' privacy: no ads, no analytics SDKs, no accounts, nothing online, everything saved on the device. This fits Google Play Families, the App Store Kids category and Qatar PDPPL.
- [ ] Simple Modern Standard Arabic with light Qatari greetings (حيّاك، مشكور، يالله). A native speaker reviews `data/ar.json`.

---

## 3. Tech stack (deliberately tiny)
- **Vite + plain JavaScript (ES modules)**. No TypeScript, React or UI/physics libraries.
- **three** (pin the exact version at Phase 1) using `three/webgpu` → `WebGPURenderer` (falls back to WebGL2 automatically) and **TSL** for every custom shader.
- `vite-plugin-pwa` for offline use and install. Capacitor is optional later for store builds.
- Tests: `node --test` for the economy only.

```
index.html               lang="ar" dir="rtl", canvas + #ui overlay
src/main.js              boot, renderer, loop, pause
src/quality.js           tiers + dynamic resolution
src/camera.js input.js player.js bus.js economy.js save.js audio.js
src/world/town.js fx.js light.js
src/ui/                  screens (bank, atm, store, inventory, settings), hud, base.css
src/jobs/                runner + assemble.js sort.js deliver.js
data/                    ar.json items.json stores.json jobs.json quests.json
public/assets/           town.glb props.glb lightmap.ktx2 palette.png
public/audio/ fonts/ icons/ brand/
art/                     town.blend (yours)   tools/ bake.py landmarks.py
```

---

## 4. Rendering & performance plan

### 4.1 Reality check on WebGPU
WebGPU on Android Chrome needs Android 12+ and mostly Qualcomm or ARM GPUs. iOS has it from Safari 26. **Most low-end Android phones will run the WebGL2 fallback, so that is the baseline you design for.** WebGPU is a bonus. **Gate 1** (§9) tests this on real phones before any content is built.

### 4.2 Lighting = 100% baked, zero realtime lights
- **Static town**: `MeshBasicNodeMaterial`, colour = palette texture (uv0) × baked lightmap (uv1) × an intensity uniform. No light calculations at runtime.
- **Dynamic objects** (player, NPCs, instanced palms): a TSL "fake sun" (N·L using the same sun direction as the bake, plus ambient) in `src/world/light.js`. The scene has no light objects.
- **Shadows**: baked into the lightmap. Palms and props are placed as bake-only proxies during the bake, so their shadows stay on the ground even after they are instanced at runtime. Characters use a **blob shadow** quad.
- Fixed golden-hour lighting. A day/night cycle is out of scope; at most a sky/fog tint.

### 4.3 Quality tiers (`src/quality.js`)
| | low | mid | high |
|---|---|---|---|
| Pixel ratio | 0.6–1.0 dynamic | 1.0–1.25 | ≤1.5 |
| FPS cap | 30 | 60 | 60 |
| Post | none (direct render) | 1 pass: colour grade + vignette | + half-res bloom on emissives |
| Particles | 20 | 60 | 150 |
| Wind | palms | palms + flags | + lanterns/foliage |
| Water waves | off | on | on |
| AA | off | off | FXAA |

The starting tier comes from the backend, `deviceMemory` and `hardwareConcurrency`. Every 2 s the average frame time adjusts the pixel ratio. A `?tier=` URL override and a settings toggle are available.

### 4.4 Budgets (check with `?debug`)
- ≤ 60 draw calls, ≤ 80k visible triangles.
- The town uses 2 textures: palette (256²) and lightmap (2048², KTX2).
- Initial download ≤ 6 MB, with audio loaded after start.
- No per-frame allocations. Animation runs on the GPU (TSL `time`), not in CPU loops.
- The renderer pauses while a full-screen UI or job is open and when the tab is hidden.
- `renderer.compileAsync(scene, camera)` runs during loading so shaders don't stutter on first view.

### 4.5 FX (all cheap, tier-gated)
- **Wind**: vertex sway with a height mask and a per-instance phase for palms; flags wave by uv.x.
- **Particles**: one instanced billboard system driven by time + seed in the shader. It covers falling leaves near trees, drifting sand dust, and steam at the bakery and karak stall.
- **Coin burst**: 16 pooled sprites, played on earn and deposit.
- **Water**: unlit, with a scrolling tiny-noise colour, sparkles, and vertex waves on mid/high.
- **POI markers**: bouncing icon sprites (CanvasTexture).
- **Sky**: a gradient dome plus fog of the same colour, which hides the far edge.

---

## 5. Asset pipeline (you do the art, Claude writes the scripts once)

### 5.1 Blender naming conventions (the runtime reads these, so new content needs no code changes)
| Prefix | Meaning |
|---|---|
| `COL_*` | invisible box colliders (bounds are read, then removed) |
| `POI_<id>` | empties marking interaction points: `POI_bank`, `POI_atm_1`, `POI_bakery`, `POI_store_toys`… ids match `data/*.json` |
| `INST_<prefab>_*` | empties where the runtime places instanced props from `props.glb` (palms, lamps, benches, cars) |
| `FX_wind_*` `FX_flag_*` `FX_water` | meshes that get special TSL materials |
| `SKY_*` | skyline backdrop: unlit, no lightmap |
| `SIGN_<id>` | sign panels that get Arabic text drawn at runtime |
| collection `BakeOnly` | shadow proxies, baked but not exported |
| everything else | static, baked, merged per ~30 m chunk |

### 5.2 Steps
1. Kit-bash the town in `art/town.blend` from CC0 kits. Recolour them to the sandy palette by editing the shared palette texture.
2. Optional: `blender -b art/town.blend -P tools/landmarks.py` generates low-poly landmarks from primitives.
3. Bake: `blender -b art/town.blend -P tools/bake.py` → `art/out/town.glb` + `lightmap.png`.
4. `npm run assets` → meshopt + KTX2 → `public/assets/`.

### 5.3 Arabic text in 3D
Never use TextGeometry, because it can't shape Arabic. Draw signs with Canvas2D (`ctx.direction = 'rtl'`, after `document.fonts.load`) into a CanvasTexture. The browser shapes Arabic correctly.

---

## 6. UI / Arabic
- HTML overlay with `dir="rtl"`, CSS logical properties, and arrows/progress bars mirrored.
- **Controls are not mirrored**: joystick bottom-left, big action button bottom-right. Confirm with kid testing.
- Font: **Baloo Bhaijaan 2** (OFL, playful Arabic), self-hosted as a subset woff2 (~80 KB).
- Numbers use `Intl.NumberFormat('ar-QA')` → ١٢٣ by default. A setting switches to `'ar-QA-u-nu-latn'` → 123.
- Kid style: chunky rounded buttons (≥64 px), CSS-only gradients and shadows, press-scale animation, SVG icons, coin-fly-to-wallet animation. Amounts are entered with chips (+١ +٥ +١٠ +٥٠ الكل) instead of a keyboard.
- Screens: loading, avatar choice, HUD, bank (account opening, إيداع، سحب، رصيدي، هدفي، كشف الحساب، صندوق الخير), ATM, store, inventory/dress-up, job intro/result, day summary, settings.
- Landscape, `touch-action: none`, no double-tap zoom, safe-area insets.

## 7. Audio
- A tiny WebAudio manager that unlocks on first touch (needed on iOS). All SFX are in **one sprite file** (mp3, 64–96 kbps) plus a JSON of offsets.
- SFX: tap, coin, deposit (cha-ching), ATM beeps + bills, buy, soft error, star, job start/end, footsteps.
- Ambience zones that crossfade by distance: souq chatter, waves and seagulls at the Corniche. A light Khaleeji/oud music loop with its own toggle.
- `navigator.vibrate(10)` on coin and buy (Android only).
- Optional: ~20 tutorial voice lines recorded by a native Qatari speaker. This helps a lot for young readers.

### Data file shapes (you edit these)
```json
// data/items.json
[{ "id": "ghutra", "name": "غترة وعقال", "price": 40, "store": "clothes", "slot": "head", "icon": "ghutra.svg" }]
// data/jobs.json
[{ "id": "bakery", "name": "خبّاز", "poi": "bakery", "template": "assemble", "pay": 15, "unlockDay": 1,
   "ingredients": ["dough", "zaatar", "cheese", "egg"], "recipes": [["dough","zaatar"], ["dough","cheese","egg"]] }]
// data/ar.json
{ "bank.deposit": "إيداع", "bank.withdraw": "سحب", "err.NO_CASH": "ليس معك نقود كافية، اذهب إلى الصراف الآلي" }
```

---

## 8. Phases & copy-paste prompts

| # | Phase | Who | Model |
|---|---|---|---|
| 0 | Gather assets & install tools (§10) | You | — |
| 1 | Scaffold, renderer, tiers | Claude | Sonnet |
| G1 | **Device gate** (§9) | You | — |
| A | Blender scripts | Claude | Sonnet |
| A′ | Build the town in Blender, bake | You (in parallel with 2–6) | — |
| 2 | Town runtime (+ placeholder town) | Claude | Sonnet |
| 3 | Player & controls | Claude | Sonnet |
| 4 | Economy + save + tests | Claude | Haiku/Sonnet |
| 5 | UI: HUD, bank, ATM, stores | Claude | Sonnet |
| 6 | Jobs | Claude | Sonnet |
| — | **MVP playable: test with real kids now** | You | — |
| 7 | FX & post | Claude | Sonnet (Opus if TSL fights) |
| 8 | Audio | Claude | Haiku/Sonnet |
| 9 | Tutorial, progression, NPCs | Claude | Sonnet |
| 10 | Perf + PWA + release build | Claude | Sonnet |

### Phase 1 — Scaffold
```
Phase 1 per CLAUDE.md. Scaffold Vite + plain JS; deps: three (pin exact latest), dev: vite, vite-plugin-pwa. git init + .gitignore.
- index.html: lang="ar" dir="rtl", viewport no-zoom + viewport-fit=cover, full-screen canvas, #ui overlay, Arabic loading screen with progress bar.
- src/main.js: WebGPURenderer from 'three/webgpu', await init() (auto WebGL2 fallback), loop via renderer.setAnimationLoop; pause when document.hidden; export setRenderPaused(bool).
- src/quality.js: tiers low/mid/high from backend.isWebGPUBackend, navigator.deviceMemory, hardwareConcurrency. Dynamic pixel ratio every 2s (avg frame > target*1.15 → -0.15 down to 0.6; < target*0.7 → +0.1 up to tier max). 30fps cap on low. Persist tier in localStorage; ?tier= override; ?debug shows backend/fps/dpr/draw calls/tris.
- src/camera.js: fixed 3/4 top-down follow rig, smooth damping, follows a target Object3D.
- src/bus.js: tiny EventTarget event bus.
- Test scene: ground + 50 instanced boxes + one moving box the camera follows.
- src/ui/base.css: RTL base, CSS color variables, @font-face 'Baloo Bhaijaan 2' from /fonts/BalooBhaijaan2.woff2.
- npm scripts: dev (vite --host), build, preview, test (node --test).
Run npm i and npm run build once at the end. Reply in ≤5 lines.
```

### Phase A — Blender scripts
```
Phase A per CLAUDE.md. Write Blender 4.2+ Python scripts (headless: blender -b art/town.blend -P <script>):
1) tools/bake.py: work on duplicates. Static = visible meshes not prefixed COL_/POI_/INST_/FX_/SKY_/SIGN_ and not in collection BakeOnly (BakeOnly is included in the bake, excluded from export). Join static meshes per 30m grid chunk; add UV map 'Lightmap' via Lightmap Pack into ONE shared 2048 atlas (margin 0.01). Cycles, GPU if available, 128 samples, denoise; bake DIFFUSE with Direct+Indirect only (no Color) to art/out/lightmap.png. Export art/out/town.glb: +Y up, apply modifiers, both UV maps, empties kept with names, no lights/cameras, exclude BakeOnly. Print a summary.
2) tools/landmarks.py: create collection 'Landmarks' with simplified low-poly (≤1500 tris each) models from primitives, UV'd to palette swatches (swatch UV constants at file top): Doha Tower (cylinder with domed top), Museum of Islamic Art (stacked cubes, octagonal top), Aspire Torch (tapered tower + flame top), Souq Waqif shopfront module (mud box, protruding wooden beams, door), dhow boat, QIB branch (modern box, canopy, SIGN_bank panel), ATM kiosk (SIGN_atm panel). Name skyline pieces SKY_*.
3) package.json script "assets": gltf-transform optimize art/out/town.glb public/assets/town.glb with meshopt + ktx2, and join/flatten/simplify/instance disabled so node names survive (check --help for flag names); convert lightmap.png → public/assets/lightmap.ktx2 (UASTC) with the ktx CLI.
Don't run Blender. Reply in ≤5 lines.
```

### Phase 2 — Town runtime
```
Phase 2 per CLAUDE.md. Implement src/world/light.js and src/world/town.js.
- light.js: SUN_DIR constant + TSL function fakeSun(baseColor) = color*(ambient + max(dot(normalWorld,SUN_DIR),0)*k) for dynamic meshes.
- town.js: loadTown(renderer, scene, onProgress) → {colliders, pois, fx, signs}. GLTFLoader + MeshoptDecoder + KTX2Loader.detectSupport(renderer). Static meshes: MeshBasicNodeMaterial, colorNode = palette(uv0) * lightmap(uv1) * uniform intensity. COL_ → Box3 list, remove. POI_<id> → Map id→{pos, radius:2}. INST_<prefab>_* → one InstancedMesh per prefab from props.glb using fakeSun. FX_* → collected for fx.js. SKY_ → unlit, fog off. SIGN_<id> → CanvasTexture with Arabic text t('sign.<id>') drawn RTL after document.fonts.load.
- Gradient sky dome + matching fog.
- If public/assets/town.glb is missing, build a placeholder town in code (3x3 blocks of boxes, roads, water strip, ~10 palms, POIs: bank, atm_1, atm_2, bakery, karak, grocery, fish, store_sweets, store_toys, store_clothes, store_bikes, store_falcons, souq_center) so later phases work.
- renderer.compileAsync before hiding the loading screen. Wire into main.js and remove the Phase 1 test scene.
Build once. Reply in ≤5 lines.
```

### Phase 3 — Player
```
Phase 3 per CLAUDE.md. src/player.js + src/input.js.
- Procedural kid avatar (no skeleton, primitives only): capsule body, sphere head, accessory slots head/hand/ride. Presets: boy (white ثوب, غترة + عقال), girl (colored جلابية + بخنق). fakeSun shading. Procedural walk: bob, squash, lean; idle breathing. Blob shadow quad (radial gradient, depthWrite false).
- input.js: custom virtual joystick bottom-left (pointer events, multi-touch safe), tap-on-ground to walk (raycast ground plane), WASD for desktop.
- Movement 4 m/s (7 when bike equipped), circle-vs-AABB collision with sliding against town colliders.
- Inside a POI radius: big bouncing action button bottom-right with the POI icon; tap → bus 'interact' {poiId}.
- Camera follows the player.
Build once. Reply in ≤5 lines.
```

### Phase 4 — Economy & save
```
Phase 4 per CLAUDE.md. src/economy.js: pure logic, no DOM/three. State {wallet, bank, walletCap, account:{opened,pin,card}, goal, inventory[], equipped{}, tx[] (last 50: t, day, type, amount, ref), day, energy, badges[], given}. All functions return {ok, error?} with codes NO_CASH, WALLET_FULL, NO_BALANCE, BAD_PIN, NO_ENERGY, NO_ACCOUNT, LOCKED: openAccount(pin), earn(jobId, stars), deposit(n), withdraw(n, pin), buy(itemId, 'cash'|'card'), give(n), setGoal(itemId), equip(itemId), nextDay(). Card unlocks after 3 deposits. Data from data/items.json and data/jobs.json (create both with the sample content from the table below). No interest or percentage returns. Badges: first_deposit, saved_100, goal_reached, first_give, all_jobs. Emit bus events on every change.
src/save.js: localStorage JSON {v, state}, migrate(), autosave on every economy event and on visibilitychange, try/catch.
tests/economy.test.js covering every error code and the card unlock. Run npm test.
Sample content: jobs bakery 15, karak 12, grocery 15, fish 18, delivery 20, guide 22; items: ice_cream 5, halawa 8, ball 25, kite 40, ghutra 40, thobe 80, bukhnug 40, jalabiya 80, sneakers 120, bike 300, falcon 1000.
Reply in ≤5 lines.
```

### Phase 5 — UI, bank, ATM, stores
```
Phase 5 per CLAUDE.md. src/ui/: screen manager (one screen at a time; setRenderPaused(true) while open), HUD, screens. All text via t(key) from data/ar.json (create keys as needed), numbers via fmt(n) (Intl 'ar-QA', or 'ar-QA-u-nu-latn' per setting).
Kid style: chunky rounded buttons ≥64px, CSS-only gradients/shadows, press-scale animation, SVG icons from public/icons/<name>.svg with an inline fallback circle.
- HUD: wallet, bank balance, goal ring, energy, day, settings gear.
- Bank (poi bank): first visit = open account (pick 4-digit PIN on a big PIN pad + tip 'لا تخبر أحداً برمزك السري'); tabs إيداع / سحب / رصيدي / هدفي / كشف الحساب / صندوق الخير. Amounts via chips +1 +5 +10 +50 الكل. Logo public/brand/qib.svg if present, else text t('bank.name').
- ATM (poi atm_*): PIN pad → سحب / رصيدي only.
- Store (poi store_*): item grid from data/stores.json, price, buy with cash or card; errors as friendly toasts pointing to the fix (NO_CASH → go to ATM, WALLET_FULL → go to bank).
- Inventory/dress-up: equip head/hand/ride items → player accessory slots.
- Settings: music/sfx volume, digits style, quality tier.
- Toasts + coin fly-to-wallet CSS animation.
Build once. Reply in ≤5 lines.
```

### Phase 6 — Jobs
```
Phase 6 per CLAUDE.md. src/jobs/: runner + templates, configured by data/jobs.json, 45s each, stars 0–3 → economy.earn, energy -1.
- assemble.js (DOM): customer order bubble with 2–4 item icons; tap ingredients from a tray in order; right = coin pop, wrong = shake. Used by bakery, karak.
- sort.js (DOM): items slide in; drag each to 1 of 3 shelves/bins by category. Used by grocery, fish.
- deliver.js (3D, render not paused): pick up at POI A, world marker + HUD compass arrow to POI B, timer; stars by time. Used by delivery, guide.
Flow: intro card (icon, one short line, 'ابدأ') → countdown ٣ ٢ ١ → game → result card with stars and pay. Pause 3D render for DOM templates. Clean up all DOM/listeners on exit.
Build once. Reply in ≤5 lines.
```

### Phase 7 — FX & post
```
Phase 7 per CLAUDE.md. src/world/fx.js, all TSL and GPU-driven (no per-frame CPU loops except the coin pool), every effect gated by quality tier (see table in CLAUDE.md):
- wind sway for FX_wind_* and instanced palms (height mask, per-instance phase); FX_flag_* wave by uv.x.
- FX_water: unlit, scrolling tiny noise texture for color variation + sparkles; vertex waves on mid/high.
- particles: ONE InstancedMesh billboard system, positions from time+seed in the shader: falling leaves near palms, drifting sand dust, steam at bakery/karak POIs. Counts low 20 / mid 60 / high 150.
- coin burst: 16 pooled sprites on bus 'earn'/'deposit'.
- POI markers: bouncing icon sprites (CanvasTexture) above POIs.
- Post with three's TSL post-processing (check installed exports: PostProcessing or RenderPipeline): low = direct render; mid = one pass color grade + vignette; high = + half-res bloom. Switch live when tier changes.
Build once. Reply in ≤5 lines.
```

### Phase 8 — Audio
```
Phase 8 per CLAUDE.md. src/audio.js: tiny WebAudio manager; unlock on first pointerdown; one SFX sprite (public/audio/sfx.mp3 + sfx.json {name:[start,dur]}); music loop; ambience zones (souq near POI souq_center, sea near FX_water) with distance crossfade; master/music/sfx volumes from settings; suspend when hidden. Wire SFX to bus events: tap, coin, deposit, withdraw, buy, error, star, job_start, job_end, footstep (every 1.2 m walked). navigator.vibrate(10) on coin/buy when supported. Missing files must fail silently.
Build once. Reply in ≤5 lines.
```

### Phase 9 — Tutorial, progression, NPCs
```
Phase 9 per CLAUDE.md. 
- data/quests.json + src/quests.js: tutorial chain: work at bakery → deposit at bank → set a goal → withdraw at ATM → buy something. Guide arrow + pulsing highlight on the target POI/button; short Arabic line per step; optional voice file public/audio/vo/<questId>.mp3.
- Unlocks for jobs/stores by day or badge (fields in data JSON), locked POIs show a lock icon + toast.
- Day end after 5 min or when energy is 0 and the player confirms: summary card (كسبت، ادّخرت، صرفت، تصدّقت) → nextDay().
- 8 ambient NPCs using the player avatar builder with random outfits, walking loops along POI_path_* empties (fallback: between POIs), simple avoidance not needed.
Build once. Reply in ≤5 lines.
```

### Phase 10 — Perf, PWA, release
```
Phase 10 per CLAUDE.md. Release pass only:
- vite-plugin-pwa: precache app + assets, manifest (lang ar, dir rtl, orientation landscape, icons public/icons/app-192.png, app-512.png), offline works.
- Code-split jobs and audio; lazy-load audio after first interaction.
- Grep for per-frame allocations (new Vector3/arrays inside update functions) and hoist them.
- Build and report bundle sizes vs budget (≤6 MB initial). List files >250 lines and any budget violations. No other refactors.
Reply in ≤10 lines.
```

---

## 9. Device gates & test matrix
- **Gate 1 (after Phase 1)**: open `http://<pc-ip>:5173/?debug` on:
  - a low-end Android (Mali-G52 / PowerVR class, Android 11–13): expect WebGL2 and a steady 30 fps;
  - a mid Android (Adreno 6xx, Android 12+, Chrome): expect WebGPU at 60 fps;
  - an iPhone (iOS 26 Safari → WebGPU; older → WebGL2).
  - **If the WebGL2 fallback is clearly slow on low-end** (rare with this simple scene), stop and run one Opus session: "switch to WebGLRenderer, keep materials simple". Keeping all TSL inside `light.js` and `fx.js` makes that switch small.
- **After Phase 6**: play 15 min on the low-end phone. Check heat, battery and memory (Chrome remote debugging via USB / Safari Web Inspector).
- **Kid test**: watch 2–3 kids play without help. Fix confusing steps by editing `ar.json` and `quests.json` yourself before asking Claude.

## 10. Your shopping list (Phase 0, no Claude)
- **Tools**: Node LTS, git, Blender 4.2+ LTS, KTX-Software (`ktx`/`toktx` on PATH).
- **3D (CC0)**: Kenney kits (city/roads/commercial, food, furniture, nature), Quaternius nature packs. Prefer **one kit family** and one palette texture so everything matches.
- **UI/Icons (CC0)**: Kenney UI Pack + Game Icons, or simple custom SVGs.
- **Font**: Baloo Bhaijaan 2 (Google Fonts, OFL). Subset it to Arabic + digits (`pyftsubset`) → `public/fonts/BalooBhaijaan2.woff2`.
- **Audio**: Kenney Interface/Impact sounds (CC0), Freesound filtered to CC0 (souq crowd, waves, seagulls), and a licensed royalty-free Khaleeji/oud loop (or commission one). Pack the SFX into one sprite (e.g. `audiosprite`).
- **Brand**: the QIB logo SVG and brand guide, with written permission → `public/brand/qib.svg`.
- **Optional**: a native Qatari voice actor for ~20 tutorial lines.

## 11. Risks
| Risk | Mitigation |
|---|---|
| WebGL2 fallback is slow on very old GPUs | Gate 1 early. TSL stays isolated. The low tier draws no post-processing. |
| Shader-compile hitches | `compileAsync` during loading, and few distinct materials. |
| Arabic text renders wrong in 3D | Canvas2D signs only, drawn after the font has loaded. |
| iOS audio stays silent | Unlock the WebAudio context on the first touch. |
| Low-RAM phones crash | KTX2 textures, ≤2048 size, 2 town textures, audio loaded lazily. |
| Brand/legal | QIB approval before any public build. Placeholder until then. |
| Scope creep burns usage | MVP after Phase 6. Further content is added through JSON, not code. |
