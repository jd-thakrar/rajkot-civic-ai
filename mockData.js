// ─── RMC Ward Data ──────────────────────────────────────────────────────────
//
// DATA PROVENANCE (important — read before editing):
//   population:            Estimated proportional allocation based on Census 2011
//                          RMC total (1,323,363). Ward-level breakdowns are NOT
//                          published in any machine-readable public dataset.
//                          Source: Census 2011 RMC total via censusindia.gov.in.
//                          Ward proportions are estimated — DO NOT present as
//                          verified ward-level Census figures.
//
//   bplPercentage:         No ward-level BPL data published. District-level
//                          figure (Gujarat SECC 2011) ~18%. Values here are
//                          estimated ward-level proxies.
//
//   waterQualityIndex,
//   waterSupplyHours,
//   healthCenterDistance,
//   vulnerabilityIndex:    No ward-level data exists in any public dataset
//                          (NFHS goes to district; RMC does not publish ward
//                          infra metrics). All values are estimated proxies
//                          for demonstration. Label in UI as "estimated".
//
export const WardsData = {
  'RMC-01': {
    name: 'Ward 1',
    areas: 'Aji Dam, Mavdi, Raiyadhar',
    population: 76424, bplPercentage: 15.2,
    schoolAvgTravelDistance: 1.2, waterQualityIndex: 82, waterSupplyHours: 12,
    healthCenterDistance: 2.5, vulnerabilityIndex: 0.35,
    coords: [22.3134, 70.7852]
  },
  'RMC-02': {
    name: 'Ward 2',
    areas: 'Raiya Road, Kalawad Road, Tagore Nagar',
    population: 54854, bplPercentage: 12.1,
    schoolAvgTravelDistance: 1.5, waterQualityIndex: 85, waterSupplyHours: 14,
    healthCenterDistance: 1.8, vulnerabilityIndex: 0.28,
    coords: [22.3090, 70.8010]
  },
  'RMC-03': {
    name: 'Ward 3',
    areas: 'University Road, Race Course, Bhaktinagar',
    population: 51696, bplPercentage: 18.5,
    schoolAvgTravelDistance: 2.1, waterQualityIndex: 72, waterSupplyHours: 10,
    healthCenterDistance: 3.2, vulnerabilityIndex: 0.42,
    coords: [22.3210, 70.7950]
  },
  'RMC-04': {
    name: 'Ward 4',
    areas: 'Kothariya, Nana Mava, Patel Colony',
    population: 40398, bplPercentage: 22.4,
    schoolAvgTravelDistance: 2.8, waterQualityIndex: 65, waterSupplyHours: 8,
    healthCenterDistance: 4.1, vulnerabilityIndex: 0.55,
    coords: [22.3150, 70.8120]
  },
  'RMC-05': {
    name: 'Ward 5',
    areas: 'Yagnik Road, Doctor House, Rajnagar',
    population: 74434, bplPercentage: 14.8,
    schoolAvgTravelDistance: 1.8, waterQualityIndex: 80, waterSupplyHours: 12,
    healthCenterDistance: 2.1, vulnerabilityIndex: 0.30,
    coords: [22.3020, 70.8150]
  },
  'RMC-06': {
    name: 'Ward 6',
    areas: 'Kuvadva Road, 150 Ft Ring Road, Nirmala Convent Area',
    population: 58686, bplPercentage: 10.5,
    schoolAvgTravelDistance: 1.0, waterQualityIndex: 88, waterSupplyHours: 18,
    healthCenterDistance: 1.5, vulnerabilityIndex: 0.22,
    coords: [22.2980, 70.8000]
  },
  'RMC-07': {
    name: 'Ward 7',
    areas: 'Gondal Road, Sorathiyawadi, Jalaram Society',
    population: 39088, bplPercentage: 8.2,
    schoolAvgTravelDistance: 0.8, waterQualityIndex: 90, waterSupplyHours: 20,
    healthCenterDistance: 1.2, vulnerabilityIndex: 0.18,
    coords: [22.2920, 70.7950]
  },
  'RMC-08': {
    name: 'Ward 8',
    areas: 'Malviya Nagar, Shastri Maidan, Old RMC Office Area',
    population: 35097, bplPercentage: 16.5,
    schoolAvgTravelDistance: 2.5, waterQualityIndex: 75, waterSupplyHours: 10,
    healthCenterDistance: 3.0, vulnerabilityIndex: 0.45,
    coords: [22.2850, 70.8050]
  },
  'RMC-09': {
    name: 'Ward 9',
    areas: 'Soni Bazar, Sadar Bazar, Ghee Kanta',
    population: 44118, bplPercentage: 19.8,
    schoolAvgTravelDistance: 3.2, waterQualityIndex: 68, waterSupplyHours: 8,
    healthCenterDistance: 3.8, vulnerabilityIndex: 0.52,
    coords: [22.2800, 70.8180]
  },
  'RMC-10': {
    name: 'Ward 10',
    areas: 'Dhebar Road, Kasturba Road, Panchnath',
    population: 44897, bplPercentage: 11.2,
    schoolAvgTravelDistance: 1.4, waterQualityIndex: 84, waterSupplyHours: 16,
    healthCenterDistance: 2.0, vulnerabilityIndex: 0.25,
    coords: [22.2880, 70.7850]
  },
  'RMC-11': {
    name: 'Ward 11',
    areas: 'Aji Industrial Area, Bharat Colony, Gokuldham',
    population: 52800, bplPercentage: 13.5,
    schoolAvgTravelDistance: 1.7, waterQualityIndex: 81, waterSupplyHours: 14,
    healthCenterDistance: 2.3, vulnerabilityIndex: 0.32,
    coords: [22.2820, 70.7700]
  },
  'RMC-12': {
    name: 'Ward 12',
    areas: 'Aerodrome Area, Bajarangwadi, Indira Nagar',
    population: 74369, bplPercentage: 25.4,
    schoolAvgTravelDistance: 4.1, waterQualityIndex: 58, waterSupplyHours: 6,
    healthCenterDistance: 5.2, vulnerabilityIndex: 0.68,
    coords: [22.2700, 70.7600]
  },
  'RMC-13': {
    name: 'Ward 13',
    areas: 'Sardarnagar, Bhavnagar Road, Karanpara',
    population: 95917, bplPercentage: 28.6,
    schoolAvgTravelDistance: 3.8, waterQualityIndex: 55, waterSupplyHours: 6,
    healthCenterDistance: 4.8, vulnerabilityIndex: 0.72,
    coords: [22.2600, 70.7800]
  },
  'RMC-14': {
    name: 'Ward 14',
    areas: 'Trikon Baug, Kalyanpur, Jubilee Garden',
    population: 47450, bplPercentage: 21.2,
    schoolAvgTravelDistance: 2.9, waterQualityIndex: 66, waterSupplyHours: 8,
    healthCenterDistance: 3.5, vulnerabilityIndex: 0.50,
    coords: [22.2680, 70.7950]
  },
  'RMC-15': {
    name: 'Ward 15',
    areas: 'Aamroli, Mavdi Circle, Pancheshwar Colony',
    population: 39496, bplPercentage: 17.8,
    schoolAvgTravelDistance: 2.2, waterQualityIndex: 74, waterSupplyHours: 10,
    healthCenterDistance: 2.8, vulnerabilityIndex: 0.40,
    coords: [22.2750, 70.8050]
  },
  'RMC-16': {
    name: 'Ward 16',
    areas: 'Hirabaug, Swaminarayan Temple Area, Vibhag 5',
    population: 44421, bplPercentage: 15.6,
    schoolAvgTravelDistance: 1.9, waterQualityIndex: 78, waterSupplyHours: 12,
    healthCenterDistance: 2.4, vulnerabilityIndex: 0.36,
    coords: [22.2850, 70.8250]
  },
  'RMC-17': {
    name: 'Ward 17',
    areas: 'Rajkot Station, Limbda Chowk, Jagnath Plot',
    population: 60994, bplPercentage: 23.5,
    schoolAvgTravelDistance: 3.5, waterQualityIndex: 62, waterSupplyHours: 8,
    healthCenterDistance: 4.2, vulnerabilityIndex: 0.60,
    coords: [22.2700, 70.8200]
  },
  'RMC-18': {
    name: 'Ward 18',
    areas: 'Gandhigram, Ramnathpara, 80 Ft Road',
    population: 53863, bplPercentage: 26.8,
    schoolAvgTravelDistance: 4.5, waterQualityIndex: 50, waterSupplyHours: 6,
    healthCenterDistance: 5.5, vulnerabilityIndex: 0.75,
    coords: [22.2500, 70.8100]
  }
};

// ─── RMC Civic Issue Categories ───────────────────────────────────────────────
export const CategoryLabels = {
  solid_waste: { en: 'SWM – Solid Waste / Garbage',  gu: 'ઘન કચરો / SWM', hi: 'ठोस कचरा' },
  water:       { en: 'Water Supply',                 gu: 'પાણી પુરવઠો',    hi: 'पेयजल' },
  drainage:    { en: 'Sewerage & Drainage',           gu: 'ગટર / ડ્રેનેજ',  hi: 'सीवरेज व जल निकासी' },
  roads:       { en: 'Roads & Potholes',              gu: 'રસ્તા / ખાડા',    hi: 'सड़क और गड्ढे' },
  streetlights:{ en: 'Streetlights',                 gu: 'સ્ટ્રીટ લાઇટ',    hi: 'स्ट्रीट लाइट' },
  health:      { en: 'UHC / Healthcare',              gu: 'આરોગ્ય / UHC',   hi: 'स्वास्थ्य / UHC' },
  other:       { en: 'Other Civic Issues',            gu: 'અન્ય',            hi: 'अन्य' }
};

export const LocalDevelopmentPlans = [];
