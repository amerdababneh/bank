# المدّخر الصغير — Prototype Plan (Stage 1, low-risk pitch build)

A small low-poly Doha town where a child **works → earns → walks into the bank → takes a queue ticket → opens an account → deposits → watches their savings jar fill → withdraws at the ATM → buys and wears something**.
Arabic-only, mobile-first, Three.js WebGPU with automatic WebGL2 fallback. **White-label**: the bank, its branding, the content and the town map all live in data files.

- **Budget:** about $2,000 (Stage 1), about 40–55 of your hours, 8 short Claude sessions.
- **Purpose:** prove that it's fun, that it runs on the client's real phones, and that the bank experience works, before anyone commits to production.
- **Production plan (Stage 2–3):** see [PLAN-FULL.md](PLAN-FULL.md).

> Claude only reads `CLAUDE.md` plus the phase prompt you paste (§6). Use one fresh session per phase.

---

## 1. Scope fence (put this list in the quote)

**Included**
- A small town (about 12×10 tiles), built from an editable text-grid map. It has the Corniche with a dhow, a skyline of simplified **برج الدوحة، متحف الفن الإسلامي، برج الشعلة**, a central bank plaza and a Souq Waqif-style street.
- **The bank, outside and inside** (§2).
- 2 jobs, both using one mini-game type: **المخبز** and **كشك الكرك**.
- 3 stores (sweets, toys, clothes). Clothes show on the avatar.
- Wallet with a cap, deposit, withdraw with a PIN, savings goal, statement, charity box, saving on the device.
- Arabic right-to-left UI in a playful kid style, and a boy/girl avatar in modest Qatari clothing.
- Light effects (palm wind, a waving flag, water, dust and steam, coin bursts), about 10 sound effects, 2 ambience loops.
- A guided demo path, a web link the player can install from the browser, and a short performance report from 3 phones.
- **1 revision round.**

**Not included (Stage 2–3)**
- App Store or Play Store release.
- Custom 3D models or Blender-baked lighting.
- Extra landmarks, jobs or stores.
- Music and voice-over.
- More revision rounds.
- Any server, accounts or analytics.

---

## 2. The bank experience (pitch centrepiece)

**Outside:** a modern branch on the central plaza, with a brand-colour canopy, the logo sign, a flagpole and an outdoor ATM. Walking into the door fades to the inside, a separate small scene so the phone renders very little.

**Inside (about 12 × 16 m lobby):**
| Element | What the child does / sees |
|---|---|
| Ticket machine (جهاز التذاكر) | Tap to get a number like «١٠٥». Teaches queuing. |
| Number display board | After about 3 s it calls «الرقم ١٠٥ ← الشبّاك ٢» with a *ding*. |
| 2 teller counters with staff in the bank's uniform | The bank screen opens here: open an account with a 4-digit PIN, then إيداع، سحب، رصيدي، هدفي، كشف الحساب. |
| **Savings jar «حصّالتي»** | A big glass jar whose coins fill as the bank balance grows. Coins fly from the counter into the jar after each deposit. |
| **Vault door** | Its wheel spins and the door swings open on the **first deposit**, with a badge. This is the "wow" moment. |
| Indoor ATM | PIN pad, then سحب or رصيدي. |
| Charity box (صندوق الخير) | Give coins, get a thank-you and a badge. Theme: اصرف • ادّخر • تصدّق. |
| Wall screen | Rotating saving tips, e.g. «ادّخر جزءاً من كل ريال تكسبه». |
| Waiting chairs, plants, 2 seated customers | Atmosphere. |

**Rules:** no interest (فائدة), no percentage returns and no random money rewards. Saving is rewarded with badges, the vault moment and reaching the goal.

---

## 3. Tech (lean, no Blender)
- **Vite + plain JS + three** (`three/webgpu`, TSL). Extra dependency: `vite-plugin-pwa` only.
- **Town from a text grid**: `data/town.json` is a grid of letters (each tile 8 m) and `data/tiles.json` maps each letter to a builder. You redesign the town by typing letters, not by coding:
  ```
  "map": [
    "SSSSSSSSSSSS",
    "~~~~~D~~~~~~",
    "CCCCCCCCCCCC",
    "P.RRRRRRRR.P",
    "hhR..BB..Rkk",
    "ysR..BB..Rtc",
    "P.RRRRRRRR.P"
  ]
  ```
  `S` skyline · `~` sea · `D` dhow · `C` Corniche · `R` road · `B` bank · `h` bakery · `k` karak · `y` sweets · `t` toys · `c` clothes · `s` souq shop · `P` palm
