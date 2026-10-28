const fs = require("fs");
const path = require("path");
const https = require("https");

const MEDIA_PATH = path.join(__dirname, "..", "src", "data", "cropMedia.json");

const API = "https://commons.wikimedia.org/w/api.php";

const CROPS = {
  "Blackberry": "Rubus",
  "Bottle Gourd": "Lagenaria siceraria",
  "Breadfruit": "Artocarpus altilis",
  "Canola": "Brassica napus",
  "Carnation": "Dianthus caryophyllus",
  "Cauliflower": "Brassica oleracea botrytis",
  "Chickpeas": "Cicer arietinum",
  "Coir Palm": "Cocos nucifera",
  "Collard Greens": "Brassica oleracea",
  "Cranberry": "Vaccinium macrocarpon",
  "Custard Apple": "Annona squamosa",
  "Dill": "Anethum graveolens",
  "Emmer Wheat": "Triticum dicoccum",
  "Endive": "Cichorium endivia",
  "Fenugreek": "Trigonella foenum-graecum",
  "Flax": "Linum usitatissimum",
  "Foxglove": "Digitalis purpurea",
  "Gooseberry": "Phyllanthus emblica",
  "Grapes": "Vitis vinifera",
  "Ground Orchid": "Spathoglottis plicata",
  "Guinea Grass": "Megathyrsus maximus",
  "Kale": "Brassica oleracea acephala",
  "Kenaf": "Hibiscus cannabinus",
  "Kodo Millet": "Paspalum scrobiculatum",
  "Langsat": "Lansium domesticum",
  "Larkspur": "Delphinium",
  "Lentil": "Lens culinaris",
  "Little Millet": "Panicum sumatrense",
  "Lotus Root": "Nelumbo nucifera",
  "Mangosteen": "Garcinia mangostana",
  "Moth Beans": "Vigna aconitifolia",
  "Muskmelon": "Cucumis melo",
  "Mustard Greens": "Brassica juncea",
  "Niger Seed": "Guizotia abyssinica",
  "Noni": "Morinda citrifolia",
  "Palmarosa": "Cymbopogon martinii",
  "Parsnip": "Pastinaca sativa",
  "Patchouli": "Pogostemon cablin",
  "Pigeon Peas": "Cajanus cajan",
  "Plum": "Prunus domestica",
  "Proso Millet": "Panicum miliaceum",
  "Radicchio": "Cichorium intybus",
  "Radish": "Raphanus sativus",
  "Ramie": "Boehmeria nivea",
  "Red Clover": "Trifolium pratense",
  "Shatavari": "Asparagus racemosus",
  "Snapdragon": "Antirrhinum majus",
  "Sorghum": "Sorghum bicolor",
  "Soybean": "Glycine max",
  "Starfruit": "Averrhoa carambola",
  "Sweet Alyssum": "Lobularia maritima",
  "Tarragon": "Artemisia dracunculus",
  "Tuberose": "Polianthes tuberosa",
  "Velvet Bean": "Mucuna pruriens",
  "Vetiver": "Chrysopogon zizanioides",
  "White Clover": "Trifolium repens"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function apiRequest(query) {
  return new Promise((resolve, reject) => {
    const url =
      API +
      "?" +
      new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: `filetype:bitmap ${query}`,
        gsrnamespace: "6",
        gsrlimit: "5",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "960",
        format: "json",
        origin: "*",
        maxlag: "5"
      }).toString();

    https.get(
      url,
      {
        headers: {
          "User-Agent":
            "CropVisionAI/1.0 (educational project; read-only Wikimedia Commons metadata)"
        }
      },
      res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 429) {
            reject(new Error("RATE_LIMIT"));
            return;
          }

          try {
            const json = JSON.parse(data);

            if (json.error) {
              reject(new Error(json.error.code || "API_ERROR"));
              return;
            }

            resolve(json);
          } catch {
            reject(new Error(`INVALID_RESPONSE_${res.statusCode}`));
          }
        });
      }
    ).on("error", reject);
  });
}

function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMetadata(page) {
  const info = page.imageinfo?.[0];

  if (!info?.url) return null;

  const meta = info.extmetadata || {};

  return {
    imageUrl: info.thumburl || info.url,
    sourceUrl:
      info.descriptionurl ||
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(
        page.title
      )}`,
    title: page.title.replace(/^File:/, ""),
    author:
      clean(meta.Artist?.value) ||
      clean(meta.Credit?.value) ||
      "Unknown",
    license:
      clean(meta.LicenseShortName?.value) ||
      clean(meta.License?.value) ||
      "Unknown",
    licenseUrl: clean(meta.LicenseUrl?.value)
  };
}

async function searchCrop(crop, scientificName) {
  const queries = [
    `${scientificName}`,
    `${crop}`
  ];

  for (const query of queries) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const data = await apiRequest(query);
        const pages = Object.values(data.query?.pages || {});

        if (pages.length) {
          return pages[0];
        }

        break;
      } catch (error) {
        if (
          error.message === "RATE_LIMIT" ||
          error.message.startsWith("INVALID_RESPONSE")
        ) {
          const wait =
            attempt === 1 ? 5000 :
            attempt === 2 ? 15000 :
            30000;

          console.log(`    API busy. Waiting ${wait / 1000}s...`);
          await sleep(wait);
        } else {
          console.log(`    API error: ${error.message}`);
          break;
        }
      }
    }
  }

  return null;
}

async function main() {
  const media = JSON.parse(fs.readFileSync(MEDIA_PATH, "utf8"));

  const missing = Object.keys(CROPS).filter(crop => !media[crop]);

  console.log(`Existing media records: ${Object.keys(media).length}`);
  console.log(`Remaining crops: ${missing.length}`);
  console.log("");

  const recovered = [];
  const failed = [];

  for (const crop of missing) {
    const scientificName = CROPS[crop];

    console.log(`Searching: ${crop} → ${scientificName}`);

    const page = await searchCrop(crop, scientificName);

    if (!page) {
      console.log("  ❌ No result");
      failed.push(crop);
      await sleep(3000);
      continue;
    }

    const metadata = getMetadata(page);

    if (!metadata) {
      console.log("  ❌ No usable image metadata");
      failed.push(crop);
      await sleep(3000);
      continue;
    }

    media[crop] = metadata;
    recovered.push(crop);

    console.log(`  ✅ ${metadata.title}`);

    fs.writeFileSync(
      MEDIA_PATH,
      JSON.stringify(media, null, 2) + "\n",
      "utf8"
    );

    await sleep(2000);
  }

  const report = {
    recovered,
    failed,
    finalMediaCount: Object.keys(media).length
  };

  fs.writeFileSync(
    path.join(__dirname, "cropImageRecoveryReport.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8"
  );

  console.log("\n=================================");
  console.log("RECOVERY COMPLETE");
  console.log("=================================");
  console.log(`Recovered this run: ${recovered.length}`);
  console.log(`Still missing: ${failed.length}`);
  console.log(`Final media records: ${Object.keys(media).length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});