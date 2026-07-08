const fs = require('fs');

async function fetchRajkotWards() {
  const query = `[out:json][timeout:25];
area["name"="Rajkot"]->.searchArea;
(
  relation["admin_level"="10"]["name:en"~"Ward"](area.searchArea);
  relation["admin_level"="9"]["name:en"~"Ward"](area.searchArea);
);
out geom;`;

  console.log("Fetching Rajkot wards from Overpass API (with User-Agent)...");
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RajkotCivicApp/1.0 (contact@example.com)"
      }
    });

    if (!response.ok) {
      console.error("HTTP Error:", response.status, response.statusText);
      const text = await response.text();
      console.error("Response body:", text.substring(0, 500));
      return;
    }

    const data = await response.json();
    console.log("Elements found:", data.elements?.length || 0);

    if (data.elements && data.elements.length > 0) {
      fs.writeFileSync("rajkot_osm.json", JSON.stringify(data, null, 2));
      console.log("Saved raw OSM data to rajkot_osm.json");
    } else {
      console.log("No wards found in OSM for Rajkot.");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

fetchRajkotWards();