- **Models**: CC0 GLBs in `public/models/` (Kenney kits) are used when present. Otherwise primitives are drawn instead, so the prototype works with **zero art**.
- **Lighting**: a TSL "fake sun" on every material, with no realtime lights.
  - **mid/high:** one shadow map rendered **once** after loading, so shadows cost nothing per frame.
  - **low:** soft dark quads under buildings instead of shadows.
  - **Characters:** blob shadows.
- **Quality tiers** low/mid/high with dynamic resolution and a 30 fps cap on low. Post-processing: none on low, colour grade + vignette on mid/high.
- **White-label files**: `brand.json` (bank name, colours, logo), `ar.json` (all text), `town.json`, `tiles.json`, `items.json`, `stores.json`, `jobs.json`, `quests.json`. To reskin for another client, edit these and swap the logo.

---

## 4. Your work (no Claude), about 40–55 h total
| Task | Hours |
|---|---|
| Download CC0 assets: Kenney GLB kits (optional), Baloo Bhaijaan 2 font subset → `public/fonts/BalooBhaijaan2.woff2`, about 10 CC0 SFX + 2 ambience loops → `public/audio/`, logo SVG → `public/brand/logo.svg` | 4–6 |
| Run and check each phase on a phone, then commit | 12–16 |
| Test on 3 phones (cheap Android, mid Android, iPhone), write the performance report | 4–6 |
| Edit the content yourself (Arabic text, prices, the map) | 4–6 |
| Revision round | 6–8 |
| Pitch preparation and the meeting | 4–6 |
| Buffer | 6–8 |

---

## 5. Model per phase
| Phase | Model | Effort |
|---|---|---|
| P1 Foundation + town (TSL, renderer) | Opus | medium |
| P2 Player, controls, doors | Sonnet | medium |
| P3 Economy + save + tests | Haiku (or Sonnet low) | — |
| P4 UI shell + bank screens | Sonnet | medium |
| P5 Bank interior (3D) | Sonnet | medium |
| P6 Stores + jobs | Sonnet | medium |
| P7 FX, post, demo quest | Opus | medium |
| P8 Audio + PWA + release check | Sonnet | low |
| One-file tweaks | Haiku | — |
| A bug Sonnet has failed on twice | Opus | high |

**Gate after P1:** open `http://<pc-ip>:5173/?debug` on a cheap Android phone. If it doesn't hold a steady 30 fps, stop and fix that before building anything else.

---

## 6. Phase prompts (paste as-is, one fresh session each, commit after each)

