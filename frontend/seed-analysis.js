const galleryInput = document.querySelector('#gallery-input');
const cameraInput = document.querySelector('#camera-input');
const previewUpload = document.querySelector('#preview-upload');
const emptyUpload = document.querySelector('#empty-upload');
const seedPreview = document.querySelector('#seed-preview');
const imageError = document.querySelector('#image-error');
const analyzeButton = document.querySelector('#analyze-button');
const analysisEmpty = document.querySelector('#analysis-empty');
const analysisProgress = document.querySelector('#analysis-progress');
const analysisResult = document.querySelector('#analysis-result');
const seedInfoLink = document.querySelector('#seed-info-link');
const seedInfoPanel = document.querySelector('#seed-info-panel');
const seedInfoName = document.querySelector('#seed-info-name');
const seedInfoDescription = document.querySelector('#seed-info-description');
const seedInfoCategory = document.querySelector('#seed-info-category');
const seedInfoUses = document.querySelector('#seed-info-uses');
const seedInfoCharacteristic = document.querySelector('#seed-info-characteristic');
const seedInfoSeason = document.querySelector('#seed-info-season');
const seedInfoLabels = document.querySelectorAll('[data-seed-info-label]');
const seedDetailPanel = document.querySelector('#seed-detail-panel');
const seedDetailName = document.querySelector('#seed-detail-name');
const seedDetailSummary = document.querySelector('#seed-detail-summary');
const seedDetailCategory = document.querySelector('#seed-detail-category');
const seedDetailUses = document.querySelector('#seed-detail-uses');
const seedDetailCharacteristic = document.querySelector('#seed-detail-characteristic');
const seedDetailSeason = document.querySelector('#seed-detail-season');
const seedHeroMedia = document.querySelector('#seed-hero-media');
const seedHeroMain = document.querySelector('#seed-hero-main');
const seedHeroSupport = document.querySelector('#seed-hero-support');
const seedHeroBadgeText = document.querySelector('#seed-hero-badge-text');
const seedHeroTitle = document.querySelector('#seed-hero-title');
const seedHeroStatus = document.querySelector('#seed-hero-status');
const seedHeroDots = document.querySelector('#seed-hero-dots');
const seedHeroPrevious = document.querySelector('[data-hero-previous]');
const seedHeroNext = document.querySelector('[data-hero-next]');
let selectedFile = null;
let previewUrl = null;
let analysisInFlight = false;
let selectionVersion = 0;
let detectedSeedType = '';
let heroVisualVersion = 0;
let heroSlideIndex = 0;
let heroSlideTimer = null;
let heroSlides = [];
let heroRenderVersion = 0;

