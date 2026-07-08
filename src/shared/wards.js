/** Authoritative RMC ward demographic data — single source of truth */

export const WARDS = {
  'RMC-01': { name: 'Ward 1',  areas: 'Aji Dam, Mavdi, Raiyadhar',                      population: 76424, bpl: 15.2, schoolDistKm: 1.2, waterQI: 82, waterHrs: 12, healthDistKm: 2.5, vulnIndex: 0.35, coords: [22.3134, 70.7852] },
  'RMC-02': { name: 'Ward 2',  areas: 'Raiya Road, Kalawad Road, Tagore Nagar',          population: 54854, bpl: 12.1, schoolDistKm: 1.5, waterQI: 85, waterHrs: 14, healthDistKm: 1.8, vulnIndex: 0.28, coords: [22.3090, 70.8010] },
  'RMC-03': { name: 'Ward 3',  areas: 'University Road, Race Course, Bhaktinagar',       population: 51696, bpl: 18.5, schoolDistKm: 2.1, waterQI: 72, waterHrs: 10, healthDistKm: 3.2, vulnIndex: 0.42, coords: [22.3210, 70.7950] },
  'RMC-04': { name: 'Ward 4',  areas: 'Kothariya, Nana Mava, Patel Colony',              population: 40398, bpl: 22.4, schoolDistKm: 2.8, waterQI: 65, waterHrs: 8,  healthDistKm: 4.1, vulnIndex: 0.55, coords: [22.3150, 70.8120] },
  'RMC-05': { name: 'Ward 5',  areas: 'Yagnik Road, Doctor House, Rajnagar',             population: 74434, bpl: 14.8, schoolDistKm: 1.8, waterQI: 80, waterHrs: 12, healthDistKm: 2.1, vulnIndex: 0.30, coords: [22.3020, 70.8150] },
  'RMC-06': { name: 'Ward 6',  areas: 'Kuvadva Road, 150 Ft Ring Road, Nirmala Area',   population: 58686, bpl: 10.5, schoolDistKm: 1.0, waterQI: 88, waterHrs: 18, healthDistKm: 1.5, vulnIndex: 0.22, coords: [22.2980, 70.8000] },
  'RMC-07': { name: 'Ward 7',  areas: 'Gondal Road, Sorathiyawadi, Jalaram Society',     population: 39088, bpl: 8.2,  schoolDistKm: 0.8, waterQI: 90, waterHrs: 20, healthDistKm: 1.2, vulnIndex: 0.18, coords: [22.2920, 70.7950] },
  'RMC-08': { name: 'Ward 8',  areas: 'Malviya Nagar, Shastri Maidan, Old RMC Area',    population: 35097, bpl: 16.5, schoolDistKm: 2.5, waterQI: 75, waterHrs: 10, healthDistKm: 3.0, vulnIndex: 0.45, coords: [22.2850, 70.8050] },
  'RMC-09': { name: 'Ward 9',  areas: 'Soni Bazar, Sadar Bazar, Ghee Kanta',            population: 44118, bpl: 19.8, schoolDistKm: 3.2, waterQI: 68, waterHrs: 8,  healthDistKm: 3.8, vulnIndex: 0.52, coords: [22.2800, 70.8180] },
  'RMC-10': { name: 'Ward 10', areas: 'Dhebar Road, Kasturba Road, Panchnath',           population: 44897, bpl: 11.2, schoolDistKm: 1.4, waterQI: 84, waterHrs: 16, healthDistKm: 2.0, vulnIndex: 0.25, coords: [22.2880, 70.7850] },
  'RMC-11': { name: 'Ward 11', areas: 'Aji Industrial Area, Bharat Colony, Gokuldham',   population: 52800, bpl: 13.5, schoolDistKm: 1.7, waterQI: 81, waterHrs: 14, healthDistKm: 2.3, vulnIndex: 0.32, coords: [22.2820, 70.7700] },
  'RMC-12': { name: 'Ward 12', areas: 'Aerodrome Area, Bajarangwadi, Indira Nagar',       population: 74369, bpl: 25.4, schoolDistKm: 4.1, waterQI: 58, waterHrs: 6,  healthDistKm: 5.2, vulnIndex: 0.68, coords: [22.2700, 70.7600] },
  'RMC-13': { name: 'Ward 13', areas: 'Sardarnagar, Bhavnagar Road, Karanpara',           population: 95917, bpl: 28.6, schoolDistKm: 3.8, waterQI: 55, waterHrs: 6,  healthDistKm: 4.8, vulnIndex: 0.72, coords: [22.2600, 70.7800] },
  'RMC-14': { name: 'Ward 14', areas: 'Trikon Baug, Kalyanpur, Jubilee Garden',           population: 47450, bpl: 21.2, schoolDistKm: 2.9, waterQI: 66, waterHrs: 8,  healthDistKm: 3.5, vulnIndex: 0.50, coords: [22.2680, 70.7950] },
  'RMC-15': { name: 'Ward 15', areas: 'Aamroli, Mavdi Circle, Pancheshwar Colony',        population: 39496, bpl: 17.8, schoolDistKm: 2.2, waterQI: 74, waterHrs: 10, healthDistKm: 2.8, vulnIndex: 0.40, coords: [22.2750, 70.8050] },
  'RMC-16': { name: 'Ward 16', areas: 'Hirabaug, Swaminarayan Temple Area, Vibhag 5',    population: 44421, bpl: 15.6, schoolDistKm: 1.9, waterQI: 78, waterHrs: 12, healthDistKm: 2.4, vulnIndex: 0.36, coords: [22.2850, 70.8250] },
  'RMC-17': { name: 'Ward 17', areas: 'Rajkot Station, Limbda Chowk, Jagnath Plot',      population: 60994, bpl: 23.5, schoolDistKm: 3.5, waterQI: 62, waterHrs: 8,  healthDistKm: 4.2, vulnIndex: 0.60, coords: [22.2700, 70.8200] },
  'RMC-18': { name: 'Ward 18', areas: 'Gandhigram, Ramnathpara, 80 Ft Road',             population: 53863, bpl: 26.8, schoolDistKm: 4.5, waterQI: 50, waterHrs: 6,  healthDistKm: 5.5, vulnIndex: 0.75, coords: [22.2500, 70.8100] }
};