### P1 — Foundation + town
```
Prototype P1 per CLAUDE.md. Scaffold Vite + plain JS; deps: three (pin exact latest); dev: vite, vite-plugin-pwa. git init + .gitignore.
- index.html: lang="ar" dir="rtl", no-zoom viewport + viewport-fit=cover, canvas, #ui overlay, Arabic loading screen with progress bar.
- src/main.js: WebGPURenderer from 'three/webgpu', await init() (auto WebGL2 fallback), setAnimationLoop, pause when hidden; export setRenderPaused(bool) and setActiveScene(scene, cameraPreset).
- src/quality.js: tiers low/mid/high from backend.isWebGPUBackend, deviceMemory, hardwareConcurrency; dynamic pixel ratio every 2s (0.6..tier max); 30fps cap on low; ?tier= override; ?debug overlay (backend, fps, dpr, draw calls, triangles).
- src/bus.js (EventTarget). src/camera.js: fixed 3/4 top-down follow rig with presets 'town' and 'interior'.
- src/world/light.js: SUN_DIR + TSL fakeSun(color) used by all materials. One DirectionalLight only for a shadow map rendered ONCE after load on mid/high (grep node_modules/three to confirm how WebGPU shadows honor autoUpdate/needsUpdate); low = no shadow map.
- src/world/town.js: build the town from data/town.json (ASCII grid, 8m tiles) + data/tiles.json (char → builder). Builders use public/models/<name>.glb if present (GLTFLoader + MeshoptDecoder), else primitive fallbacks: road, corniche, sea, dhow, palm, souq shop (mud box + wooden beams + awning), bank (modern box + brand-color canopy + logo sign + flagpole + outdoor ATM), bakery, karak stall, store, skyline (simplified Doha Tower, Museum of Islamic Art, Aspire Torch from primitives, far, unlit). Merge static geometry per material; palms/lamps as InstancedMesh. Export colliders (Box3) and POIs ({id, pos, radius}) from tile defs (bank_door, atm_out, bakery, karak, store_sweets, store_toys, store_clothes). Low tier: soft dark quads under buildings.
- Create data/town.json (≈12x10 map like the example in PLAN.md §3), data/tiles.json, data/brand.json {bankName:"مصرف قطر الإسلامي", short:"QIB", colors:{primary,secondary,accent}, logo:"/brand/logo.svg"}, data/ar.json.
- Signs: Canvas2D CanvasTexture (ctx.direction='rtl', after document.fonts.load), text via t(key).
- Gradient sky + matching fog; renderer.compileAsync before hiding the loader. Temporary slow orbit camera until P2.
- src/ui/base.css: RTL base, CSS vars set from brand colors, @font-face 'Baloo Bhaijaan 2' from /fonts/BalooBhaijaan2.woff2.
- npm scripts: dev (vite --host), build, preview, test (node --test).
Run npm i and npm run build once. Reply in ≤5 lines.
```

### P2 — Player, controls, doors
```
Prototype P2 per CLAUDE.md.
- src/player.js: if public/models/kid_boy.glb / kid_girl.glb exist (rigged, clips 'Idle' + 'Walk'), use them with AnimationMixer (crossfade by speed), apply fakeSun to their materials, and attach accessory GLBs (public/models/acc_<itemId>.glb) to the head/hand bones (find by name containing 'head' / 'hand', case-insensitive). Otherwise fall back to a procedural avatar (primitives, no skeleton): capsule body, sphere head, accessory slots head/hand, presets boy (white ثوب, غترة + عقال) and girl (جلابية + بخنق), 4 outfit colors each, procedural walk (bob, squash, lean) + idle breathing. Both: blob shadow quad (radial gradient, depthWrite false). NPCs always use the procedural avatar.
- src/input.js: custom virtual joystick bottom-left (pointer events, multi-touch safe), tap-on-ground to walk, WASD for desktop.
- Movement 4 m/s; circle-vs-AABB collision with sliding. Camera follows the player.
- POIs: inside radius show a big bouncing action button bottom-right with the POI icon; tap → bus 'interact' {poiId}.
- src/world/bank.js stub: empty 12x16m room with exit POI 'bank_exit' and a spawn point (P5 fills it). bank_door / bank_exit: 300ms CSS fade → setActiveScene() swap; both scenes stay in memory; player placed at the spawn.
- First-launch avatar pick screen (boy/girl + color), saved in localStorage.
Build once. Reply in ≤5 lines.
```

### P3 — Economy + save + tests
```
Prototype P3 per CLAUDE.md. src/economy.js: pure logic, no DOM/three. State {wallet, bank, walletCap:100, account:{opened,name,pin}, goal, inventory[], equipped{}, tx[] (last 30: t, day, type, amount, ref), day, energy:3, badges[], given, ticket}. Functions return {ok, error?} with codes NO_CASH, WALLET_FULL, NO_BALANCE, BAD_PIN, NO_ENERGY, NO_ACCOUNT: openAccount(name,pin), earn(jobId,stars), deposit(n), withdraw(n,pin), buy(itemId), give(n), setGoal(itemId), equip(itemId), nextDay(). No interest or % returns. Badges: first_deposit, saved_100, goal_reached, first_give. Emit bus events on every change.
Create data/jobs.json (bakery 15, karak 12), data/items.json (ice_cream 5, halawa 8, ball 25, kite 40, ghutra 40, bukhnug 40, thobe 80, jalabiya 80, sneakers 120), data/stores.json (sweets, toys, clothes) with Arabic names.
src/save.js: localStorage {v, state}, autosave on economy events + visibilitychange, try/catch; ?reset clears.
tests/economy.test.js covering every error code. Run npm test.
Reply in ≤5 lines.
```

