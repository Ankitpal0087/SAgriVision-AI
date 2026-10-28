import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const DATASET_CANDIDATES = [
  path.join(ROOT, 'data', 'Crop_dataset.csv'),
  path.join(ROOT, '..', 'ml-api', 'data', 'Crop_dataset.csv'),
];

const OUTPUT_DIR = path.join(ROOT, 'src', 'data');

const USER_AGENT =
  'CropVisionAI/1.0 (crop metadata generator; development tool)';

const COMMONS_API =
  'https://commons.wikimedia.org/w/api.php';

const WIKI_API =
  'https://en.wikipedia.org/w/api.php';

const responseCache = new Map();

/*
 * Keep requests slow and predictable.
 * This is intentionally conservative to avoid API throttling.
 */
let nextRequestAt = 0;
const REQUEST_DELAY = 1200;

/* ---------------------------------------------------------
   SEARCH HINTS
--------------------------------------------------------- */

const SEARCH_HINTS = {
  'Amla (Indian Gooseberry)': [
    'Phyllanthus emblica',
    'Indian gooseberry',
  ],

  'Areca Nut': [
    'Areca catechu',
    'betel nut',
  ],

  Arecanut: [
    'Areca catechu',
    'betel nut',
  ],

  'Bambara Groundnut': [
    'Vigna subterranea',
  ],

  'Bael (Wood Apple)': [
    'Aegle marmelos',
    'wood apple',
  ],

  'Basilisk Grass': [
    'Urochloa brizantha',
  ],

  'Brinjal (Eggplant)': [
    'Solanum melongena',
    'eggplant',
  ],

  'Capsicum (Bell Pepper)': [
    'Capsicum annuum',
    'bell pepper',
  ],

  'Drumstick (Moringa)': [
    'Moringa oleifera',
    'moringa',
  ],

  'Groundnut (Peanut)': [
    'Arachis hypogaea',
    'peanut',
  ],

  'Hemp (for oil)': [
    'Cannabis sativa',
    'hemp seed',
  ],

  'Pak Choi (Bok Choy)': [
    'Brassica rapa chinensis',
    'bok choy',
  ],

  'Sapodilla (Chikoo)': [
    'Manilkara zapota',
    'sapodilla',
  ],

  Stylosanthes: [
    'Stylosanthes',
  ],

  'Stylosanthes Hamata': [
    'Stylosanthes hamata',
  ],

  'Sunn Hemp': [
    'Crotalaria juncea',
    'sunn hemp',
  ],

  Sunhemp: [
    'Crotalaria juncea',
    'sun hemp',
  ],

  'Rubber Tree': [
    'Hevea brasiliensis',
    'rubber tree',
  ],
};

/* ---------------------------------------------------------
   BAD RESULT FILTER
--------------------------------------------------------- */

const BAD_TITLE =
  /\b(person|people|portrait|actor|actress|singer|politician|brand|logo|product|package|packaging|bottle|can|dish|cuisine|recipe|restaurant|menu|juice|sauce|powder|flour|bread|cake|meal|map|building|poster|painting|drawing|icon|flag|toy|game|screenshot|advertisement|advertising|perfume|stamp|basket)\b/i;

const PLANT_CONTEXT =
  /\b(plant|crop|fruit|vegetable|grain|seed|leaf|leaves|flower|blossom|tree|shrub|herb|grass|paddy|field|agriculture|botanical|botany|root|tuber|pod|bean|berry|nut|spice|oilseed|cultivar|legume|cereal|forage)\b/i;


/* ---------------------------------------------------------
   CSV PARSER
--------------------------------------------------------- */

function parseCsv(text) {
  const rows = [];

  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if (
      (c === '\n' || c === '\r') &&
      !quoted
    ) {
      if (c === '\r' && next === '\n') {
        i += 1;
      }

      row.push(cell);
      cell = '';

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += c;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows
    .shift()
    .map((value) => value.trim());

  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        (values[index] || '').trim(),
      ])
    )
  );
}


