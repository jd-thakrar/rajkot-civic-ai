# PROJECT_STATE.md — Constituency Intelligence Platform (RMC Edition)

> Read this file first, every session, before making any change.
> If this file and conversation memory conflict, flag it — don't silently pick one.

Last updated: 2026-07-07
Current phase: **Phase 1 complete — Scoring realignment DONE. Next: Jest tests → Supabase migration.**

---

## Current Architecture

Working prototype exists, built with:

- `server.js` — Node/Express backend, integrated with Gemini 2.5 Flash API, deployed to Render
- `app.js`, `index.html`, `style.css` — vanilla JS frontend, Leaflet map, NIC-government-style UI
- `mockData.js` — **mocked** ward demographics for all 18 RMC wards (all fields: population,
  bplPercentage, schoolAvgTravelDistance, waterQualityIndex, waterSupplyHours, healthCenterDistance,
  vulnerabilityIndex, coords). Must not be mistaken for real data.
- `wardBoundaries.geojson` — hand-digitized polygons for RMC Wards 1-18. **Audited and verified:**
  coordinates match Rajkot's real bounding box (~[70.71,22.25] to [70.83,22.36]); adjacent wards
  share exact vertex pairs; no malformed or overlapping geometry found. Labeled honestly as
  hand-digitized for demo purposes.
- `suggestions.json` — flat-file local "database" for citizen grievance submissions (real user data)
- `.env` — secrets, not tracked in git

---

## Completed Features

None yet pass the full Definition of Done (real data + tested edge cases + error handling +
explainable + documented + demonstrated). Current features are prototype-stage:

- [x] Citizen submission ingestion via Gemini classification/translation (working; data behind it is mocked)
- [x] Ward map rendering via Leaflet + circular overlays (18 wards, working)
- [x] Ward details panel below map (UX fix applied)
- [x] AI Copilot / Proposal Generator (Gemini, working)
- [x] Live Citizen Grievance Feed (scrollable table, text-wrap fixed)
- [x] AI Priority Table (scrollable, sticky headers)
- [x] **4-factor computeScore() — FULLY IMPLEMENTED (verified 2026-07-07)**
- [x] 4 frontend weight sliders (Demand 30 / Urgency 30 / Data Gap 25 / Pop Helped 15)
- [x] `maxPopulation` computed dynamically (NOT hardcoded)
- [x] MASTER_PROMPT.md and PROJECT_STATE.md created
- [x] **Jest test suite — 11/11 tests passing (2026-07-07)**
  - Hand-calculated formula verification (RMC-13, solid_waste, 2 submissions)
  - Edge cases: unknown ward, zero submissions, demandScore cap, finalScore cap
  - Category-specific dataGapScore paths (water, health, unknown fallback)
  - Backward-compat alias checks (feedbackScore, infraScore, demoScore)
  - Run with: `$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest computeScore`

---

## Priority Scoring — Actual Current Implementation (verified against server.js)

**Function:** `computeScore(wardId, category, suggestions, weights)` — `server.js` ~lines 287–332
**Status: 4-factor formula is LIVE. Old 3-factor is deprecated. Aliases kept for compat only.**

| Factor | Weight | Formula |
|---|---|---|
| `demandScore` | 30% | `min((vol / w.population) * 200000, 100)` |
| `urgencyScore` | 30% | Average urgency weight: critical=100, high=70, medium=40, low=10 |
| `dataGapScore` | 25% | Category-specific infra gap (water: QI+hrs; health: distKm; drainage/SWM: QI+vuln; roads: vuln) |
| `populationHelpedScore` | 15% | `min((w.population / maxPop) * 100, 100)`; maxPop computed dynamically |

**⚠️ UNVALIDATED PLACEHOLDER — Demand Score Multiplier:**
The value `200,000` in `(vol / w.population) * 200,000` implies that a 0.05% complaint rate
(1 complaint per 2,000 residents) yields a score of 100. This was chosen as a reasonable
starting estimate, but **has not been validated against real RMC complaint-volume baselines**.
Must be recalibrated once real data.gov.in grievance data is pulled.

---

## Pending Features