### P4 — UI shell + bank screens
```
Prototype P4 per CLAUDE.md. src/ui/:
- Screen manager (one screen at a time; setRenderPaused(true) while a full-screen screen is open), HUD (wallet, bank balance, goal ring, energy, settings gear), toasts, coin-fly-to-wallet CSS animation.
- All text via t(key) from data/ar.json; numbers via fmt(n) with Intl 'ar-QA' or 'ar-QA-u-nu-latn' (setting).
- Kid style: chunky rounded buttons ≥64px, CSS-only gradients/shadows, press-scale; brand colors from CSS vars; logo /brand/logo.svg with text fallback.
- Bank screen (opened by bus 'interact' teller): first time = open account (name + 4-digit PIN on a big pad + tip «لا تخبر أحداً برمزك السري»); tabs إيداع، سحب، رصيدي، هدفي، كشف الحساب. Amount chips +١ +٥ +١٠ +٥٠ الكل (no keyboard). Goal tab picks an item from data/items.json.
- ATM screen (atm_out, atm_in): PIN pad → سحب / رصيدي only.
- Charity screen (charity): give with chips, thank-you + badge.
- Settings: sound on/off, digits style, quality tier.
- Errors as friendly toasts pointing to the fix (NO_CASH → «اذهب إلى الصراف الآلي», WALLET_FULL → «أودِع نقودك في المصرف»).
Build once. Reply in ≤5 lines.
```

### P5 — Bank interior (3D)
```
Prototype P5 per CLAUDE.md. Replace the stub in src/world/bank.js with the bank interior (primitives + optional public/models GLBs, colors/logo from data/brand.json, fakeSun shading, no shadow map):
- 12x16m lobby: glass entrance (bank_exit POI), polished floor, brand-color walls with logo panel, emissive ceiling light panels, plants, waiting chairs with 2 seated NPCs (player avatar builder, random outfits).
- Ticket machine (POI ticket) + number display board above counters (CanvasTexture «الرقم ١٠٥ ← الشبّاك ٢»).
- 2 teller counters with NPC tellers in brand-color uniform (POI teller).
- Indoor ATM (POI atm_in), charity box (POI charity).
- Savings jar «حصّالتي»: glass cylinder + InstancedMesh of up to 200 coins; visible count = min(200, bank/5); animated fill on change.
- Vault door behind the counters: wheel spins and door swings open on the first_deposit badge (bus event), stays open.
- Wall screen with rotating tips (CanvasTexture, keys tip.1..tip.5).
Flow: on enter toast «حيّاك في المصرف!» + guide arrow to the ticket machine → take ticket (bus 'ticket') → after 3s board calls the number (bus 'ding') → arrow to the free teller → teller opens the bank screen. Teller without a ticket → toast asking to take a ticket first. After a deposit, coins fly from the counter into the jar.
Build once. Reply in ≤5 lines.
```

### P6 — Stores + jobs
```
Prototype P6 per CLAUDE.md.
- Store screen for store_* POIs: grid from data/stores.json + items.json, price, buy with cash, error toasts as in P4.
- Inventory/dress-up screen: equip head/hand items → player accessory slots (ghutra, bukhnug, ball, kite…).
- src/jobs/: runner + assemble.js DOM template, 45s: customer bubble with 2–4 ingredient icons, tap ingredients in order; right = coin pop, wrong = shake. Intro card (icon, one short line, «ابدأ») → ٣ ٢ ١ → game → result card with 0–3 stars and pay → economy.earn. 3D render paused during the job; clean up DOM/listeners on exit.
- data/jobs.json recipes: bakery (خبز رقاق، خبز تنور، زعتر، جبن، بيض), karak (كرك، جباتي، هيل، زعفران).
- Energy 3/day; when 0 → day summary card (كسبت، ادّخرت، صرفت، تصدّقت) → nextDay().
Build once. Reply in ≤5 lines.
```

