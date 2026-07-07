/**
 * computeScore.test.js
 *
 * Jest test suite for the 4-factor priority scoring formula in server.js.
 * Stack: Node/Express + ESM. Run with:
 *   node --experimental-vm-modules node_modules/.bin/jest computeScore.test.js
 *
 * Formula being tested (all factors 0–100, weighted sum):
 *   demandScore          = min((vol / population) * 200_000, 100)
 *   urgencyScore         = average urgency weight of matching submissions
 *                          (critical=100, high=70, medium=40, low=10)
 *   dataGapScore         = category-specific infrastructure gap
 *   populationHelpedScore = min((population / maxPopulation) * 100, 100)
 *   finalScore           = min(demand*w1 + urgency*w2 + dataGap*w3 + popHelped*w4, 100)
 *
 * ⚠️ NOTE: The demand-score multiplier (2,000,000) is calibrated for a LIVE
 * ACTIVE DASHBOARD (where just 5 active complaints per 100k pop = 100 score).
 * See PROJECT_STATE.md → Priority Scoring section.
 */

import { computeScore, WARDS } from './server.js';

// ─── Shared test fixtures ─────────────────────────────────────────────────────
const DEFAULT_WEIGHTS = { demand: 0.30, urgency: 0.30, dataGap: 0.25, populationHelped: 0.15 };

// ─── Test 1: Core formula — hand-calculated against RMC-13, solid_waste ──────
describe('computeScore() — 4-factor formula', () => {
  test('hand-calculated example: RMC-13, solid_waste, 2 submissions (high + medium)', () => {
    /**
     * Ward RMC-13: Sardarnagar / Bhavnagar Road / Karanpara
     *   population   = 95,917  (largest ward = maxPopulation = 95,917)
     *   waterQI      = 55
     *   vulnIndex    = 0.72
     *
     * Submissions: 1 × high urgency, 1 × medium urgency
     *
     * Expected calculations (all values rounded per Math.round):
     *   demandScore          = min((2 / 95917) * 2000000, 100) = min(41.7, 100) = 42
     *   urgencyScore         = (70 + 40) / 2 = 55
     *   dataGapScore         = (100 - 55) * 0.6 + 0.72 * 40 = 27 + 28.8 = 55.8 → 56
     *   populationHelpedScore = min((95917 / 95917) * 100, 100) = 100
     *   finalScore           = min(42*0.30 + 55*0.30 + 56*0.25 + 100*0.15, 100)
     *                        = min(12.6 + 16.5 + 14.0 + 15.0, 100)
     *                        = min(58.1, 100) = 58
     */
    const mockSuggestions = [
      { wardId: 'RMC-13', category: 'solid_waste', urgency: 'high' },
      { wardId: 'RMC-13', category: 'solid_waste', urgency: 'medium' },
      // Red herring — different ward, should not count
      { wardId: 'RMC-01', category: 'solid_waste', urgency: 'critical' },
      // Red herring — same ward, different category
      { wardId: 'RMC-13', category: 'water', urgency: 'critical' },
    ];

    const result = computeScore('RMC-13', 'solid_waste', mockSuggestions, DEFAULT_WEIGHTS);

    expect(result.demandScore).toBe(42);
    expect(result.urgencyScore).toBe(55);
    expect(result.dataGapScore).toBe(56);
    expect(result.populationHelpedScore).toBe(100);
    expect(result.finalScore).toBe(58);
    expect(result.volume).toBe(2);
  });
});

// ─── Test 2: Unknown ward returns zeroed result ───────────────────────────────
describe('computeScore() — edge cases', () => {
  test('unknown wardId returns all-zero scores without throwing', () => {
    const result = computeScore('RMC-99', 'water', [], DEFAULT_WEIGHTS);
    expect(result.finalScore).toBe(0);
    expect(result.demandScore).toBe(0);
    expect(result.urgencyScore).toBe(0);
    expect(result.dataGapScore).toBe(0);
    expect(result.populationHelpedScore).toBe(0);
  });

  test('zero submissions yields zero demand and zero urgency scores', () => {
    const result = computeScore('RMC-01', 'water', [], DEFAULT_WEIGHTS);
    expect(result.demandScore).toBe(0);
    expect(result.urgencyScore).toBe(0);
    expect(result.volume).toBe(0);
    // dataGapScore and populationHelpedScore should still be non-zero (infra data exists)
    expect(result.dataGapScore).toBeGreaterThan(0);
    expect(result.populationHelpedScore).toBeGreaterThan(0);
  });

  test('demandScore is capped at 100 for extremely high volume', () => {
    const population = WARDS['RMC-01'].population; // 76,424
    // Generate enough submissions to exceed the cap (need vol > population/2 for 200k multiplier)
    const massiveSuggestions = Array.from({ length: 10000 }, () => ({
      wardId: 'RMC-01', category: 'water', urgency: 'medium'
    }));
    const result = computeScore('RMC-01', 'water', massiveSuggestions, DEFAULT_WEIGHTS);
    expect(result.demandScore).toBe(100);
  });

  test('finalScore is capped at 100 even with inflated inputs', () => {
    // All max urgency submissions to push finalScore toward overflow
    const allCritical = Array.from({ length: 500 }, () => ({
      wardId: 'RMC-13', category: 'health', urgency: 'critical'
    }));
    const result = computeScore('RMC-13', 'health', allCritical, DEFAULT_WEIGHTS);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(result.urgencyScore).toBe(100);
  });

  test('water category dataGapScore uses waterQI and waterHrs (not vulnIndex fallback)', () => {
    // RMC-13: waterQI=55, waterHrs=6
    // Expected dataGapScore = ((100-55)*0.5) + (((24-6)/24)*100*0.5) = 22.5 + 37.5 = 60
    const result = computeScore('RMC-13', 'water', [], DEFAULT_WEIGHTS);
    expect(result.dataGapScore).toBe(60);
  });

  test('health category dataGapScore uses healthDistKm (not fallback of 50)', () => {
    // RMC-04: healthDistKm=4.1, formula: min((4.1/8)*100, 100) = min(51.25, 100) = 51
    const result = computeScore('RMC-04', 'health', [], DEFAULT_WEIGHTS);
    expect(result.dataGapScore).toBe(51);
  });

  test('unknown category falls back to dataGapScore of 50', () => {
    const result = computeScore('RMC-01', 'education', [], DEFAULT_WEIGHTS);
    expect(result.dataGapScore).toBe(50);
  });
});

// ─── Test 3: Backward compatibility aliases ───────────────────────────────────
describe('computeScore() — backward compatibility aliases', () => {
  test('feedbackScore alias equals demandScore', () => {
    const result = computeScore('RMC-01', 'water', [], DEFAULT_WEIGHTS);
    expect(result.feedbackScore).toBe(result.demandScore);
  });

  test('infraScore alias equals dataGapScore', () => {
    const result = computeScore('RMC-01', 'water', [], DEFAULT_WEIGHTS);
    expect(result.infraScore).toBe(result.dataGapScore);
  });

  test('demoScore alias equals populationHelpedScore', () => {
    const result = computeScore('RMC-01', 'water', [], DEFAULT_WEIGHTS);
    expect(result.demoScore).toBe(result.populationHelpedScore);
  });
});