- [ ] **Jest test suite** — at minimum 1 test for computeScore() with a hand-calculated example
- [ ] Supabase PostgreSQL migration (flat file → relational DB)
- [ ] Pull real data: data.gov.in RMC Grievance Details
### 2. Real Data Pipeline (Pending)
- **Authoritative Ward Assignment [NEW]:** Ward assignment is now strictly based on RMC's own official Area → Ward registry (`areaWardMapping.json`, containing ~1,700 real locality names), extracted directly from the official RMC Complaint Registration portal. This replaces the previous loosely-inferred GeoJSON intersection. `wardBoundaries.geojson` is now exclusively used for map rendering.
- Complaint volumes are still awaiting real data. Extensive web searches confirm that there is **no public RMC Grievance dataset** and **no Ward Wise Election Data dataset** for Rajkot available on `data.gov.in`.
- RMC handles grievances via their proprietary portal (`rmc.gov.in/ComplaintRegistration`) and the eNagar Gujarat portal, but they do not publish raw CSV/API dumps of complaint volumes on open data platforms.
- **Area Matching Limitation:** Area matching against `areaWardMapping.json` is strictly exact-normalized-string only (lowercase, whitespace trimmed). No fuzzy matching is used. Unmatched submissions fall to manual review (`wardId: null`) rather than being incorrectly guessed by the LLM.
- **Category Mapping:** The 30 official RMC departments have been mapped to our 6 core categories. Any department lacking a clear match (e.g., Transport, Tax, Town Planning) is routed to a catch-all `other` category (which defaults to a 50 `dataGapScore`).
  - *solid_waste:* SOLID WASTE MANAGEMENT, S. W. M. (VOKALA), CONSERVANCY (DEAD ANIMAL), ELECTRONIC WASTE
  - *water:* WATER WORKS(OUTDOOR), HAND PUMP BRANCH
  - *drainage:* DRAINAGE CHOCKUP/OVERFLOW, DRAINAGE MAINTENANCE
  - *roads:* BANDHKAM
  - *streetlights:* ROSHNI BRANCH
  - *health:* HEALTH BRANCH, URBAN MALERIYA, A.N.C.D., A.N.C.D. (DOG STERILIZATION), FOOD BRANCH
  - *other:* CITY BUS, TOWN PLANNING, TAX BRANCH, AVAS YOJANA, FIRE BRIGADE, etc. (24 unmapped departments total)
- **Next Steps Required:**
  1. Generate highly realistic synthetic baselines calibrated to Rajkot's known ward populations and Indian municipal averages to replace the unvalidated 2,000,000 multiplier until real volume data is secured.
- [ ] PostGIS spatial queries for ward-level aggregation
- [ ] GeoJSON polygon map — blocked by ward ID mismatch (see Known Bugs)

---

## Decisions Made

| Decision | Status | Date |
|---|---|---|
| Backend: Node/Express — locked, no FastAPI | Approved | 2026-07-06 |
| AI engine: Gemini 2.5 Flash — locked | Approved | 2026-07-06 |
| Database: Supabase PostgreSQL + PostGIS | Approved | 2026-07-06 |
| Ward boundaries: hand-digitized GeoJSON, labeled honestly | Approved | 2026-07-06 |
| Scoring formula: 4-factor 30/30/25/15 | Resolved and implemented | 2026-07-07 |
| Demand score multiplier 200,000 | Unvalidated placeholder — must recalibrate with real data | 2026-07-07 |
| No MERN migration until formally approved | Open | — |

---

## Known Bugs

- **Ward ID mismatch:** `wardBoundaries.geojson` uses `ward_1`–`ward_18` format; `mockData.js`
  and `suggestions.json` use `RMC-01`–`RMC-18`. Currently masked because the polygon renderer
  was reverted to circles. Will block a polygon-map implementation.

---

## Technical Debt

- `mockData.js` values are live in the prototype — do not present as real data
- `suggestions.json` has no concurrency handling, no relational querying — being migrated
- Backward-compat aliases (`feedbackScore`, `infraScore`, `demoScore`) in computeScore() return
  value — remove after frontend fully updated
- No test suite yet (Jest not installed)
- `LocalDevelopmentPlans` in mockData.js is an empty array; all plans are hardcoded in server.js
  lines ~346–370 — illustrative only, not real RMC project plans

---

## Dataset Status

| Source | Live API? | Format | Granularity | Verdict |
|---|---|---|---|---|
| mockData.js | Static/Mock | JS object | Ward-level | ❌ MOCK — replace with real data |
| suggestions.json | Static flat file | JSON | Per-submission | ⚠️ Real submissions, migrating to Supabase |
| wardBoundaries.geojson | Static | GeoJSON | Ward polygon | ✅ Hand-digitized, audited, verified |
| data.gov.in — RMC Grievance Details | Catalog confirmed; API not yet tested | Unknown | Ward/dept/zone | **Highest priority — pull and assess next** |
| data.gov.in — RMC Ward Election Data | CSV download only, no live API | CSV | Ward level | Usable as population proxy, labeled 2018 |
| Census 2011 Rajkot | Static reference | Web table | Ward/town level | Usable as 2011 baseline, must be labeled |

---

## API Keys / Credentials Required