export const LOCAL_PLANS = [
  { id: 'RMC-P01', title: 'Sardarnagar SWM Collection Hub',                wardId: 'RMC-13', category: 'solid_waste',  cost: 7500000  },
  { id: 'RMC-P02', title: 'Aerodrome Area Water Pipeline Extension',        wardId: 'RMC-12', category: 'water',        cost: 12000000 },
  { id: 'RMC-P03', title: 'Gandhigram RO Water Treatment Plant',           wardId: 'RMC-18', category: 'water',        cost: 9500000  },
  { id: 'RMC-P04', title: 'Ghee Kanta Underground Drainage Reconstruction', wardId: 'RMC-09', category: 'drainage',     cost: 8200000  },
  { id: 'RMC-P05', title: 'Ward 17 LED Streetlight Installation (500 pts)', wardId: 'RMC-17', category: 'streetlights', cost: 1800000  },
  { id: 'RMC-P06', title: 'Karanpara Urban Health Sub-Centre (UHC)',        wardId: 'RMC-13', category: 'health',       cost: 6500000  },
  { id: 'RMC-P07', title: 'Kothariya Road Patch Work & Repair',             wardId: 'RMC-04', category: 'roads',        cost: 3200000  }
];

export const DEPT_MAP = {
  solid_waste: 'Solid Waste Management (SWM) Department',
  water: 'Water Supply & Sewerage Board (RSWB)',
  drainage: 'Storm Water Drainage Department',
  roads: 'Roads & Buildings Department',
  streetlights: 'Street Light Department',
  health: 'Urban Health Centre (UHC) Department'
};