### P7 — FX, post, demo quest
```
Prototype P7 per CLAUDE.md.
- src/world/fx.js (TSL, GPU-driven, tier-gated): palm sway (height mask, per-instance phase), flag wave on the bank flagpole, sea scrolling color + sparkle, ONE instanced billboard particle system (dust in town, steam at bakery/karak; 20/60/150), coin burst pool (16 sprites) on 'earn'/'deposit', bouncing POI marker sprites.
- Post: low = direct render; mid/high = one pass color grade + vignette (three TSL post-processing; check installed exports PostProcessing or RenderPipeline).
- src/quests.js + data/quests.json guided demo: work at the bakery → enter the bank → take a ticket → open an account → deposit → set a goal → withdraw at the ATM → buy the ghutra/bukhnug → wear it. Guide arrow + pulsing highlight per step, short Arabic line per step.
- ?demo: start with 60 ر.ق and skip the avatar screen.
Build once. Reply in ≤5 lines.
```

### P8 — Audio + PWA + release check
```
Prototype P8 per CLAUDE.md.
- src/audio.js: tiny WebAudio manager, unlock on first pointerdown; SFX public/audio/<name>.mp3 (tap, coin, deposit, withdraw, buy, error, ticket, ding, star, vault) wired to bus events; one ambience loop per scene (town.mp3, bank.mp3) with crossfade on scene switch; mute setting; suspend when hidden; missing files fail silently. navigator.vibrate(10) on coin/buy.
- vite-plugin-pwa: offline precache, manifest (lang ar, dir rtl, landscape, icons public/icons/app-192.png, app-512.png).
- Grep update loops for per-frame allocations and hoist them. Build and report bundle size; list files >250 lines.
Reply in ≤8 lines.
```

---

## 7. Pitch

### 5-minute demo script (use `?demo` on a cheap Android phone)
1. Avatar pick, then walk through the souq. Point out the Arabic UI and the Qatari skyline.
2. Bakery job (45 s), and the wallet shows «ممتلئة».
3. Walk into the bank, take a ticket, the board calls your number, go to the teller.
4. Open an account with a PIN, then deposit. **Coins fly into the jar and the vault door opens.**
5. Set a goal, withdraw at the ATM, buy the ghutra and wear it.
6. Show the `?debug` overlay to prove the frame rate on a cheap phone.

### Success criteria (agree on these with the client up front)
- ≥30 fps on a cheap Android phone, ≥55 fps on a mid-range phone and an iPhone.
- First load under 10 s on 4G.
- A child aged 7–10 finishes the demo path in under 5 minutes without help.

### Pricing & terms
- **Stage 1, this prototype: $2,000 (about 7,300 QAR),** fully credited toward production if approved. 50% upfront, 50% on delivery.
- **Stage 2–3, production:** quoted after Stage 1, using the hours table in PLAN-FULL.md and your rate.
- The scope fence (§1) goes into the quote. Extra revisions or features are billed per hour.
- **License, don't sell the engine:** the client owns their branding and content, and you keep the engine so you can reuse it. Exclusivity or full ownership of the code costs extra.
- Optional monthly fee for hosting and seasonal content (Qatar National Day on 18 December, Ramadan).
- Content add-ons for later: a new job using the existing mini-game (about 4–8 h), a landmark (about 8–16 h), a seasonal event (about 20–40 h).
- Ask an accountant about withholding tax on cross-border payments.

### If they say "we'll build it internally with AI"
- "Yes, you could." Then:
  - A few weeks of an internal employee's time likely costs more than $2,000.
  - Bank IT teams are busy and rarely have game or mobile-graphics experience.
  - **This already runs on your phones today.**
  - It's a fixed price, so the risk stays with me.
- Show the AI-built prototype openly. Being fast with AI is your selling point, not something to hide.

### Brand note
Using QIB's name and look in a **private pitch to QIB** is normal. Don't share the link publicly or with other clients until QIB approves. For other clients, swap `brand.json` and the logo.

### White-label reuse (where the profit is)
Every client after the first costs about 10–15 h: new `brand.json` and logo, `ar.json` wording, a map tweak, prices. Target banks, Islamic finance institutions, schools and malls.