const SEED_INFORMATION = {
  amla: { en: { name: 'Amla Seed', description: 'Amla is a hardy fruit crop whose small seeds develop inside the segmented fruit.', category: 'Fruit crop', uses: 'Fresh fruit, preserves, beverages and traditional products', characteristic: 'Hardy perennial suited to warm conditions and seasonal dry periods', season: 'Warm season' }, hi: { name: 'आंवला बीज', description: 'आंवला एक मजबूत फल वाली फसल है, जिसके छोटे बीज खंडों वाले फल के अंदर बनते हैं।', category: 'फल वाली फसल', uses: 'ताजे फल, मुरब्बा, पेय और पारंपरिक उत्पाद', characteristic: 'गर्म परिस्थितियों और मौसमी सूखे के अनुकूल मजबूत बहुवर्षीय फसल', season: 'गर्म मौसम' } },
  apple: { en: { name: 'Apple Seed', description: 'Apple seeds develop inside the core of a temperate fruit tree grown for its fleshy fruit.', category: 'Temperate fruit crop', uses: 'Fresh fruit, juice, sauces and preserves', characteristic: 'Cool-season crop requiring winter chilling and well-drained soil', season: 'Cool season' }, hi: { name: 'सेब बीज', description: 'सेब के बीज ठंडे मौसम वाले फलदार पेड़ के गूदेदार फल के मध्य भाग में बनते हैं।', category: 'शीतोष्ण फल वाली फसल', uses: 'ताजे फल, रस, सॉस और संरक्षित उत्पाद', characteristic: 'सर्दियों की ठंड और अच्छी जल निकासी वाली मिट्टी की आवश्यकता', season: 'ठंडा मौसम' } },
  avocado: { en: { name: 'Avocado Seed', description: 'Avocado is a warm-climate fruit crop that produces a large single seed inside its creamy fruit.', category: 'Tropical fruit crop', uses: 'Fresh food, salads, spreads and oil', characteristic: 'Warm, frost-sensitive crop needing well-drained soil and steady moisture', season: 'Warm season' }, hi: { name: 'एवोकाडो बीज', description: 'एवोकाडो गर्म जलवायु की फल वाली फसल है, जिसके मलाईदार फल में एक बड़ा बीज होता है।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'ताजे खाद्य पदार्थ, सलाद, स्प्रेड और तेल', characteristic: 'पाले से संवेदनशील फसल जिसे अच्छी जल निकासी और नियमित नमी चाहिए', season: 'गर्म मौसम' } },
  'betel-nut': { en: { name: 'Betel Nut Seed', description: 'Betel nut, or areca nut, is the seed of a tropical palm grown in clusters of fruit.', category: 'Tropical plantation crop', uses: 'Processed areca nut and traditional products', characteristic: 'Tall, warm-humid palm crop needing dependable moisture', season: 'Warm and humid season' }, hi: { name: 'सुपारी बीज', description: 'सुपारी उष्णकटिबंधीय ताड़ की फसल का बीज है, जिसके फल गुच्छों में लगते हैं।', category: 'उष्णकटिबंधीय बागान फसल', uses: 'प्रसंस्कृत सुपारी और पारंपरिक उत्पाद', characteristic: 'नियमित नमी पसंद करने वाली गर्म और आर्द्र जलवायु की ऊँची ताड़ फसल', season: 'गर्म और आर्द्र मौसम' } },
  'black-plum': { en: { name: 'Black Plum Seed', description: 'Black plum, or jamun, is a tropical fruit tree with a single seed inside its dark purple fruit.', category: 'Tropical fruit crop', uses: 'Fresh fruit, juice, jams and traditional products', characteristic: 'Hardy warm-climate tree that tolerates a range of soils after establishment', season: 'Warm and rainy season' }, hi: { name: 'जामुन बीज', description: 'जामुन उष्णकटिबंधीय फलदार पेड़ है, जिसके गहरे बैंगनी फल में एक बीज होता है।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'ताजे फल, रस, जैम और पारंपरिक उत्पाद', characteristic: 'स्थापित होने के बाद विभिन्न मिट्टियों को सहन करने वाला गर्म जलवायु का मजबूत पेड़', season: 'गर्म और वर्षा मौसम' } },
  date: { en: { name: 'Date Seed', description: 'Date seed is the hard seed inside the sweet fruit of a date palm.', category: 'Arid fruit crop', uses: 'Dates, syrups, confectionery and processed foods', characteristic: 'Heat- and drought-tolerant palm needing strong sunlight and irrigation', season: 'Hot and dry season' }, hi: { name: 'खजूर बीज', description: 'खजूर का बीज खजूर की मीठी फल वाली ताड़ के अंदर पाया जाने वाला कठोर बीज है।', category: 'शुष्क क्षेत्र की फल वाली फसल', uses: 'खजूर, सिरप, मिठाइयाँ और प्रसंस्कृत खाद्य', characteristic: 'तेज धूप और सिंचाई पसंद करने वाली गर्मी तथा सूखा सहनशील ताड़ फसल', season: 'गर्म और शुष्क मौसम' } },
  'hog-plum': { en: { name: 'Hog Plum Seed', description: 'Hog plum is a tropical fruit tree whose fibrous fruit contains a hard seed.', category: 'Tropical fruit crop', uses: 'Fresh fruit, pickles, chutneys and preserves', characteristic: 'Warm-climate tree that grows well with seasonal rainfall and good drainage', season: 'Warm and rainy season' }, hi: { name: 'अंबाड़ा बीज', description: 'अंबाड़ा उष्णकटिबंधीय फलदार पेड़ है, जिसके रेशेदार फल में कठोर बीज होता है।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'ताजे फल, अचार, चटनी और संरक्षित उत्पाद', characteristic: 'मौसमी वर्षा और अच्छी जल निकासी में अच्छी तरह बढ़ने वाला गर्म जलवायु का पेड़', season: 'गर्म और वर्षा मौसम' } },
  jackfruit: { en: { name: 'Jackfruit Seed', description: 'Jackfruit produces numerous smooth seeds inside its large, fleshy tropical fruit.', category: 'Tropical fruit crop', uses: 'Cooked seeds, fresh fruit, flour and traditional dishes', characteristic: 'Warm, humid tree crop needing space, moisture and well-drained soil', season: 'Warm and rainy season' }, hi: { name: 'कटहल बीज', description: 'कटहल के बड़े गूदेदार उष्णकटिबंधीय फल के अंदर कई चिकने बीज बनते हैं।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'पके बीज, ताजे फल, आटा और पारंपरिक व्यंजन', characteristic: 'जगह, नमी और अच्छी जल निकासी वाली मिट्टी पसंद करने वाली गर्म आर्द्र जलवायु की फसल', season: 'गर्म और वर्षा मौसम' } },
  litchi: { en: { name: 'Litchi Seed', description: 'Litchi is a subtropical fruit crop with one glossy seed inside each fleshy fruit.', category: 'Subtropical fruit crop', uses: 'Fresh fruit, juice, canned fruit and desserts', characteristic: 'Warm crop needing humidity, regular moisture and protection from harsh frost', season: 'Warm and humid season' }, hi: { name: 'लीची बीज', description: 'लीची उपोष्णकटिबंधीय फल वाली फसल है, जिसके हर गूदेदार फल में एक चमकीला बीज होता है।', category: 'उपोष्णकटिबंधीय फल वाली फसल', uses: 'ताजे फल, रस, डिब्बाबंद फल और मिठाइयाँ', characteristic: 'नमी और नियमित पानी पसंद करने वाली, तेज पाले से सुरक्षा चाहने वाली फसल', season: 'गर्म और आर्द्र मौसम' } },
  mango: { en: { name: 'Mango Seed', description: 'Mango is a tropical fruit crop with a large fibrous stone containing the seed.', category: 'Tropical fruit crop', uses: 'Fresh fruit, juice, pickles, chutneys and pulp', characteristic: 'Warm-season tree needing sunlight, heat and well-drained soil', season: 'Warm season' }, hi: { name: 'आम बीज', description: 'आम उष्णकटिबंधीय फल वाली फसल है, जिसके बड़े रेशेदार गुठली में बीज होता है।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'ताजे फल, रस, अचार, चटनी और गूदा', characteristic: 'धूप, गर्मी और अच्छी जल निकासी वाली मिट्टी पसंद करने वाला पेड़', season: 'गर्म मौसम' } },
  olive: { en: { name: 'Olive Seed', description: 'Olive is a long-lived Mediterranean tree crop whose fleshy fruit contains a hard pit and seed.', category: 'Mediterranean fruit and oilseed crop', uses: 'Olive oil, table olives and food products', characteristic: 'Sun-loving, drought-tolerant tree needing well-drained soil', season: 'Warm and dry season' }, hi: { name: 'जैतून बीज', description: 'जैतून लंबे समय तक जीवित रहने वाली भूमध्यसागरीय फसल है, जिसके गूदेदार फल में कठोर गुठली और बीज होता है।', category: 'भूमध्यसागरीय फल और तिलहन फसल', uses: 'जैतून का तेल, खाने योग्य जैतून और खाद्य उत्पाद', characteristic: 'धूप पसंद करने वाला सूखा सहनशील पेड़ जिसे अच्छी जल निकासी वाली मिट्टी चाहिए', season: 'गर्म और शुष्क मौसम' } },
  orange: { en: { name: 'Orange Seed', description: 'Orange is a citrus fruit crop whose juicy segments contain seeds in some varieties.', category: 'Citrus fruit crop', uses: 'Fresh fruit, juice, zest and preserves', characteristic: 'Warm, frost-sensitive tree needing sunlight and regular moisture', season: 'Warm season' }, hi: { name: 'संतरा बीज', description: 'संतरा खट्टे फलों की फसल है, जिसकी रसदार फाँकों में कुछ किस्मों में बीज होते हैं।', category: 'खट्टे फलों की फसल', uses: 'ताजे फल, रस, छिलका और संरक्षित उत्पाद', characteristic: 'धूप और नियमित नमी पसंद करने वाला पाले से संवेदनशील गर्म जलवायु का पेड़', season: 'गर्म मौसम' } },
  pumpkin: { en: { name: 'Pumpkin Seed', description: 'Pumpkin produces broad, flat seeds inside its large fruit and is grown as a warm-season vine.', category: 'Warm-season vegetable crop', uses: 'Edible seeds, vegetable flesh, snacks and oil', characteristic: 'Vigorous vine needing warm weather, sunlight and space to spread', season: 'Warm season' }, hi: { name: 'कद्दू बीज', description: 'कद्दू के बड़े फल के अंदर चौड़े चपटे बीज बनते हैं और यह गर्म मौसम की बेल वाली फसल है।', category: 'गर्म मौसम की सब्जी फसल', uses: 'खाने योग्य बीज, सब्जी, स्नैक और तेल', characteristic: 'फैलने के लिए जगह, धूप और गर्म मौसम चाहने वाली तेजी से बढ़ने वाली बेल', season: 'गर्म मौसम' } },
  sapodilla: { en: { name: 'Sapodilla Seed', description: 'Sapodilla is a warm-climate fruit tree whose sweet fruit contains several glossy black seeds.', category: 'Tropical fruit crop', uses: 'Fresh fruit, shakes, desserts and preserves', characteristic: 'Heat-tolerant evergreen tree preferring warm conditions and good drainage', season: 'Warm and humid season' }, hi: { name: 'चीकू बीज', description: 'चीकू गर्म जलवायु का फलदार पेड़ है, जिसके मीठे फल में कई चमकीले काले बीज होते हैं।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'ताजे फल, शेक, मिठाइयाँ और संरक्षित उत्पाद', characteristic: 'गर्म परिस्थितियों और अच्छी जल निकासी पसंद करने वाला गर्मी सहनशील सदाबहार पेड़', season: 'गर्म और आर्द्र मौसम' } },
  tamarind: { en: { name: 'Tamarind Seed', description: 'Tamarind is a tropical tree crop that produces hard seeds inside its brown, tangy fruit pods.', category: 'Tropical fruit crop', uses: 'Souring agent, chutneys, sauces, drinks and traditional products', characteristic: 'Hardy heat-tolerant tree suited to warm climates and seasonal dry conditions', season: 'Warm and dry season' }, hi: { name: 'इमली बीज', description: 'इमली उष्णकटिबंधीय पेड़ वाली फसल है, जिसकी भूरी खट्टी फलियों के अंदर कठोर बीज होते हैं।', category: 'उष्णकटिबंधीय फल वाली फसल', uses: 'खटाई, चटनी, सॉस, पेय और पारंपरिक उत्पाद', characteristic: 'गर्म जलवायु और मौसमी सूखे के अनुकूल मजबूत गर्मी सहनशील पेड़', season: 'गर्म और शुष्क मौसम' } },
  corn: { en: { name: 'Corn Seed', description: 'Corn is a warm-season cereal seed that develops into a tall grain crop with ears and kernels.', category: 'Cereal crop', uses: 'Grain, feed and food products', characteristic: 'Warm-season crop with strong sunlight needs', season: 'Warm season' }, hi: { name: 'मक्का बीज', description: 'मक्का गर्म मौसम का अनाज वाला बीज है, जिससे भुट्टे और दानों वाली ऊँची फसल विकसित होती है।', category: 'अनाज वाली फसल', uses: 'अनाज, पशु आहार और खाद्य उत्पाद', characteristic: 'गर्म मौसम और पर्याप्त धूप वाली फसल', season: 'गर्म मौसम' } },
  flex: { en: { name: 'Flex Seed', description: 'Flax is an oilseed and fibre crop grown for its small seeds and slender flowering plants.', category: 'Oilseed and fibre crop', uses: 'Oil, food products and fibre', characteristic: 'Cool-season crop with a relatively short cycle', season: 'Cool season' }, hi: { name: 'अलसी बीज', description: 'अलसी छोटे बीजों और पतले फूलदार पौधों के लिए उगाई जाने वाली तिलहन और रेशेदार फसल है।', category: 'तिलहन और रेशेदार फसल', uses: 'तेल, खाद्य उत्पाद और रेशा', characteristic: 'कम समय में तैयार होने वाली ठंडे मौसम की फसल', season: 'ठंडा मौसम' } },
  flax: { en: { name: 'Flax Seed', description: 'Flax is an oilseed and fibre crop grown for its small seeds and slender flowering plants.', category: 'Oilseed and fibre crop', uses: 'Oil, food products and fibre', characteristic: 'Cool-season crop with a relatively short cycle', season: 'Cool season' }, hi: { name: 'अलसी बीज', description: 'अलसी छोटे बीजों और पतले फूलदार पौधों के लिए उगाई जाने वाली तिलहन और रेशेदार फसल है।', category: 'तिलहन और रेशेदार फसल', uses: 'तेल, खाद्य उत्पाद और रेशा', characteristic: 'कम समय में तैयार होने वाली ठंडे मौसम की फसल', season: 'ठंडा मौसम' } },
  mustard: { en: { name: 'Mustard Seed', description: 'Mustard seed comes from a fast-growing oilseed crop that forms branching stems and seed pods.', category: 'Oilseed crop', uses: 'Cooking oil, condiments and food products', characteristic: 'Cool-season crop with pod-forming growth', season: 'Cool season' }, hi: { name: 'सरसों बीज', description: 'सरसों का बीज तेजी से बढ़ने वाली तिलहन फसल से मिलता है, जिसमें शाखाएँ और फलियाँ बनती हैं।', category: 'तिलहन फसल', uses: 'खाने का तेल, मसाले और खाद्य उत्पाद', characteristic: 'फलियाँ बनाने वाली ठंडे मौसम की फसल', season: 'ठंडा मौसम' } },
  paddy: { en: { name: 'Paddy Seed', description: 'Paddy seed develops into rice, a cereal crop commonly cultivated in flooded or irrigated fields.', category: 'Cereal crop', uses: 'Rice grain and food products', characteristic: 'Warm-season crop needing dependable water', season: 'Warm season' }, hi: { name: 'धान बीज', description: 'धान का बीज चावल की अनाज वाली फसल बनता है, जिसे आमतौर पर पानी भरे या सिंचित खेतों में उगाया जाता है।', category: 'अनाज वाली फसल', uses: 'चावल और खाद्य उत्पाद', characteristic: 'नियमित पानी की आवश्यकता वाली गर्म मौसम की फसल', season: 'गर्म मौसम' } },
  safflower: { en: { name: 'Safflower Seed', description: 'Safflower is a hardy oilseed crop with deep roots and mature flower heads that produce small seeds.', category: 'Oilseed crop', uses: 'Edible oil, feed and food products', characteristic: 'Drought-tolerant crop suited to dry conditions', season: 'Warm season' }, hi: { name: 'कुसुम बीज', description: 'कुसुम गहरी जड़ों वाली मजबूत तिलहन फसल है, जिसके पके फूलों में छोटे बीज बनते हैं।', category: 'तिलहन फसल', uses: 'खाने का तेल, पशु आहार और खाद्य उत्पाद', characteristic: 'कम पानी और शुष्क परिस्थितियों के अनुकूल फसल', season: 'गर्म मौसम' } },
  sesame: { en: { name: 'Sesame Seed', description: 'Sesame seed develops in upright plants that form capsules containing many small oil-rich seeds.', category: 'Oilseed crop', uses: 'Edible oil, bakery and food products', characteristic: 'Warm-season crop suited to well-drained soil', season: 'Warm season' }, hi: { name: 'तिल बीज', description: 'तिल का बीज सीधे बढ़ने वाले पौधों में बनता है, जिनकी फलियों में तेल से भरपूर छोटे बीज होते हैं।', category: 'तिलहन फसल', uses: 'खाने का तेल, बेकरी और खाद्य उत्पाद', characteristic: 'अच्छी जल निकासी वाली मिट्टी की अनुकूल गर्म मौसम की फसल', season: 'गर्म मौसम' } },
  soybean: { en: { name: 'Soybean Seed', description: 'Soybean is a legume seed that grows in pods and is valued for its protein and oil.', category: 'Legume and oilseed crop', uses: 'Protein foods, animal feed and oil', characteristic: 'Warm-season legume with pod development', season: 'Warm season' }, hi: { name: 'सोयाबीन बीज', description: 'सोयाबीन फलियों में उगने वाला दलहन बीज है, जो प्रोटीन और तेल के लिए महत्वपूर्ण है।', category: 'दलहन और तिलहन फसल', uses: 'प्रोटीन खाद्य, पशु आहार और तेल', characteristic: 'फलियाँ बनाने वाली गर्म मौसम की दलहन फसल', season: 'गर्म मौसम' } },
  sunflower: { en: { name: 'Sunflower Seed', description: 'Sunflower seed develops in large flower heads and is cultivated as an important oilseed crop.', category: 'Oilseed crop', uses: 'Edible oil, snack foods and feed', characteristic: 'Warm-season crop that prefers full sun', season: 'Warm season' }, hi: { name: 'सूरजमुखी बीज', description: 'सूरजमुखी के बीज बड़े फूलों में बनते हैं और यह एक महत्वपूर्ण तिलहन फसल के रूप में उगाई जाती है।', category: 'तिलहन फसल', uses: 'खाने का तेल, स्नैक और पशु आहार', characteristic: 'पूरी धूप पसंद करने वाली गर्म मौसम की फसल', season: 'गर्म मौसम' } },
  wheat: { en: { name: 'Wheat Seed', description: 'Wheat is a cereal seed that develops into grass-like plants with grain-filled spikes at maturity.', category: 'Cereal crop', uses: 'Flour, grain foods and feed', characteristic: 'Cool-season crop with mature grain spikes', season: 'Cool season' }, hi: { name: 'गेहूँ बीज', description: 'गेहूँ अनाज वाला बीज है, जिससे घास जैसे पौधे बनते हैं और पकने पर दानों से भरी बालियाँ आती हैं।', category: 'अनाज वाली फसल', uses: 'आटा, अनाज से बने खाद्य और पशु आहार', characteristic: 'पकी हुई अनाज की बालियों वाली ठंडे मौसम की फसल', season: 'ठंडा मौसम' } }
};

const SEED_INFO_LABELS = {
  en: { about: 'About this Seed', details: 'Detailed seed information', category: 'Seed category', uses: 'Common uses', characteristic: 'Growing characteristic', season: 'Growing season', fallback: 'Information about this seed will be available soon.', unavailable: 'Information coming soon' },
  hi: { about: 'इस बीज के बारे में', details: 'बीज की विस्तृत जानकारी', category: 'बीज की श्रेणी', uses: 'सामान्य उपयोग', characteristic: 'उगने की विशेषता', season: 'उगाने का मौसम', fallback: 'इस बीज की जानकारी जल्द उपलब्ध होगी।', unavailable: 'जानकारी जल्द उपलब्ध होगी' }
};

const SEED_API_URL = 'http://localhost:3000/api/seed-analysis';
const SEED_ASSET_ROOT = './assets';
const SEED_ASSET_FILES = {
  'Amla Seed': ['Amla (43).jpg', 'Amla (51).jpg'],
  'Apple Seed': ['Apple (1).jpg', 'Apple (56).jpg'],
  'Avocado Seed': ['original_013.jpg', 'original_064.jpg'],
  'Betel Nut Seed': ['Betel_Nut (10).jpg', 'Betel_Nut (14).jpg'],
  'Black Plum Seed': ['Black_Plum (11).jpg', 'Black_Plum (90).jpg'],
  'Corn Seed': ['corn-seeds-background-photo.jpg', 'corn-seeds-close-up-background-image-photo.jpg'],
  'Date Seed': ['Date (44).jpg', 'Date (90).jpg'],
  'Flax Seed': ['Linseed1.jpg', 'Linseed176.jpg'],
  'Hog Plum Seed': ['Hog_Plum (1).jpg', 'Hog_Plum (26).jpg'],
  'Jackfruit Seed': ['Jackfruit (11).jpg', 'Jackfruit (68).jpg'],
  'Litchi Seed': ['Litchi (1).jpg', 'Litchi (44).jpg'],
  'Mango Seed': ['Mango (30).jpg', 'Mango (51).jpg'],
  'Mustard Seed': ['MustardSeeds1.jpg', 'MustardSeeds1191.jpg'],
  'Olive Seed': ['Olive (1).jpg', 'Olive (90).jpg'],
  'Orange Seed': ['Orange (21).jpg', 'Orange (56).jpg'],
  'Paddy Seed': ['20200531_154520 (2).jpg', '20200531_162335 (2).jpg'],
  'Pumpkin Seed': ['Pumpkin (21).jpg', 'Pumpkin (66).jpg'],
  'Safflower Seed': ['SafflowerSeed1.jpg', 'SafflowerSeed653.jpg'],
  'Sapodilla Seed': ['Sapodilla (21).jpg', 'Sapodilla (90).jpg'],
  'Sesame Seed': ['BlackSesame1.jpg', 'WhiteSesameSeeds44.jpg'],
  'Soybean Seed': ['1.webp', 'soyabean-seeds-1000x1000.webp'],
  'Sunflower Seed': ['SunflowerSeeds40.jpg', 'SunflowerSeeds85.jpg'],
  'Tamarind Seed': ['Tamarind (1).jpg', 'Tamarind (56).jpg'],
  'Wheat Seed': ['1544-wheat-seeds-1000x1000.jpg', '2_wheat_001.jpg']
};
const AUTH_TOKEN_KEY = 'sagrivision-auth-token';
const SEED_IMAGE_SESSION_KEY = 'sagrivision-seed-image';
const SEED_RESULT_SESSION_KEY = 'sagrivision-seed-result';
const SEED_DETAIL_SESSION_KEY = 'sagrivision-seed-detail';

if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) window.location.replace('./login.html?returnTo=./seed-analysis.htm');

const MODEL_SEED_TYPES = [
  'Amla Seed',
  'Apple Seed',
  'Avocado Seed',
  'Betel Nut Seed',
  'Black Plum Seed',
  'Corn Seed',
  'Date Seed',
  'Flax Seed',
  'Hog Plum Seed',
  'Jackfruit Seed',
  'Litchi Seed',
  'Mango Seed',
  'Mustard Seed',
  'Olive Seed',
  'Orange Seed',
  'Paddy Seed',
  'Pumpkin Seed',
  'Safflower Seed',
  'Sapodilla Seed',
  'Sesame Seed',
  'Soybean Seed',
  'Sunflower Seed',
  'Tamarind Seed',
  'Wheat Seed'
];

function seedDictionary() { return SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en; }

function setImageError(message) { imageError.textContent = message; return !message; }

function handleFile(file, persist = true) {
  const dictionary = seedDictionary();
  if (!file) return;
  selectionVersion += 1;
  const validType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (!validType || file.size > 8 * 1024 * 1024) {
    setImageError(file.size > 8 * 1024 * 1024 ? dictionary.imageTooLarge : dictionary.invalidImage);
    return;
  }
  if (persist) {
    sessionStorage.removeItem(SEED_IMAGE_SESSION_KEY);
    const version = selectionVersion;
    fileAsDataUrl(file).then((image) => {
      if (version !== selectionVersion || selectedFile !== file) return;
      try { sessionStorage.setItem(SEED_IMAGE_SESSION_KEY, JSON.stringify({ image, name: file.name, type: file.type })); } catch { /* Session storage may be unavailable or full. */ }
    }).catch(() => {});
  }
  setImageError('');
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  seedPreview.src = previewUrl;
  document.querySelector('#file-name').textContent = file.name;
  document.querySelector('#file-size').textContent = `${(file.size / 1024).toFixed(0)} KB`;
  emptyUpload.hidden = true;
  previewUpload.hidden = false;
  analysisEmpty.hidden = false;
  analysisProgress.hidden = true;
  analysisResult.hidden = true;
}

galleryInput.addEventListener('change', () => handleFile(galleryInput.files[0]));
cameraInput.addEventListener('change', () => handleFile(cameraInput.files[0]));

function removeImage() {
  selectionVersion += 1;
  selectedFile = null;
  sessionStorage.removeItem(SEED_IMAGE_SESSION_KEY);
  galleryInput.value = '';
  cameraInput.value = '';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  seedPreview.removeAttribute('src');
  previewUpload.hidden = true;
  emptyUpload.hidden = false;
  setImageError('');
  resetAnalysis();
}

document.querySelector('#remove-image').addEventListener('click', removeImage);

function resetAnalysis() {
  analysisEmpty.hidden = false;
  analysisProgress.hidden = true;
  analysisResult.hidden = true;
  detectedSeedType = '';
  sessionStorage.removeItem(SEED_RESULT_SESSION_KEY);
  sessionStorage.removeItem(SEED_DETAIL_SESSION_KEY);
  seedInfoLink.hidden = true;
  seedInfoLink.setAttribute('aria-expanded', 'false');
  seedInfoPanel.hidden = true;
  seedDetailPanel.hidden = true;
  updateHeroVisual();
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('invalid-image'));
    reader.onerror = () => reject(new Error('network'));
    reader.readAsDataURL(file);
  });
}

function fileFromDataUrl(image, name, type) {
  const comma = image.indexOf(',');
  if (!image.startsWith('data:') || comma < 0) throw new Error('invalid-image');
  const encoded = image.slice(comma + 1);
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], name || 'seed-image', { type: type || image.slice(5, comma).split(';')[0] || 'application/octet-stream' });
}

async function restoreStoredImage() {
  const stored = sessionStorage.getItem(SEED_IMAGE_SESSION_KEY);
  if (!stored) return;
  const version = selectionVersion;
  try {
    const data = JSON.parse(stored);
    const file = fileFromDataUrl(data.image, data.name, data.type);
    if (version === selectionVersion && !selectedFile) handleFile(file, false);
  } catch {
    sessionStorage.removeItem(SEED_IMAGE_SESSION_KEY);
  }
}

function normalizeSeedType(seedType) {
  const normalized = String(seedType || '').trim();
  if (!normalized) return null;
  const normalizedBase = normalized.replace(/\s+Seed$/i, '').trim().toLowerCase();
  const modelType = MODEL_SEED_TYPES.find((seed) => seed.replace(/\s+Seed$/i, '').trim().toLowerCase() === normalizedBase);
  return modelType || null;
}

function seedInformationKey(seedType) {
  return String(seedType || '').trim().replace(/\s+Seed$/i, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function seedInformationRecord(seedType) {
  return SEED_INFORMATION[seedInformationKey(seedType)] || null;
}

function renderSeedInformation(seedType, reveal = true) {
  const language = getSagriLanguage() === 'hi' ? 'hi' : 'en';
  const labels = SEED_INFO_LABELS[language];
  const information = seedInformationRecord(seedType)?.[language] || seedInformationRecord(seedType)?.en;
  seedInfoLabels.forEach((label) => { label.textContent = labels[label.dataset.seedInfoLabel]; });
  seedInfoName.textContent = information?.name || seedType;
  seedInfoDescription.textContent = information?.description || labels.fallback;
  seedInfoCategory.textContent = information?.category || labels.unavailable;
  seedInfoUses.textContent = information?.uses || labels.unavailable;
  seedInfoCharacteristic.textContent = information?.characteristic || labels.unavailable;
  seedInfoSeason.textContent = information?.season || labels.unavailable;
  seedInfoPanel.hidden = !reveal;
}

function renderSeedDetails(seedType, reveal = false) {
  const language = getSagriLanguage() === 'hi' ? 'hi' : 'en';
  const labels = SEED_INFO_LABELS[language];
  const information = seedInformationRecord(seedType)?.[language] || seedInformationRecord(seedType)?.en;
  seedDetailName.textContent = information?.name || seedType;
  seedDetailSummary.textContent = information?.description || labels.fallback;
  seedDetailCategory.textContent = information?.category || labels.unavailable;
  seedDetailUses.textContent = information?.uses || labels.unavailable;
  seedDetailCharacteristic.textContent = information?.characteristic || labels.unavailable;
  seedDetailSeason.textContent = information?.season || labels.unavailable;
  seedDetailPanel.hidden = !reveal;
}

function formatConfidence(confidence) {
  if (typeof confidence === 'string' && confidence.trim()) return confidence.includes('%') ? confidence : `${confidence}%`;
  const numeric = Number(confidence);
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error('invalid-response');
  return `${numeric <= 1 ? Math.round(numeric * 100) : numeric}%`;
}

function preloadHeroSlide(slide) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(slide);
    image.onerror = () => resolve(null);
    image.src = slide.source;
  });
}

function seedAssetSlides(seedType) {
  const cropName = normalizeSeedType(seedType) || String(seedType || '').trim();
  const files = SEED_ASSET_FILES[cropName] || [];
  return files.map((file, index) => ({
    source: `${SEED_ASSET_ROOT}/${encodeURIComponent(cropName)}/${encodeURIComponent(file)}`,
    alt: `${cropName} seed photograph ${index + 1}`,
    seedType: cropName
  }));
}

function allSeedAssetSlides() {
  return MODEL_SEED_TYPES.flatMap((seedType) => seedAssetSlides(seedType));
}

async function renderHeroSlide() {
  if (!heroSlides.length) return;
  const renderVersion = ++heroRenderVersion;
  heroSlideIndex = (heroSlideIndex + heroSlides.length) % heroSlides.length;
  const current = heroSlides[heroSlideIndex];
  const support = heroSlides.find((slide, index) => index !== heroSlideIndex && slide.seedType === current.seedType) || null;
  const loadedSlides = await Promise.all([preloadHeroSlide(current), support ? preloadHeroSlide(support) : Promise.resolve(null)]);
  if (renderVersion !== heroRenderVersion || !loadedSlides[0]) return;
  seedHeroMedia.classList.remove('is-changing');
  void seedHeroMedia.offsetWidth;
  seedHeroMedia.classList.add('is-changing');
  seedHeroBadgeText.textContent = current.seedType || 'Seed Identification';
  seedHeroTitle.textContent = current.seedType || 'Seed Identification';
  seedHeroMain.src = loadedSlides[0].source;
  seedHeroMain.alt = current.alt;
  seedHeroMain.hidden = false;
  seedHeroMain.parentElement.hidden = false;
  seedHeroSupport.parentElement.hidden = !support;
  seedHeroSupport.hidden = !support;
  if (loadedSlides[1]) {
    seedHeroSupport.src = loadedSlides[1].source;
    seedHeroSupport.alt = loadedSlides[1].alt;
  }
  seedHeroDots.replaceChildren();
  heroSlides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Show farming visual ${index + 1}`);
    dot.setAttribute('aria-selected', index === heroSlideIndex ? 'true' : 'false');
    dot.className = index === heroSlideIndex ? 'is-active' : '';
    dot.addEventListener('click', () => {
      heroSlideIndex = index;
      renderHeroSlide();
      restartHeroRotation();
    });
    seedHeroDots.append(dot);
  });
}

function restartHeroRotation() {
  window.clearInterval(heroSlideTimer);
  heroSlideTimer = heroSlides.length > 1 ? window.setInterval(() => {
    heroSlideIndex += 1;
    renderHeroSlide();
  }, 6000) : null;
}

async function setHeroCollection(slides, version) {
  const validSlides = (await Promise.all(slides.map(preloadHeroSlide))).filter(Boolean);
  if (version !== heroVisualVersion) return;
  heroSlides = validSlides;
  if (!heroSlides.length) {
    seedHeroMain.removeAttribute('src');
    seedHeroMain.hidden = true;
    seedHeroMain.parentElement.hidden = true;
    seedHeroSupport.removeAttribute('src');
    seedHeroSupport.hidden = true;
    seedHeroSupport.parentElement.hidden = true;
    seedHeroMedia.hidden = false;
    seedHeroDots.replaceChildren();
    return;
  }
  seedHeroMedia.hidden = false;
  heroSlideIndex = 0;
  renderHeroSlide();
  restartHeroRotation();
}

function updateHeroVisual(seedType = '') {
  heroVisualVersion += 1;
  const version = heroVisualVersion;
  window.clearInterval(heroSlideTimer);
  heroRenderVersion += 1;
  heroSlides = [];
  heroSlideIndex = 0;
  seedHeroMedia.hidden = true;
  seedHeroDots.replaceChildren();
  const detected = String(seedType || '').trim();
  seedHeroBadgeText.textContent = detected ? 'Detected Crop' : 'Seed Identification';
  seedHeroTitle.textContent = detected ? `${detected} Detected` : 'Seed Identification';
  seedHeroStatus.textContent = detected ? 'Images from the detected crop folder' : 'Exploring supported crops';
  setHeroCollection(detected ? seedAssetSlides(detected) : allSeedAssetSlides(), version);
}

function showResult(response) {
  const rawSeedType = typeof response.seedType === 'string' ? response.seedType.trim() : '';
  const predicted = normalizeSeedType(rawSeedType) || rawSeedType;
  if (!predicted) throw new Error('invalid-response');
  const confidence = formatConfidence(response.confidence);
  detectedSeedType = predicted;
  try { sessionStorage.setItem(SEED_RESULT_SESSION_KEY, JSON.stringify({ seedType: predicted, confidence })); } catch { /* Session storage may be unavailable or full. */ }
  document.querySelector('#predicted-seed').textContent = predicted;
  document.querySelector('#seed-confidence').textContent = confidence;
  analysisEmpty.hidden = true;
  seedInfoLink.hidden = !detectedSeedType;
  seedInfoLink.setAttribute('aria-expanded', 'false');
  renderSeedInformation(detectedSeedType, true);
  renderSeedDetails(detectedSeedType, false);
  updateHeroVisual(detectedSeedType);
  analysisProgress.hidden = true;
  analysisResult.hidden = false;
}

async function requestSeedAnalysis(payload) {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error('missing-token');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(SEED_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    if (response.status === 401) throw new Error('unauthorized');
    if (response.status >= 500) throw new Error('server');
    if (!response.ok) throw new Error('invalid-response');
    if (!body || typeof body.seedType !== 'string' || body.confidence == null) throw new Error('invalid-response');
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function startAnalysis() {
  const dictionary = seedDictionary();
  if (!selectedFile) { setImageError(dictionary.imageRequired); return; }
  if (analysisInFlight) return;
  if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) { setImageError(dictionary.seedMissingToken); return; }
  setImageError('');
  analysisInFlight = true;
  analyzeButton.disabled = true;
  analysisEmpty.hidden = true;
  analysisResult.hidden = true;
  analysisProgress.hidden = false;
  detectedSeedType = '';
  sessionStorage.removeItem(SEED_RESULT_SESSION_KEY);
  sessionStorage.removeItem(SEED_DETAIL_SESSION_KEY);
  seedInfoLink.hidden = true;
  seedInfoLink.setAttribute('aria-expanded', 'false');
  seedInfoPanel.hidden = true;
  seedDetailPanel.hidden = true;
  updateHeroVisual();
  try {
    const image = await fileAsDataUrl(selectedFile);
    const response = await requestSeedAnalysis({ image, mimeType: selectedFile.type, filename: selectedFile.name });
    showResult(response);
  } catch (error) {
    const message = error.name === 'AbortError' ? dictionary.seedTimeout : error instanceof TypeError ? dictionary.seedNetwork : error.message === 'missing-token' ? dictionary.seedMissingToken : error.message === 'unauthorized' ? dictionary.seedUnauthorized : error.message === 'server' ? dictionary.seedServer : dictionary.seedInvalidResponse;
    setImageError(message);
    analysisProgress.hidden = true;
    analysisResult.hidden = true;
    analysisEmpty.hidden = false;
  } finally {
    analysisInFlight = false;
    analyzeButton.disabled = false;
    analysisProgress.hidden = true;
  }
}

analyzeButton.addEventListener('click', startAnalysis);
seedInfoLink.addEventListener('click', () => {
  if (!detectedSeedType) return;
  const information = seedInformationRecord(detectedSeedType);
  const assets = SEED_ASSET_FILES[detectedSeedType] || [];
  try { sessionStorage.setItem(SEED_DETAIL_SESSION_KEY, JSON.stringify({ seedType: detectedSeedType, information, assets })); } catch { /* Session storage may be unavailable or full. */ }
  window.location.assign('./seed-information.html');
});

seedHeroPrevious.addEventListener('click', () => {
  heroSlideIndex -= 1;
  renderHeroSlide();
  restartHeroRotation();
});
seedHeroNext.addEventListener('click', () => {
  heroSlideIndex += 1;
  renderHeroSlide();
  restartHeroRotation();
});

document.addEventListener('sagri-language-change', () => {
  if (detectedSeedType) {
    renderSeedInformation(detectedSeedType, true);
    renderSeedDetails(detectedSeedType, !seedDetailPanel.hidden);
  }
});

updateHeroVisual();
restoreStoredImage();

function restoreStoredAnalysis() {
  const stored = sessionStorage.getItem(SEED_RESULT_SESSION_KEY);
  if (!stored) return;
  try {
    const result = JSON.parse(stored);
    if (result && typeof result.seedType === 'string' && result.seedType.trim() && result.confidence != null) showResult(result);
  } catch {
    sessionStorage.removeItem(SEED_RESULT_SESSION_KEY);
  }
}

restoreStoredAnalysis();
