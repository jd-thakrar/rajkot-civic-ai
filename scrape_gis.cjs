const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const requests = [];
  
  page.on('request', request => {
    const url = request.url();
    requests.push(url);
    if (url.includes('geoserver') || url.includes('wfs') || url.includes('wms') || url.includes('geojson')) {
      console.log('Intercepted GIS request:', url);
    }
  });

  console.log("Navigating to Rajkot GIS...");
  try {
    await page.goto('https://gis.rmc.gov.in/rajkotcitygis/map/all', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log("Navigation timeout or error, but continuing...");
  }
  
  console.log("Waiting 5 seconds for map to load layers...");
  await new Promise(r => setTimeout(r, 5000));
  
  fs.writeFileSync('gis_requests.json', JSON.stringify(requests, null, 2));
  console.log("Saved all requests to gis_requests.json");
  
  await browser.close();
})();