/* ---------------------------------------------------------
   NORMALIZATION
--------------------------------------------------------- */

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCropName(crop) {
  return String(crop || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function termsFor(crop) {
  return [
    ...new Set([
      ...(SEARCH_HINTS[crop] || []),
      cleanCropName(crop),
      crop,
    ]),
  ].filter(Boolean);
}


/* ---------------------------------------------------------
   API REQUEST
--------------------------------------------------------- */

async function api(url) {
  if (responseCache.has(url)) {
    return responseCache.get(url);
  }

  const request = (async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const wait = Math.max(
        0,
        nextRequestAt - Date.now()
      );

      if (wait > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, wait)
        );
      }

      nextRequestAt =
        Date.now() + REQUEST_DELAY;

      let response;

      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
        });
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );

        continue;
      }

      if (response.ok) {
        return response.json();
      }

      /*
       * Respect Retry-After when Wikimedia sends it.
       */
      if (
        response.status === 429 ||
        response.status === 503
      ) {
        const retryAfter =
          Number(
            response.headers.get(
              'retry-after'
            )
          ) || 5;

        console.log(
          ` API throttled; waiting ${retryAfter}s...`
        );

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            retryAfter * 1000
          )
        );

        continue;
      }

      if (response.status >= 500) {
        await new Promise((resolve) =>
          setTimeout(resolve, 3000)
        );

        continue;
      }

      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    throw new Error(
      'API request failed after retries'
    );
  })();

  responseCache.set(url, request);

  return request;
}

function apiUrl(base, params) {
  return `${base}?${new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })}`;
}


/* ---------------------------------------------------------
   SCORING
--------------------------------------------------------- */

function scoreCandidate(
  crop,
  title,
  description = ''
) {
  const cropTokens = normalize(crop)
    .split(' ')
    .filter(
      (token) => token.length > 2
    );

  const titleNorm = normalize(title);

  const haystack =
    `${title} ${description}`;

  if (BAD_TITLE.test(title)) {
    return -1000;
  }

  let score = 0;

  for (const term of termsFor(crop)) {
    const termNorm = normalize(term);

    if (!termNorm) continue;

    if (titleNorm === termNorm) {
      score += 100;
    } else if (
      titleNorm.includes(termNorm) ||
      termNorm.includes(titleNorm)
    ) {
      score += 50;
    }
  }

  score +=
    cropTokens.filter((token) =>
      titleNorm.includes(token)
    ).length * 8;

  if (PLANT_CONTEXT.test(haystack)) {
    score += 20;
  }

  return score;
}


/* ---------------------------------------------------------
   METADATA HELPER
--------------------------------------------------------- */

function extValue(metadata, key) {
  const value =
    metadata?.[key]?.value;

  return typeof value === 'string'
    ? value
        .replace(/<[^>]+>/g, '')
        .trim()
    : '';
}


/* ---------------------------------------------------------
   WIKIPEDIA
--------------------------------------------------------- */

