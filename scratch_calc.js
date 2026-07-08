const WARDS = {
  'RMC-13': { name: 'Ward 13', population: 95917 },
  'RMC-01': { name: 'Ward 1', population: 76424 },
  'RMC-08': { name: 'Ward 8', population: 35097 },
};

const multipliers = [200000, 1000000, 2000000];

console.log("Ward Population | Submissions | Multiplier | Demand Score");
console.log("---------------------------------------------------------");

for (const multiplier of multipliers) {
  for (const wardId in WARDS) {
    const pop = WARDS[wardId].population;
    for (const vol of [1, 3, 10]) {
      const score = Math.round(Math.min((vol / pop) * multiplier, 100));
      console.log(`${wardId} (${pop})`.padEnd(20) + `| ${vol}`.padEnd(14) + `| ${multiplier}`.padEnd(13) + `| ${score}`);
    }
  }
  console.log("---------------------------------------------------------");
}