- `GEMINI_API_KEY` — Google Gemini 2.5 Flash (free tier), stored in `.env`
- Supabase project (URL + anon/service keys) — not yet set up

---

## Next Phase

**Immediate: Jest test (blocking)**
- Install Jest with ESM support
- Write `computeScore.test.js` with at least 1 hand-calculated example
- Run and confirm passing

**Then: Real Data Pull**
- Fetch data.gov.in RMC Grievance Details — report actual schema
- Assess fit against `suggestions` table schema
- Execute Supabase migration (wards + suggestions tables)
- Swap mockData.js fields for real data where confirmed


---

## Current Architecture

Working prototype exists, built with:

- `server.js` — Node/Express backend, integrated with Gemini API,
  deployed to Render
- `app.js`, `index.html`, `style.css` — vanilla JS frontend, Leaflet map,
  NIC-government-style UI
- `mockData.js` — **mocked** ward demographics for all 18 RMC wards
  (population, bplPercentage, schoolAvgTravelDistance, waterQualityIndex,
  waterSupplyHours, healthCenterDistance, vulnerabilityIndex, coords)
- `wardBoundaries.geojson` — hand-digitized polygons for RMC Wards 1-18.
  **Audited and verified:** coordinates match Rajkot's real bounding box
  (~[70.71,22.25] to [70.83,22.36]); adjacent wards share exact vertex
  pairs; no malformed or overlapping geometry found.
- `suggestions.json` — flat-file local "database" for citizen grievance
  submissions (auto-generated)
- `.env` — secrets, not tracked in git

A `computeScore(wardId, category)` function already exists in
`server.js` (~lines 302-318), combining `feedbackScore`, `infraScore`,
and `demoScore` with a 40/40/20 default weighting, adjustable via
frontend sliders. **This does not yet match the target Priority Scoring
Formula — see Pending Decisions below.**

## Completed Features

None yet pass the full Definition of Done checklist (real data + tested

- edge cases + error handling + explainable + documented + demonstrated).
  Current features are prototype-stage:

* Citizen submission ingestion via Gemini (working, but data behind it
  is mocked)
* Ward map rendering via Leaflet + wardBoundaries.geojson (working, real
  boundary shapes)
* Basic scoring calculation (working, but formula not yet reconciled
  with target methodology)

## Pending Features

- Real RMC/Gujarat data replacing `mockData.js`
- Supabase Postgres + PostGIS migration (replacing `suggestions.json`)
- Reconciled Priority Scoring Formula (see below)
- Full Definition-of-Done pass on every existing feature once real data
  is wired in

## Decisions Made

| Decision                                                                                        | Status                                                                                                                      |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Backend stays Node/Express (not FastAPI)                                                        | **Approved** — server.js already working, deployed; rewriting for stack purity wastes hackathon time for no functional gain |
| AI engine: Gemini 2.5 Flash (not 1.5, not custom model, not self-hosted LLM)                    | **Approved**                                                                                                                |
| Database: Supabase PostgreSQL + PostGIS (not flat files, not BigQuery-style warehouse)          | **Approved**                                                                                                                |
| Ward boundaries: keep hand-digitized wardBoundaries.geojson, labeled honestly as hand-digitized | **Approved** — official free source not yet confirmed                                                                       |
| Use real RMC data, don't abandon this direction despite fragmentation                           | **Approved**                                                                                                                |
| Scoring formula weights: 30/30/25/15 target vs. current 40/40/20 in code                        | **Resolved** — 40/40/20 was drift; target 30/30/25/15 is proposed for alignment.                                            |
| Whether `demoScore` = "Population Helped" or an equity/vulnerability factor                     | **Resolved** — currently equity/vulnerability weighting; target requires a separate "Population Helped" metric.              |
| Whether `urgency` field is actually used anywhere in scoring                                    | **Resolved** — verified not used; must be incorporated into target formula.                                                |
| MP-framing vs. municipal-corporation framing of the whole platform                              | **Open — leaning toward keeping MP framing, using RMC ward data aggregated up, but not formally locked**                    |

## Why Those Decisions Were Made

- **Node/Express over FastAPI:** working, deployed code beats a
  from-scratch rewrite under time pressure. If GeoPandas-heavy spatial
  work is needed later, it runs as an offline one-time script, not a
  live competing service.
- **Gemini 2.5 Flash over alternatives:** free-tier eligible (1,500
  RPD/15 RPM/1M TPM), multimodal, actively maintained — no evidence yet
  that a custom or self-hosted model would outperform it, and building
  one without that evidence is a bigger accuracy risk, not a smaller one.
- **Keep RMC data despite fragmentation:** real data.gov.in Grievance
  Details, ward election, and Census sources were confirmed to actually
  exist on search — the earlier assumption that "there's no proper ward
  data" was incorrect. At nationwide competition scale, demonstrating
  even one real verified dataset with honest scoring is a stronger
  differentiator than more features running on mock data.