async function findWikipediaPage(crop) {
  /*
   * One search request per crop.
   *
   * Put the strongest search term first.
   */
  const terms = termsFor(crop);

  const searchTerm =
    terms[0] || crop;

  const data = await api(
    apiUrl(WIKI_API, {
      action: 'query',
      list: 'search',
      srsearch: searchTerm,
      srlimit: '10',
      srnamespace: '0',
    })
  );

  const candidates = [];

  for (
    const result of
      data.query?.search || []
  ) {
    const score =
      scoreCandidate(
        crop,
        result.title,
        result.snippet
      );

    if (score > 0) {
      candidates.push({
        result,
        score,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const best =
    candidates[0];

  if (!best || best.score < 30) {
    return null;
  }

  /*
   * Fetch the actual page only for the
   * selected result.
   */
  const data2 = await api(
    apiUrl(WIKI_API, {
      action: 'query',
      titles: best.result.title,
      prop: 'info|extracts',
      inprop: 'url',
      exintro: '1',
      explaintext: '1',
      exsentences: '2',
    })
  );

  const page =
    Object.values(
      data2.query?.pages || {}
    )[0];

  if (
    !page ||
    page.missing !== undefined ||
    !page.fullurl
  ) {
    return null;
  }

  const description =
    page.extract || '';

  const finalScore =
    scoreCandidate(
      crop,
      page.title,
      description
    );

  if (finalScore < 30) {
    return null;
  }

  return {
    wikipediaUrl:
      page.fullurl,

    wikipediaTitle:
      page.title,

    shortDescription:
      description
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 360),
  };
}


/* ---------------------------------------------------------
   WIKIMEDIA COMMONS
--------------------------------------------------------- */

async function findCommonsImage(
  crop,
  wikipediaTitle = ''
) {
  /*
   * Use ONE Commons search request.
   *
   * Prefer the Wikipedia title because it is
   * usually a cleaner botanical/common name.
   */
  const searchTerm =
    wikipediaTitle ||
    termsFor(crop)[0] ||
    crop;

  const query =
    `${searchTerm} plant`;

  const data = await api(
    apiUrl(COMMONS_API, {
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '20',
      prop: 'imageinfo',
      iiprop:
        'url|size|mime|extmetadata',
      iiurlwidth: '640',
    })
  );

  const candidates = [];

  for (
    const page of
      Object.values(
        data.query?.pages || {}
      )
  ) {
    const info =
      page.imageinfo?.[0];

    if (!info?.url) {
      continue;
    }

    if (
      !/^image\/(jpeg|png|webp)$/i.test(
        info.mime || ''
      )
    ) {
      continue;
    }

    if (
      (info.width || 0) < 200 ||
      (info.height || 0) < 200
    ) {
      continue;
    }

    const metadata =
      info.extmetadata || {};

    const description =
      extValue(
        metadata,
        'ImageDescription'
      );

    const score =
      scoreCandidate(
        crop,
        page.title,
        description
      );

    if (score <= 0) {
      continue;
    }

    const license =
      extValue(
        metadata,
        'LicenseShortName'
      ) ||
      extValue(
        metadata,
        'UsageTerms'
      );

    const licenseUrl =
      extValue(
        metadata,
        'LicenseUrl'
      );

    /*
     * Attribution/license is required.
     */
    if (!license || !licenseUrl) {
      continue;
    }

    candidates.push({
      page,
      info,
      metadata,
      score,
      license,
      licenseUrl,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const best =
    candidates[0];

  if (!best || best.score < 30) {
    return null;
  }

  const {
    page,
    info,
    metadata,
    license,
    licenseUrl,
  } = best;

  const fileTitle =
    page.title.replace(
      /^File:/,
      ''
    );

  const sourceUrl =
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(
      fileTitle.replace(/ /g, '_')
    )}`;

  return {
    imageUrl:
      info.thumburl ||
      info.url,

    sourceUrl,

    title:
      fileTitle,

    author:
      extValue(
        metadata,
        'Artist'
      ) ||
      'Unknown creator',

    license,

    licenseUrl,
  };
}


/* ---------------------------------------------------------
   MAIN
--------------------------------------------------------- */

async function main() {
  const datasetPath =
    await (async () => {
      for (
        const candidate of
          DATASET_CANDIDATES
      ) {
        try {
          await fs.access(
            candidate
          );

          return candidate;
        } catch {
          // Try next path.
        }
      }

      throw new Error(
        'Crop_dataset.csv was not found.'
      );
    })();

  console.log(
    `Using dataset: ${datasetPath}`
  );

  const rows =
    parseCsv(
      await fs.readFile(
        datasetPath,
        'utf8'
      )
    );

  const crops = [
    ...new Set(
      rows
        .map(
          (row) =>
            row.Crop_Name
        )
        .filter(Boolean)
    ),
  ].sort((a, b) =>
    a.localeCompare(b)
  );

  const media = {};
  const wiki = {};

  console.log(
    `Found ${crops.length} unique crops.`
  );

  let completed = 0;

  for (const crop of crops) {
    completed += 1;

    process.stdout.write(
      `[${completed}/${crops.length}] ${crop} ... `
    );

    let wikiValue = null;
    let mediaValue = null;

    /*
     * Wikipedia first.
     */
    try {
      wikiValue =
        await findWikipediaPage(
          crop
        );

      if (wikiValue) {
        wiki[crop] =
          wikiValue;
      }
    } catch (error) {
      process.stdout.write(
        `wiki error: ${error.message}; `
      );
    }

    /*
     * Wikimedia second.
     */
    try {
      mediaValue =
        await findCommonsImage(
          crop,
          wikiValue?.wikipediaTitle ||
            ''
        );

      if (mediaValue) {
        media[crop] =
          mediaValue;
      }
    } catch (error) {
      process.stdout.write(
        `image error: ${error.message}; `
      );
    }

    process.stdout.write(
      `${mediaValue ? 'image' : 'no-image'}, ` +
      `${wikiValue ? 'wiki' : 'no-wiki'}\n`
    );
  }

  await fs.mkdir(
    OUTPUT_DIR,
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    path.join(
      OUTPUT_DIR,
      'cropMedia.json'
    ),
    `${JSON.stringify(
      media,
      null,
      2
    )}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(
      OUTPUT_DIR,
      'cropWiki.json'
    ),
    `${JSON.stringify(
      wiki,
      null,
      2
    )}\n`,
    'utf8'
  );

  const summary = {
    totalUniqueCrops:
      crops.length,

    verifiedWikimediaImages:
      Object.keys(media)
        .length,

    verifiedWikipediaPages:
      Object.keys(wiki)
        .length,

    withoutVerifiedImage:
      crops.length -
      Object.keys(media)
        .length,

    withoutWikipediaPage:
      crops.length -
      Object.keys(wiki)
        .length,
  };

  console.log(
    '\n================================'
  );

  console.log(
    'CROP METADATA GENERATION COMPLETE'
  );

  console.log(
    '================================'
  );

  console.log(
    JSON.stringify(
      summary,
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
