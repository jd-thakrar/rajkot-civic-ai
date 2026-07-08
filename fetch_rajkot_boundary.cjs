const fs = require('fs');

async function fetchRajkotBoundary() {
  const query = `[out:json][timeout:25];
relation["name"="Rajkot"]["type"="boundary"];
out geom;`;

  console.log("Fetching Rajkot city boundary from Overpass API...");
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RajkotCivicApp/1.0"
      }
    });

    if (!response.ok) {
      console.error("HTTP Error:", response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log("Elements found:", data.elements?.length || 0);

    if (data.elements && data.elements.length > 0) {
      fs.writeFileSync("rajkot_boundary_osm.json", JSON.stringify(data, null, 2));
      console.log("Saved boundary to rajkot_boundary_osm.json");
    } else {
      console.log("No boundary found.");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

fetchRajkotBoundary();
