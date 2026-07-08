import fs from 'fs';

const htmlPath = 'C:\\Users\\JEET\\.gemini\\antigravity\\brain\\f9d0784f-318b-4cca-88e9-0ae55eb2ff32\\.system_generated\\steps\\1005\\content.md';
const html = fs.readFileSync(htmlPath, 'utf8');

// The dropdown options usually look like <option value="Something">08 | Kalawad Road</option>
// We'll extract the <select> tags and their options.

const selectRegex = /<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi;

const areaWardMapping = {};
const departments = [];

let match;
while ((match = selectRegex.exec(html)) !== null) {
  const selectName = match[1];
  const selectBody = match[2];
  
  const optionRegex = /<option[^>]*>([^<]+)<\/option>/gi;
  let optionMatch;
  
  if (selectName.toLowerCase().includes('area')) {
    while ((optionMatch = optionRegex.exec(selectBody)) !== null) {
      const rawText = optionMatch[1].trim();
      if (rawText.includes('|')) {
        const parts = rawText.split('|');
        const wardStr = parts[0].trim();
        const areaStr = parts[1].trim();
        const wardMatch = wardStr.match(/\d+/);
        
        if (wardMatch) {
          const wardNum = wardMatch[0].padStart(2, '0');
          const rmcWard = `RMC-${wardNum}`;
          
          const normalizedArea = areaStr.toLowerCase();
          
          areaWardMapping[normalizedArea] = {
            wardId: rmcWard,
            displayName: areaStr
          };
        }
      }
    }
  } else if (selectName.toLowerCase().includes('department') || selectName.toLowerCase().includes('dept')) {
    while ((optionMatch = optionRegex.exec(selectBody)) !== null) {
      const text = optionMatch[1].trim();
      if (text && text.toLowerCase() !== 'select') {
        departments.push(text);
      }
    }
  }
}

// Fallback logic if the regex didn't catch the selects due to name attributes not being 'area' or 'department'
if (Object.keys(areaWardMapping).length === 0) {
  const allOptions = /<option[^>]*>([^<]+)<\/option>/gi;
  while ((optionMatch = allOptions.exec(html)) !== null) {
    const rawText = optionMatch[1].trim();
    if (rawText.includes('|')) {
      const parts = rawText.split('|');
      const wardStr = parts[0].trim();
      const areaStr = parts[1].trim();
      const wardMatch = wardStr.match(/\d+/);
      
      if (wardMatch) {
        const wardNum = wardMatch[0].padStart(2, '0');
        const rmcWard = `RMC-${wardNum}`;
        const normalizedArea = areaStr.toLowerCase();
        
        areaWardMapping[normalizedArea] = {
          wardId: rmcWard,
          displayName: areaStr
        };
      }
    }
  }
}

fs.writeFileSync('e:\\vacation\\Build with AI\\areaWardMapping.json', JSON.stringify(areaWardMapping, null, 2));
fs.writeFileSync('e:\\vacation\\Build with AI\\departmentCategories.json', JSON.stringify(departments, null, 2));

console.log(`Parsed ${Object.keys(areaWardMapping).length} areas.`);
console.log(`Parsed ${departments.length} departments.`);
console.log('Departments:', departments);