## Known Bugs

None logged yet — no formal testing pass has been done.

## Technical Debt

- `mockData.js` values are currently live in the working prototype and
  must not be mistaken for real data by anyone reviewing the demo before
  the real-data migration is complete.
- `suggestions.json` as a flat file has no concurrency handling, no
  querying, no relational link to ward boundaries — actively being
  migrated away from.
- `computeScore()` formula naming (`feedbackScore`/`infraScore`/
  `demoScore`) doesn't match the documented target formula naming
  (Demand/Urgency/Data Gap/Population Helped) — creates a
  documentation-vs-code mismatch until reconciled.

## Dataset Status

| Source                                               | Live API?                                                                 | Format                                           | Granularity                             | Verdict                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------- |
| data.gov.in — RMC Grievance Details                  | Catalog confirmed to exist; live API access not yet tested                | Unconfirmed (likely CSV/XLS download)            | Ward-wise, zone-wise, department-wise   | **Highest priority — pull and assess schema next**               |
| data.gov.in — Ward Wise Election Data (Rajkot, 2018) | Catalog confirmed; "API for this resource does not exist" per source page | CSV/download, no live API                        | Ward name/number/zone/registered voters | Usable as population proxy — dated 2018, must be labeled as such |
| Census 2011 Rajkot ward/town list                    | Static reference site                                                     | Web table/download                               | Ward/town level                         | Usable as dated baseline — must be labeled as 2011 figures       |
| RMC GIS portal (gis.rmc.gov.in)                      | Live portal exists                                                        | Unknown — accessibility/exportability not tested | Property/ward/utility level             | Pending — check if any data is exportable                        |
| Commercial GIS vendors (e.g. GISMAP IN)              | N/A                                                                       | SHP/KML/GeoJSON                                  | Ward level                              | Likely paid — do not use unless confirmed free                   |

## API Keys / Credentials Required

- Google Gemini API key (free tier)
- Supabase project (URL + anon/service keys) — not yet set up
- Render deployment credentials (already in use for current server.js deployment)

_(This tracks which services need credentials, never the key values.)_

## Open Reconciliation Item

The scoring formula was reconciled via code review on 2026-07-07:

1. **Urgency Field:** Confirmed that the `urgency` field from `suggestions.json` is not read or used anywhere inside `feedbackScore`, `infraScore`, or `demoScore` in `computeScore()`.
2. **Demo Score Purpose:** Confirmed that `demoScore` represents an equity/vulnerability weighting (`w.bpl * 1.5 + w.vulnIndex * 55`) rather than "Population Helped."
3. **Default Weights Source:** Confirmed that the 40/40/20 default weights are defined inline as a request destructuring default (`const { weights = { feedback: 0.4, infra: 0.4, demo: 0.2 } } = req.body`) in `server.js` and represent drift from the target 30/30/25/15 formula.

### Proposed Scoring Formula Realignment:
To align with the target formula- **Demand**: 30% — Volume of citizen complaints normalized to ward population (Capped at 100).
  > *Note: The 2,000,000 multiplier is calibrated for demo-scale submission volumes (1-10 complaints). At real-world deployment scale, this would need recalibration — e.g., percentile-based normalization or a rolling time-window (complaints per month) instead of a raw threshold — to avoid saturating every category to max demand once real citizen adoption grows.*, we propose updating `computeScore()` as follows:
- **Demand Score (30%)**: Dynamic/normalized grievance volume: `Math.min((vol / w.population) * 200000, 100)`.
- **Urgency Score (30%)**: Average urgency weight of complaints in the ward/category (`critical` = 100, `high` = 70, `medium` = 40, `low` = 10). If no complaints exist, defaults to 0.
- **Data Gap Score (25%)**: Replaces `infraScore`, calculating category-specific infrastructure gaps.
- **Population Helped Score (15%)**: Ward population normalized against the max ward population in Rajkot: `(w.population / maxPopulation) * 100`.

## Next Phase

**Immediate: Scoring Formula Realignment Implementation**

- Goal: implement the proposed 4-factor scoring formula and update the frontend sliders/UI to match.
- Output: updated `computeScore()` in `server.js` and corresponding changes in `app.js` and `index.html` to support the new weights and sliders.
- Dependency: Plan approval.
- Approval needed: yes.

**After that: Real Data Pull**

- Goal: fetch the data.gov.in RMC Grievance Details catalog, report its
  actual schema, and assess fit against the `suggestions` table.
- Then: Supabase schema migration (wards + suggestions tables, as
  previously proposed), replacing mockData.js and suggestions.json.
