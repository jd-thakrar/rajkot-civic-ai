import { WARDS, LOCAL_PLANS } from '../../shared/wards.js';

export { WARDS };

export function computeScore(wardId, category, suggestions, weights) {
  const w = WARDS[wardId];
  if (!w) {
    return {
      demandScore: 0, urgencyScore: 0, dataGapScore: 0, populationHelpedScore: 0,
      feedbackScore: 0, infraScore: 0, demoScore: 0, finalScore: 0, volume: 0
    };
  }

  const vol = suggestions.filter((s) => s.wardId === wardId && s.category === category).length;
  const demandScore = Math.min((vol / w.population) * 2000000, 100);

  const catSugs = suggestions.filter((s) => s.wardId === wardId && s.category === category);
  const urgencySum = catSugs.reduce((sum, s) => {
    const uWeights = { critical: 100, high: 70, medium: 40, low: 10 };
    return sum + (uWeights[s.urgency] || 40);
  }, 0);
  const urgencyScore = catSugs.length > 0 ? urgencySum / catSugs.length : 0;

  let dataGapScore = 0;
  if (category === 'water') {
    dataGapScore = ((100 - w.waterQI) * 0.5) + (((24 - w.waterHrs) / 24) * 100 * 0.5);
  } else if (category === 'health') {
    dataGapScore = Math.min((w.healthDistKm / 8) * 100, 100);
  } else if (category === 'drainage' || category === 'solid_waste') {
    dataGapScore = (100 - w.waterQI) * 0.6 + w.vulnIndex * 40;
  } else if (category === 'roads' || category === 'streetlights') {
    dataGapScore = w.vulnIndex * 100;
  } else {
    dataGapScore = 50;
  }

  const maxPopulation = Math.max(...Object.values(WARDS).map((ward) => ward.population));
  const populationHelpedScore = Math.min((w.population / maxPopulation) * 100, 100);

  const final = demandScore * weights.demand +
    urgencyScore * weights.urgency +
    dataGapScore * weights.dataGap +
    populationHelpedScore * weights.populationHelped;

  return {
    demandScore: Math.round(demandScore),
    urgencyScore: Math.round(urgencyScore),
    dataGapScore: Math.round(dataGapScore),
    populationHelpedScore: Math.round(populationHelpedScore),
    feedbackScore: Math.round(demandScore),
    infraScore: Math.round(dataGapScore),
    demoScore: Math.round(populationHelpedScore),
    finalScore: Math.round(Math.min(final, 100)),
    volume: vol
  };
}

export function buildPriorities(suggestions, weights) {
  const scored = LOCAL_PLANS.map((p) => ({
    ...p,
    scores: computeScore(p.wardId, p.category, suggestions, weights),
    wardName: WARDS[p.wardId]?.name,
    wardAreas: WARDS[p.wardId]?.areas
  }));

  for (const [wid] of Object.entries(WARDS)) {
    for (const cat of ['solid_waste', 'water', 'drainage', 'roads', 'streetlights', 'health']) {
      const hasPlan = LOCAL_PLANS.some((p) => p.wardId === wid && p.category === cat);
      if (!hasPlan) {
        const sc = computeScore(wid, cat, suggestions, weights);
        if (sc.finalScore > 45 || sc.volume > 0) {
          scored.push({
            id: `AI-${wid}-${cat.substring(0, 3).toUpperCase()}`,
            title: `[AI Gap] ${cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Infrastructure Deficit`,
            wardId: wid,
            category: cat,
            cost: cat === 'water' ? 8000000 : cat === 'drainage' ? 9500000 : cat === 'health' ? 6500000 : 4500000,
            scores: sc,
            wardName: WARDS[wid]?.name,
            wardAreas: WARDS[wid]?.areas,
            aiDetected: true
          });
        }
      }
    }
  }

  scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
  return scored.slice(0, 25);
}

export function buildWhatsAppReply(analysis, suggestion) {
  const w = WARDS[suggestion.wardId];
  const wardLabel = w ? `${w.name} (${w.areas.split(',')[0]})` : 'અજ્ઞાત વોર્ડ';
  const lang = analysis.detectedLanguage;

  if (lang === 'Gujarati') {
    return `🙏 નમસ્કાર! આપની ફરિયાદ નોંધવામાં આવી છે.\n\n📋 ટિકિટ ID: <strong>${suggestion.ticketId}</strong>\n📍 વોર્ડ: ${wardLabel}\n🏷️ વિભાગ: ${analysis.category.toUpperCase()}\n⚡ જરૂરિયાત: <strong>${analysis.urgency.toUpperCase()}</strong>\n\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
  }
  if (lang === 'Hindi') {
    return `🙏 नमस्कार! आपकी शिकायत दर्ज की गई है।\n\n📋 टिकट ID: <strong>${suggestion.ticketId}</strong>\n📍 वार्ड: ${wardLabel}\n🏷️ श्रेणी: ${analysis.category.toUpperCase()}\n⚡ प्राथमिकता: <strong>${analysis.urgency.toUpperCase()}</strong>\n\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
  }
  return `✅ Grievance logged successfully.\n\n📋 Ticket ID: <strong>${suggestion.ticketId}</strong>\n📍 Ward: ${wardLabel}\n🏷️ Category: <strong>${analysis.category.toUpperCase()}</strong>\n⚡ Urgency: <strong>${analysis.urgency.toUpperCase()}</strong>\n\nYou will be notified once RMC takes action.\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
}
