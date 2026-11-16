"""Rule-based agronomic knowledge (NOT learned from the CSV).

The CSV has no soil, temperature, irrigation, fertilizer-dose or disease data,
so these modules are curated reference knowledge. Values are *indicative ranges
that appear in common ICAR / State Agricultural University packages of
practices*. Doses and calendars vary by state, variety and soil test, so every
screen that shows them tells the farmer to confirm with a Soil Health Card /
the local KVK. No pesticide product names or doses are given on purpose.
"""


def B(en, hi):
    return {"en": en, "hi": hi}


# ------------------------------------------------------------------ season map
SEASON_GROUP = {"Autumn": "Kharif", "Winter": "Rabi"}   # dataset season -> KB season

# ---------------------------------------------------------------------- soils
SOIL_TYPES = ["alluvial", "black", "red", "laterite", "sandy_arid", "hill", "saline_alkaline"]

SOILS = {
    "alluvial": {
        "name": B("Alluvial soil", "जलोढ़ (कछारी) मिट्टी"),
        "where": B("Indo-Gangetic plains, river deltas (Punjab, Haryana, UP, Bihar, West Bengal, Assam, coastal deltas)",
                   "सिंधु-गंगा के मैदान व नदी डेल्टा (पंजाब, हरियाणा, उ.प्र., बिहार, प.बंगाल, असम, तटीय डेल्टा)"),
        "traits": B("Deep, loamy to silty, good water holding. Usually rich in potash, often low in nitrogen and organic carbon.",
                    "गहरी, दोमट से गादयुक्त, पानी रोकने की अच्छी क्षमता। प्रायः पोटाश अधिक, नाइट्रोजन व जैविक कार्बन कम।"),
        "ph": "6.5 - 8.5",
        "care": B("Add farmyard manure/compost and rotate with pulses to lift nitrogen and organic matter; level fields for even irrigation.",
                  "नाइट्रोजन व जैविक पदार्थ बढ़ाने के लिए गोबर की खाद/कम्पोस्ट डालें और दलहन के साथ फसल चक्र अपनाएँ; सिंचाई के लिए खेत समतल रखें।"),
    },
    "black": {
        "name": B("Black soil (Regur)", "काली मिट्टी (रेगुर)"),
        "where": B("Deccan plateau: Maharashtra, Madhya Pradesh, Gujarat, parts of Karnataka, Telangana, Andhra Pradesh",
                   "दक्कन पठार: महाराष्ट्र, म.प्र., गुजरात, कर्नाटक, तेलंगाना, आंध्र प्रदेश के हिस्से"),
        "traits": B("Clayey, holds a lot of moisture, swells when wet and cracks when dry. Rich in calcium/magnesium, usually low in nitrogen, phosphorus and organic matter.",
                    "चिकनी, नमी खूब रोकती है, गीली होने पर फूलती और सूखने पर फटती है। कैल्शियम/मैग्नीशियम अधिक; नाइट्रोजन, फॉस्फोरस व जैविक पदार्थ प्रायः कम।"),
        "ph": "7.2 - 8.5",
        "care": B("Provide drainage in heavy rain; avoid working the soil when wet; add organic matter and phosphorus as per soil test.",
                  "भारी बारिश में जल निकास रखें; गीली मिट्टी में जुताई न करें; मिट्टी जाँच के अनुसार जैविक खाद व फॉस्फोरस दें।"),
    },
    "red": {
        "name": B("Red soil", "लाल मिट्टी"),
        "where": B("Tamil Nadu, Karnataka, Andhra Pradesh, Telangana, Odisha, Jharkhand, Chhattisgarh",
                   "तमिलनाडु, कर्नाटक, आंध्र प्रदेश, तेलंगाना, ओडिशा, झारखंड, छत्तीसगढ़"),
        "traits": B("Light texture, well drained, red from iron. Low in nitrogen, phosphorus and humus; moisture holding is modest.",
                    "हल्की बनावट, अच्छा जल निकास, लोहे के कारण लाल। नाइट्रोजन, फॉस्फोरस व ह्यूमस कम; नमी रोकने की क्षमता मध्यम।"),
        "ph": "5.5 - 7.0",
        "care": B("Build organic matter, use mulch and soil-moisture conservation; apply nitrogen and phosphorus in split doses.",
                  "जैविक पदार्थ बढ़ाएँ, मल्च व नमी-संरक्षण अपनाएँ; नाइट्रोजन व फॉस्फोरस को टुकड़ों में दें।"),
    },
    "laterite": {
        "name": B("Laterite soil", "लैटेराइट मिट्टी"),
        "where": B("Kerala, coastal Karnataka & Maharashtra, Western/Eastern Ghats, parts of Odisha and the North-East",
                   "केरल, तटीय कर्नाटक व महाराष्ट्र, पश्चिमी/पूर्वी घाट, ओडिशा व उत्तर-पूर्व के हिस्से"),
        "traits": B("Acidic, leached by heavy rain, low in nutrients and organic matter; hardens on drying.",
                    "अम्लीय, भारी वर्षा से पोषक तत्व बह जाते हैं; पोषक तत्व व जैविक पदार्थ कम; सूखने पर कड़ी हो जाती है।"),
        "ph": "4.5 - 6.5",
        "care": B("Liming and organic manure as advised by the soil test; use mulching and cover crops to stop erosion.",
                  "मिट्टी जाँच के अनुसार चूना व जैविक खाद; कटाव रोकने के लिए मल्चिंग व आवरण फसलें।"),
    },
    "sandy_arid": {
        "name": B("Sandy / arid soil", "रेतीली / शुष्क मिट्टी"),
        "where": B("Rajasthan, south-west Haryana and Punjab, Kutch and north Gujarat",
                   "राजस्थान, द.प. हरियाणा व पंजाब, कच्छ व उत्तर गुजरात"),
        "traits": B("Coarse, drains fast, very low organic matter and water holding; can be salty in low spots.",
                    "मोटे कण, पानी तेज़ी से निकलता है, जैविक पदार्थ व जल-धारण बहुत कम; निचले हिस्सों में खारापन संभव।"),
        "ph": "7.5 - 8.5",
        "care": B("Frequent light irrigation (sprinkler/drip), generous organic manure, mulch and wind breaks.",
                  "बार-बार हल्की सिंचाई (स्प्रिंकलर/ड्रिप), भरपूर जैविक खाद, मल्च व वायु-रोधक पेड़।"),
    },
    "hill": {
        "name": B("Hill / forest soil", "पहाड़ी / वन मिट्टी"),
        "where": B("Himalayan states (J&K, Himachal, Uttarakhand), Sikkim, North-East hills",
                   "हिमालयी राज्य (जम्मू-कश्मीर, हिमाचल, उत्तराखंड), सिक्किम, उत्तर-पूर्व की पहाड़ियाँ"),
        "traits": B("Shallow on slopes, rich in humus under forest, often acidic; erosion-prone.",
                    "ढलानों पर उथली, वन क्षेत्र में ह्यूमस अधिक, प्रायः अम्लीय; कटाव की आशंका।"),
        "ph": "5.0 - 6.5",
        "care": B("Terracing, contour farming, cover crops and liming if the soil test shows acidity.",
                  "सीढ़ीदार खेत, कंटूर खेती, आवरण फसलें और जाँच में अम्लता आने पर चूना।"),
    },
    "saline_alkaline": {
        "name": B("Saline / alkaline soil (Usar, Reh)", "लवणीय / क्षारीय मिट्टी (ऊसर, रेह)"),
        "where": B("Patches in UP, Haryana, Punjab, Gujarat, Rajasthan, Maharashtra and coastal areas",
                   "उ.प्र., हरियाणा, पंजाब, गुजरात, राजस्थान, महाराष्ट्र व तटीय क्षेत्रों में पैच"),
        "traits": B("High salts or sodium; white crust on surface, poor structure, hard when dry; pH often above 8.5.",
                    "लवण या सोडियम अधिक; सतह पर सफेद परत, खराब संरचना, सूखने पर कड़ी; pH प्रायः 8.5 से ऊपर।"),
        "ph": "> 8.5",
        "care": B("Needs reclamation planned from a soil test (amendments such as gypsum for sodic soil, drainage, good-quality water). Grow tolerant crops meanwhile. Ask your KVK for the exact plan.",
                  "सुधार की योजना मिट्टी जाँच से बनती है (क्षारीय में जिप्सम जैसे सुधारक, जल निकास, अच्छी गुणवत्ता का पानी)। तब तक सहनशील फसलें उगाएँ। सटीक योजना के लिए KVK से पूछें।"),
    },
}

FERTILITY_LEVELS = ["low", "medium", "high"]   # as shown on a Soil Health Card (N, P, K ratings)

# --------------------------------------------------------------------- disease text
KIND = {
    "fungal": B("Fungal", "फफूंद जनित"), "bacterial": B("Bacterial", "जीवाणु जनित"),
    "viral": B("Virus / virus-like", "विषाणु / विषाणु-जैसा"), "insect": B("Insect pest", "कीट"),
}
MANAGEMENT = {
    "fungal": B("Use certified, treated seed; avoid dense sowing and waterlogging; remove infected crop residue; prefer resistant varieties. Spray a fungicide only after your KVK/agriculture officer confirms the disease, and use only a CIB&RC-registered product exactly as per its label.",
                "प्रमाणित, उपचारित बीज लें; घनी बुवाई व जलभराव से बचें; संक्रमित अवशेष हटाएँ; प्रतिरोधी किस्में चुनें। फफूंदनाशी तभी छिड़कें जब KVK/कृषि अधिकारी रोग की पुष्टि करें, और केवल CIB&RC-पंजीकृत दवा लेबल के अनुसार ही उपयोग करें।"),
    "bacterial": B("Avoid excess nitrogen, keep drainage good, use resistant varieties and clean seed, disinfect tools, and do not move water from infected fields. Get the diagnosis confirmed by your KVK before any spray.",
                   "नाइट्रोजन अधिक न दें, जल निकास रखें, प्रतिरोधी किस्में व साफ बीज लें, औज़ार साफ रखें, संक्रमित खेत का पानी दूसरे खेत में न जाने दें। कोई भी छिड़काव करने से पहले KVK से पुष्टि कराएँ।"),
    "viral": B("Viruses cannot be cured. Remove and destroy infected plants early, control the insect that spreads it (whitefly, aphid, mite) using IPM, sow on time and use resistant varieties.",
               "विषाणु रोग का इलाज नहीं होता। संक्रमित पौधों को जल्दी उखाड़कर नष्ट करें, फैलाने वाले कीट (सफेद मक्खी, माहू, माइट) को IPM से रोकें, समय पर बुवाई करें और प्रतिरोधी किस्में लें।"),
    "insect": B("Scout the field every week. Use pheromone/light traps, sticky traps and neem-based products first (IPM) and protect natural enemies. Use chemical sprays only on KVK/plant-protection advice, as per label, and avoid spraying in strong wind or just before rain.",
                "हर सप्ताह खेत की निगरानी करें। पहले फेरोमोन/प्रकाश जाल, चिपचिपे जाल व नीम-आधारित उत्पाद (IPM) अपनाएँ और मित्र कीटों को बचाएँ। रासायनिक छिड़काव केवल KVK/पौध-संरक्षण सलाह पर, लेबल के अनुसार करें; तेज़ हवा या बारिश से ठीक पहले छिड़काव न करें।"),
}


def D(en, hi, kind, sym_en, sym_hi):
    return {"name": B(en, hi), "kind": kind, "symptoms": B(sym_en, sym_hi)}


# ----------------------------------------------------------------------- crops
# soil: good / ok (anything else = poor).  water: 0 low, 1 medium, 2 high.
# temp: optimal mean temperature range during the growing season (deg C).
# npk: indicative kg/ha ranges (N, P2O5, K2O).
CROPS = {
    "Rice": dict(
        hi="धान (चावल)", seasons=["Kharif", "Rabi", "Summer"], water=2, temp=(20, 35),
        soil=dict(good=["alluvial"], ok=["black", "red", "laterite", "hill", "saline_alkaline"]),
        npk=((100, 120), (50, 60), (40, 40)),
        sowing=B("Kharif: nursery in June, transplant late June-July. Dry-season (Boro/Summer) rice in some states: Dec-Feb.",
                 "खरीफ: जून में नर्सरी, जून अंत-जुलाई में रोपाई। कुछ राज्यों में गर्मी/बोरो धान: दिसंबर-फरवरी।"),
        irrigation=B("Keep shallow water after transplanting. Most sensitive: tillering, panicle initiation and flowering. Alternate wetting and drying (AWD) can save water. Drain the field 7-10 days before harvest.",
                     "रोपाई के बाद उथला पानी रखें। सबसे संवेदनशील अवस्थाएँ: कल्ले फूटना, बाली बनना व फूल आना। एक-एक दिन छोड़कर सिंचाई (AWD) से पानी बचता है। कटाई से 7-10 दिन पहले पानी निकाल दें।"),
        tips=[B("Use certified seed of a variety recommended for your state; treat seed before sowing.",
                "अपने राज्य के लिए अनुशंसित किस्म का प्रमाणित बीज लें; बुवाई से पहले बीज उपचार करें।"),
              B("Split nitrogen into 2-3 doses (basal, tillering, panicle initiation) to cut losses.",
                "नाइट्रोजन को 2-3 बार (बेसल, कल्ले, बाली बनते समय) में दें, ताकि नुकसान घटे।")],
        diseases=[D("Blast", "झोंका (ब्लास्ट)", "fungal", "Spindle-shaped grey-centred spots on leaves; the neck of the panicle turns black and breaks.", "पत्तियों पर आँख जैसे भूरे-धूसर धब्बे; बाली की गर्दन काली होकर टूट जाती है।"),
                  D("Bacterial leaf blight", "जीवाणु पत्ती झुलसा", "bacterial", "Leaf tips turn yellow-white and dry from the edges; worse after storms and with heavy nitrogen.", "पत्तियाँ सिरे से पीली-सफेद होकर किनारों से सूखती हैं; तूफान और अधिक नाइट्रोजन के बाद बढ़ता है।"),
                  D("Stem borer", "तना छेदक", "insect", "Central shoot dries in young plants (dead heart); white empty panicles later.", "छोटे पौधों में बीच की गाभ सूखती है (डेड हार्ट); बाद में सफेद खाली बालियाँ।")]),
    "Wheat": dict(
        hi="गेहूँ", seasons=["Rabi"], water=1, temp=(10, 25),
        soil=dict(good=["alluvial", "black"], ok=["red", "hill", "sandy_arid", "saline_alkaline"]),
        npk=((120, 150), (60, 60), (40, 40)),
        sowing=B("Timely sowing: roughly the first fortnight of November in the plains (varies by state); late sowing after late November lowers yield.",
                 "समय पर बुवाई: मैदानों में लगभग नवंबर का पहला पखवाड़ा (राज्य अनुसार बदलता है); नवंबर के अंत के बाद देर से बुवाई से उपज घटती है।"),
        irrigation=B("Six critical stages: crown root initiation (20-25 days), tillering, jointing, flowering, milk, dough. If only one irrigation is possible, give it at crown root initiation.",
                     "छह क्रांतिक अवस्थाएँ: ताज-जड़ बनना (20-25 दिन), कल्ले, गाँठ बनना, फूल, दूधिया, दाना भरना। केवल एक सिंचाई संभव हो तो ताज-जड़ अवस्था पर दें।"),
        tips=[B("Use a variety released for your zone and sowing date; seed treatment protects against smuts.",
                "अपने क्षेत्र व बुवाई-तिथि की अनुशंसित किस्म लें; बीज उपचार से कंडुआ से बचाव होता है।"),
              B("Apply half of nitrogen plus all phosphorus and potash at sowing; the rest after the first irrigation.",
                "आधा नाइट्रोजन व पूरा फॉस्फोरस-पोटाश बुवाई पर दें; शेष नाइट्रोजन पहली सिंचाई के बाद।")],
        diseases=[D("Yellow rust", "पीला रतुआ", "fungal", "Yellow powdery stripes on leaves; spreads in cool, humid weather.", "पत्तियों पर पीली धारियाँ व पाउडर जैसा चूर्ण; ठंडे नम मौसम में फैलता है।"),
                  D("Karnal bunt", "करनाल बंट", "fungal", "Some grains turn black with a fishy smell; follows cloudy, rainy weather at flowering.", "कुछ दाने काले व मछली जैसी गंध वाले; फूल आते समय बादल-बारिश के बाद।"),
                  D("Aphid", "माहू (एफिड)", "insect", "Small green insects on leaves and ears with sticky honeydew.", "पत्तियों व बालियों पर छोटे हरे कीट और चिपचिपा रस।")]),
    "Maize": dict(
        hi="मक्का", seasons=["Kharif", "Rabi", "Summer"], water=1, temp=(21, 30),
        soil=dict(good=["alluvial", "red"], ok=["black", "hill", "laterite"]),
        npk=((120, 150), (60, 60), (40, 40)),
        sowing=B("Kharif: June-July with onset of monsoon. Rabi (peninsular/eastern India): October-November. Spring/summer: February-March where irrigated.",
                 "खरीफ: मानसून आने पर जून-जुलाई। रबी (दक्षिण/पूर्वी भारत): अक्टूबर-नवंबर। जायद: सिंचित क्षेत्रों में फरवरी-मार्च।"),
        irrigation=B("Most sensitive at knee-high, tasseling/silking and grain filling; silking is the most critical. Do not let water stand in the field.",
                     "घुटने की ऊँचाई, झंडा/रेशम निकलने व दाना भरने पर सबसे संवेदनशील; रेशम निकलना सबसे क्रांतिक। खेत में पानी खड़ा न रहने दें।"),
        tips=[B("Maintain good plant population and weed the field in the first 30-40 days.", "पौधों की उचित संख्या रखें और पहले 30-40 दिन में निराई करें।"),
              B("Check leaf whorls weekly for fall armyworm from seedling stage.", "अंकुर अवस्था से हर सप्ताह गोभ में फॉल आर्मीवर्म की जाँच करें।")],
        diseases=[D("Fall armyworm", "फॉल आर्मीवर्म", "insect", "Ragged holes in leaves and sawdust-like droppings inside the whorl.", "पत्तियों में छेद और गोभ के अंदर बुरादे जैसा मल।"),
                  D("Turcicum leaf blight", "पत्ती झुलसा (टर्सिकम)", "fungal", "Long, cigar-shaped grey-green lesions on leaves.", "पत्तियों पर लंबे, सिगार जैसे धूसर-हरे धब्बे।")]),
    "Bajra": dict(
        hi="बाजरा", seasons=["Kharif", "Summer"], water=0, temp=(25, 35),
        soil=dict(good=["sandy_arid", "alluvial", "red"], ok=["black", "laterite"]),
        npk=((40, 80), (20, 40), (0, 20)),
        sowing=B("Kharif: late June to mid-July with first good rain.", "खरीफ: जून के अंत से मध्य जुलाई, पहली अच्छी बारिश के साथ।"),
        irrigation=B("Mostly rainfed. If possible, give protective irrigation at tillering and flowering during a dry spell.",
                     "अधिकांशतः वर्षा आधारित। संभव हो तो सूखे के समय कल्ले व फूल अवस्था पर सुरक्षात्मक सिंचाई दें।"),
        tips=[B("Use downy-mildew-resistant hybrids and treated seed.", "मृदुरोमिल आसिता प्रतिरोधी संकर किस्में व उपचारित बीज लें।"),
              B("Thin seedlings 2-3 weeks after sowing to keep proper spacing.", "बुवाई के 2-3 सप्ताह बाद पौधे विरल करके उचित दूरी रखें।")],
        diseases=[D("Downy mildew (green ear)", "मृदुरोमिल आसिता (हरी बाली)", "fungal", "Yellow-green stripes on leaves; the ear turns into leafy green growth.", "पत्तियों पर पीली-हरी धारियाँ; बाली पत्ती जैसी हरी हो जाती है।"),
                  D("Ergot", "अरगट (चेपा)", "fungal", "Sticky honey-like drops on ears that later become dark hard bodies.", "बालियों पर शहद जैसी बूँदें जो बाद में काली सख्त संरचनाएँ बनती हैं।")]),
    "Jowar": dict(
        hi="ज्वार", seasons=["Kharif", "Rabi"], water=0, temp=(25, 32),
        soil=dict(good=["black", "alluvial"], ok=["red", "sandy_arid", "laterite"]),
        npk=((60, 100), (30, 40), (0, 40)),
        sowing=B("Kharif: June-July. Rabi (Maharashtra/Karnataka, stored soil moisture): September-October.",
                 "खरीफ: जून-जुलाई। रबी (महाराष्ट्र/कर्नाटक, संचित नमी पर): सितंबर-अक्टूबर।"),
        irrigation=B("Drought tolerant. Critical stages: boot-leaf, flowering and grain filling; give protective irrigation if available.",
                     "सूखा सहनशील। क्रांतिक अवस्थाएँ: गाभ, फूल व दाना भरना; उपलब्ध हो तो सुरक्षात्मक सिंचाई दें।"),
        tips=[B("Sow early to escape shoot fly attack.", "प्ररोह मक्खी से बचने के लिए जल्दी बुवाई करें।"),
              B("Harvest at physiological maturity to avoid grain mold in rains.", "बारिश में दाना फफूंद से बचने के लिए शारीरिक परिपक्वता पर कटाई करें।")],
        diseases=[D("Grain mold", "दाना फफूंद", "fungal", "Pink or black mold on grains when rain falls near maturity.", "पकने के समय बारिश होने पर दानों पर गुलाबी या काली फफूंद।"),
                  D("Shoot fly", "प्ररोह मक्खी", "insect", "Dead heart in seedlings 1-4 weeks after germination.", "अंकुरण के 1-4 सप्ताह में पौधे की गाभ सूख जाती है।")]),
    "Ragi": dict(
        hi="रागी (मंडुआ)", seasons=["Kharif", "Summer"], water=0, temp=(20, 30),
        soil=dict(good=["red"], ok=["laterite", "hill", "alluvial"]),
        npk=((50, 60), (25, 40), (25, 40)),
        sowing=B("Kharif: June-July (direct sowing or transplanting 4-week seedlings).", "खरीफ: जून-जुलाई (सीधी बुवाई या 4 सप्ताह की पौध रोपाई)।"),
        irrigation=B("Mostly rainfed; protect crop from moisture stress at flowering and grain filling.", "अधिकांशतः वर्षा आधारित; फूल व दाना भरते समय नमी की कमी से बचाएँ।"),
        tips=[B("Transplanting seedlings generally gives better stands than broadcasting.", "छिटकवाँ की तुलना में पौध रोपाई से प्रायः बेहतर फसल मिलती है।")],
        diseases=[D("Blast", "झोंका (ब्लास्ट)", "fungal", "Brown leaf spots; neck/finger blast leaves chaffy grain.", "पत्तियों पर भूरे धब्बे; गर्दन/उँगली झुलसने से दाने खोखले।")]),
    "Gram": dict(
        hi="चना", seasons=["Rabi"], water=0, temp=(15, 25),
        soil=dict(good=["black", "alluvial"], ok=["red", "sandy_arid"]),
        npk=((15, 25), (40, 60), (0, 20)),
        sowing=B("Rainfed: mid-October; irrigated: late October to mid-November.", "बारानी: मध्य अक्टूबर; सिंचित: अक्टूबर अंत से मध्य नवंबर।"),
        irrigation=B("Usually 1-2 light irrigations: at branching and at pod filling. Excess irrigation promotes leaf growth over pods.",
                     "प्रायः 1-2 हल्की सिंचाई: शाखाएँ निकलते व फली भरते समय। अधिक सिंचाई से फलियों की जगह पत्तियाँ बढ़ती हैं।"),
        tips=[B("Treat seed with Rhizobium culture and fungicide to cut wilt.", "उकठा घटाने के लिए बीज को राइजोबियम कल्चर व फफूंदनाशी से उपचारित करें।")],
        diseases=[D("Fusarium wilt", "उकठा रोग", "fungal", "Plants droop and dry suddenly; brown streak inside the stem.", "पौधे अचानक मुरझाकर सूखते हैं; तने के अंदर भूरी धारी।"),
                  D("Pod borer", "फली छेदक", "insect", "Round holes in pods; caterpillar feeds on grains.", "फलियों में गोल छेद; इल्ली दाने खाती है।")]),
    "Arhar/Tur": dict(
        hi="अरहर (तुअर)", seasons=["Kharif"], water=0, temp=(20, 30),
        soil=dict(good=["alluvial", "black", "red"], ok=["laterite"]),
        npk=((20, 25), (40, 60), (0, 20)),
        sowing=B("June-July with monsoon onset.", "जून-जुलाई, मानसून आने पर।"),
        irrigation=B("Mostly rainfed. Irrigate at flowering and pod development if dry. Very sensitive to waterlogging; keep drainage.",
                     "अधिकांशतः वर्षा आधारित। सूखे में फूल व फली बनते समय सिंचाई करें। जलभराव के प्रति बहुत संवेदनशील; जल निकास रखें।"),
        tips=[B("Ridge-furrow or raised-bed sowing reduces waterlogging damage.", "मेड़-नाली या ऊँची क्यारी में बुवाई से जलभराव का नुकसान घटता है।")],
        diseases=[D("Fusarium wilt", "उकठा रोग", "fungal", "Patches of plants yellow, wilt and dry; dark streaks inside stem.", "पौधों के टुकड़ों में पीलापन, मुरझाना व सूखना; तने के अंदर काली धारियाँ।"),
                  D("Sterility mosaic", "बंध्यता मोज़ेक", "viral", "Bushy, pale plants with small leaves and no flowers; spread by mites.", "झाड़ीनुमा हल्के पौधे, छोटी पत्तियाँ, फूल नहीं; माइट से फैलता है।"),
                  D("Pod borer", "फली छेदक", "insect", "Holes in pods and damaged seeds.", "फलियों में छेद व क्षतिग्रस्त दाने।")]),
    "Moong(Green Gram)": dict(
        hi="मूँग", seasons=["Kharif", "Summer"], water=0, temp=(25, 35),
        soil=dict(good=["alluvial", "red"], ok=["black", "sandy_arid", "laterite"]),
        npk=((15, 20), (40, 50), (0, 20)),
        sowing=B("Kharif: July; summer (irrigated): March-April.", "खरीफ: जुलाई; जायद (सिंचित): मार्च-अप्रैल।"),
        irrigation=B("Short-duration crop; irrigate at flowering and pod filling if dry. Avoid waterlogging.", "कम अवधि की फसल; सूखे में फूल व फली भरते समय सिंचाई करें। जलभराव से बचें।"),
        tips=[B("Sow resistant varieties and control whitefly early to limit yellow mosaic.", "प्रतिरोधी किस्में बोएँ और पीला मोज़ेक रोकने के लिए सफेद मक्खी पर शुरू में नियंत्रण रखें।")],
        diseases=[D("Yellow mosaic virus", "पीला मोज़ेक विषाणु", "viral", "Bright yellow patches on leaves; spread by whitefly.", "पत्तियों पर चमकीले पीले धब्बे; सफेद मक्खी से फैलता है।"),
                  D("Cercospora leaf spot", "सर्कोस्पोरा पत्ती धब्बा", "fungal", "Circular brown spots with grey centres on leaves.", "पत्तियों पर गोल भूरे धब्बे, बीच में धूसर।")]),
    "Urad": dict(
        hi="उड़द", seasons=["Kharif", "Summer"], water=0, temp=(25, 35),
        soil=dict(good=["alluvial", "black"], ok=["red", "laterite"]),
        npk=((15, 20), (40, 50), (0, 20)),
        sowing=B("Kharif: late June-July; summer: March.", "खरीफ: जून अंत-जुलाई; जायद: मार्च।"),
        irrigation=B("Mostly rainfed; irrigate at flowering and pod filling in dry spells; keep field drained.", "अधिकांशतः वर्षा आधारित; सूखे में फूल व फली भरते समय सिंचाई; खेत में जल निकास रखें।"),
        tips=[B("Use Rhizobium-treated seed; it helps fix nitrogen.", "राइजोबियम-उपचारित बीज लें; इससे नाइट्रोजन स्थिरीकरण होता है।")],
        diseases=[D("Yellow mosaic virus", "पीला मोज़ेक विषाणु", "viral", "Bright yellow patches on leaves; spread by whitefly.", "पत्तियों पर चमकीले पीले धब्बे; सफेद मक्खी से फैलता है।"),
                  D("Powdery mildew", "चूर्णिल आसिता", "fungal", "White powdery coating on leaves.", "पत्तियों पर सफेद चूर्ण जैसी परत।")]),
    "Masoor": dict(
        hi="मसूर", seasons=["Rabi"], water=0, temp=(15, 25),
        soil=dict(good=["alluvial"], ok=["black", "red"]),
        npk=((20, 25), (40, 50), (20, 20)),
        sowing=B("Mid-October to mid-November.", "मध्य अक्टूबर से मध्य नवंबर।"),
        irrigation=B("1-2 light irrigations at pre-flowering and pod filling.", "फूल से पहले व फली भरते समय 1-2 हल्की सिंचाई।"),
        tips=[B("Seed treatment with Rhizobium and a fungicide helps stand establishment.", "राइजोबियम व फफूंदनाशी से बीज उपचार जमाव में मदद करता है।")],
        diseases=[D("Rust", "रतुआ", "fungal", "Orange-brown pustules on leaves and stems.", "पत्तियों व तनों पर नारंगी-भूरे उभार।"),
                  D("Wilt", "उकठा", "fungal", "Sudden drooping and drying of plants.", "पौधों का अचानक मुरझाकर सूखना।")]),
    "Groundnut": dict(
        hi="मूँगफली", seasons=["Kharif", "Rabi", "Summer"], water=1, temp=(22, 30),
        soil=dict(good=["red", "sandy_arid"], ok=["alluvial", "laterite", "black"]),
        npk=((20, 25), (40, 60), (30, 40)),
        sowing=B("Kharif: June-July. Rabi/summer (irrigated, south & west): Dec-Jan.", "खरीफ: जून-जुलाई। रबी/जायद (सिंचित, दक्षिण व पश्चिम): दिसंबर-जनवरी।"),
        irrigation=B("Critical: flowering, pegging (pegs entering soil) and pod development. Keep soil moist but not waterlogged; calcium (gypsum) at pegging as locally advised.",
                     "क्रांतिक: फूल, खूँटी (पेग) का मिट्टी में जाना व फली विकास। मिट्टी नम रखें, जलभराव न हो; स्थानीय सलाह पर खूँटी अवस्था में कैल्शियम (जिप्सम)।"),
        tips=[B("Light, well-drained soil makes pod harvesting easier.", "हल्की, अच्छे जल-निकास वाली मिट्टी में फली खुदाई आसान होती है।"),
              B("Dry pods well before storage to avoid aflatoxin-producing mold.", "भंडारण से पहले फलियाँ अच्छी तरह सुखाएँ, ताकि एफ्लाटॉक्सिन वाली फफूंद न लगे।")],
        diseases=[D("Tikka leaf spot", "टिक्का (पत्ती धब्बा)", "fungal", "Dark circular spots with yellow halo; leaves drop early.", "पीले घेरे वाले गहरे गोल धब्बे; पत्ते जल्दी झड़ते हैं।"),
                  D("Collar rot", "कॉलर रॉट", "fungal", "Seedlings wilt at soil level; black mold at the collar.", "अंकुर भूमि के पास से सड़कर मुरझाते हैं; गर्दन पर काली फफूंद।")]),
    "Soyabean": dict(
        hi="सोयाबीन", seasons=["Kharif"], water=1, temp=(20, 30),
        soil=dict(good=["black", "alluvial"], ok=["red"]),
        npk=((20, 30), (60, 80), (20, 40)),
        sowing=B("Late June to first week of July, after 100 mm of rain has wet the soil.", "जून अंत से जुलाई के पहले सप्ताह तक, लगभग 100 मिमी वर्षा से मिट्टी भीगने के बाद।"),
        irrigation=B("Mostly rainfed. Sensitive to dry spells at flowering and pod filling; drain excess water.", "अधिकांशतः वर्षा आधारित। फूल व फली भरते समय सूखे के प्रति संवेदनशील; अतिरिक्त पानी निकालें।"),
        tips=[B("Use fresh, high-germination seed (soybean seed loses viability fast) and treat with Rhizobium.", "ताज़ा, अच्छे जमाव वाला बीज लें (सोयाबीन बीज जल्दी खराब होता है) और राइजोबियम से उपचारित करें।")],
        diseases=[D("Yellow mosaic", "पीला मोज़ेक", "viral", "Yellow patches on leaves; spread by whitefly.", "पत्तियों पर पीले धब्बे; सफेद मक्खी से फैलता है।"),
                  D("Rust", "गेरुआ (रस्ट)", "fungal", "Small brown pustules on the underside of leaves.", "पत्तियों की निचली सतह पर छोटे भूरे उभार।"),
                  D("Girdle beetle", "गर्डल बीटल", "insect", "Ring-like cuts on stems; upper part wilts.", "तने पर छल्ले जैसे कटाव; ऊपरी भाग मुरझाता है।")]),
    "Rapeseed &Mustard": dict(
        hi="सरसों (राई)", seasons=["Rabi"], water=0, temp=(15, 25),
        soil=dict(good=["alluvial"], ok=["sandy_arid", "black", "saline_alkaline", "red"]),
        npk=((60, 100), (30, 40), (20, 40)),
        sowing=B("October (rainfed: early October; irrigated: up to late October).", "अक्टूबर (बारानी: शुरुआती अक्टूबर; सिंचित: अक्टूबर अंत तक)।"),
        irrigation=B("Usually 1-2 irrigations: at branching (about 30 days) and flowering/pod formation (about 60-70 days).", "प्रायः 1-2 सिंचाई: शाखा निकलते (लगभग 30 दिन) व फूल/फली बनते समय (लगभग 60-70 दिन)।"),
        tips=[B("Sulphur supports oil content; apply as advised by soil test.", "सल्फर से तेल की मात्रा बढ़ती है; मिट्टी जाँच की सलाह से दें।")],
        diseases=[D("Alternaria blight", "अल्टरनेरिया झुलसा", "fungal", "Dark concentric-ring spots on leaves and pods.", "पत्तियों व फलियों पर गहरे छल्लेदार धब्बे।"),
                  D("White rust", "सफेद रतुआ", "fungal", "White blisters under leaves; swollen, distorted flower heads.", "पत्तियों के नीचे सफेद फफोले; फूल की बाली फूलकर टेढ़ी।"),
                  D("Aphid", "माहू", "insect", "Colonies of small insects on flowering shoots; honeydew.", "फूल वाली टहनियों पर छोटे कीटों के झुंड; चिपचिपा रस।")]),
    "Sunflower": dict(
        hi="सूरजमुखी", seasons=["Kharif", "Rabi", "Summer"], water=1, temp=(20, 28),
        soil=dict(good=["black", "alluvial", "red"], ok=["sandy_arid", "laterite"]),
        npk=((60, 90), (40, 60), (40, 40)),
        sowing=B("Rabi: October-November; spring: January-February; Kharif: June-July (south/central).", "रबी: अक्टूबर-नवंबर; बसंत: जनवरी-फरवरी; खरीफ: जून-जुलाई (दक्षिण/मध्य)।"),
        irrigation=B("Critical: bud formation, flowering and seed filling.", "क्रांतिक: कली बनना, फूल आना व दाना भरना।"),
        tips=[B("Hand-pollination or bee activity during flowering improves seed set.", "फूल अवस्था में हाथ से परागण या मधुमक्खियों की सक्रियता से दाने बेहतर भरते हैं।")],
        diseases=[D("Alternaria leaf blight", "अल्टरनेरिया पत्ती झुलसा", "fungal", "Dark brown spots with rings on leaves.", "पत्तियों पर छल्लेदार गहरे भूरे धब्बे।"),
                  D("Rust", "रतुआ", "fungal", "Brown powdery pustules on leaf undersides.", "पत्तियों के नीचे भूरे चूर्ण जैसे उभार।")]),
    "Sesamum": dict(
        hi="तिल", seasons=["Kharif", "Summer"], water=0, temp=(25, 35),
        soil=dict(good=["sandy_arid", "red", "alluvial"], ok=["laterite", "black"]),
        npk=((30, 60), (20, 40), (20, 20)),
        sowing=B("Kharif: late June-July; summer: February-March.", "खरीफ: जून अंत-जुलाई; जायद: फरवरी-मार्च।"),
        irrigation=B("Mostly rainfed; irrigate at flowering and capsule formation if dry. Does not tolerate waterlogging.", "अधिकांशतः वर्षा आधारित; सूखे में फूल व फली बनते समय सिंचाई। जलभराव सहन नहीं करता।"),
        tips=[B("Mix the very fine seed with sand for even sowing.", "बहुत महीन बीज को रेत में मिलाकर बोएँ, ताकि समान फैलाव हो।")],
        diseases=[D("Phyllody", "फिलोडी", "viral", "Flowers turn into green leaf-like structures; no capsules; spread by leafhopper.", "फूल हरी पत्ती जैसी संरचना में बदलते हैं; फलियाँ नहीं बनतीं; फुदका (लीफहॉपर) से फैलता है।"),
                  D("Alternaria leaf spot", "अल्टरनेरिया पत्ती धब्बा", "fungal", "Brown spots on leaves in humid weather.", "नम मौसम में पत्तियों पर भूरे धब्बे।")]),
    "Cotton(lint)": dict(
        hi="कपास", seasons=["Kharif"], water=1, temp=(21, 32),
        soil=dict(good=["black"], ok=["alluvial", "red", "sandy_arid"]),
        npk=((100, 150), (50, 60), (50, 60)),
        sowing=B("North India: April-May (irrigated); central/south: June-July with monsoon.", "उत्तर भारत: अप्रैल-मई (सिंचित); मध्य/दक्षिण: मानसून पर जून-जुलाई।"),
        irrigation=B("Critical: squaring, flowering and boll development. Reduce water late in the season so bolls open. Drip suits hybrids.", "क्रांतिक: चौकोर कली, फूल व टिंडा विकास। सीजन के अंत में पानी घटाएँ ताकि टिंडे खुलें। संकर किस्मों के लिए ड्रिप उपयुक्त।"),
        tips=[B("Rainfed crops need lower nitrogen than irrigated hybrids; follow your state's recommendation.", "वर्षा आधारित कपास में सिंचित संकर से कम नाइट्रोजन चाहिए; अपने राज्य की अनुशंसा मानें।"),
              B("Follow the local pink-bollworm management advisory (timely sowing, refuge, destroying residues).", "स्थानीय गुलाबी सुंडी प्रबंधन सलाह मानें (समय पर बुवाई, शरण-पंक्तियाँ, अवशेष नष्ट करना)।")],
        diseases=[D("Pink bollworm", "गुलाबी सुंडी", "insect", "Rosetted flowers, tiny exit holes in bolls, stained lint.", "बंद गुलाब जैसे फूल, टिंडों में छोटे छेद, दागदार रूई।"),
                  D("Leaf curl virus (whitefly-borne)", "पत्ती मरोड़ विषाणु (सफेद मक्खी)", "viral", "Leaves curl upward, veins thicken, plants stunted.", "पत्तियाँ ऊपर मुड़ती हैं, नसें मोटी, पौधे बौने।")]),
    "Sugarcane": dict(
        hi="गन्ना", seasons=["Whole Year"], water=2, temp=(20, 35),
        soil=dict(good=["alluvial", "black"], ok=["red", "laterite"]),
        npk=((200, 280), (60, 100), (60, 120)),
        sowing=B("Spring planting: February-March; autumn planting: September-October (state-wise).", "बसंतकालीन: फरवरी-मार्च; शरदकालीन: सितंबर-अक्टूबर (राज्य अनुसार)।"),
        irrigation=B("Needs the most water. Critical: germination, tillering and the grand-growth phase. Drip + fertigation can save water and raise yield.", "सबसे अधिक पानी चाहिए। क्रांतिक: अंकुरण, कल्ले व भारी बढ़वार अवस्था। ड्रिप + फर्टिगेशन से पानी बचता है और उपज बढ़ती है।"),
        tips=[B("Plant disease-free setts from a trusted nursery; treat setts before planting.", "विश्वसनीय नर्सरी से रोगमुक्त टुकड़े लें; रोपण से पहले उपचारित करें।")],
        diseases=[D("Red rot", "लाल सड़न", "fungal", "Red inner tissue with white cross-patches and sour smell; top leaves dry.", "अंदर लाल गूदा, सफेद आड़े धब्बे, खट्टी गंध; ऊपरी पत्ते सूखते हैं।"),
                  D("Early shoot borer", "अगेती तना बेधक", "insect", "Dead heart in young shoots with bored holes.", "छोटे कल्लों में डेड हार्ट; छेद दिखते हैं।"),
                  D("Smut", "कंडुआ", "fungal", "A black whip-like structure grows from the top of the cane.", "गन्ने के शीर्ष से काला चाबुक जैसा निकलता है।")]),
    "Jute": dict(
        hi="जूट (पटसन)", seasons=["Kharif"], water=2, temp=(24, 37),
        soil=dict(good=["alluvial"], ok=["laterite", "red"]),
        npk=((40, 60), (20, 30), (20, 40)),
        sowing=B("March-May depending on variety and rainfall.", "किस्म व वर्षा के अनुसार मार्च-मई।"),
        irrigation=B("Needs high humidity and well-distributed rain; irrigate in dry spells during early growth.", "अधिक आर्द्रता व अच्छी वर्षा चाहिए; शुरुआती बढ़वार में सूखे के समय सिंचाई।"),
        tips=[B("Retting in clean, slow-moving water gives better fibre quality.", "साफ, धीमे बहते पानी में सड़ाने (रेटिंग) से रेशे की गुणवत्ता बेहतर होती है।")],
        diseases=[D("Stem rot", "तना सड़न", "fungal", "Brown-black lesions on stems damage fibre.", "तने पर भूरे-काले धब्बे; रेशा खराब।"),
                  D("Hairy caterpillar", "रोएँदार इल्ली", "insect", "Hairy caterpillars strip the leaves.", "रोएँदार इल्लियाँ पत्तियाँ चट कर जाती हैं।")]),
    "Potato": dict(
        hi="आलू", seasons=["Rabi"], water=1, temp=(15, 22),
        soil=dict(good=["alluvial", "hill"], ok=["red", "sandy_arid"]),
        npk=((120, 180), (60, 90), (100, 120)),
        sowing=B("Plains: October-November. Hills: spring (March-April).", "मैदान: अक्टूबर-नवंबर। पहाड़: बसंत (मार्च-अप्रैल)।"),
        irrigation=B("Light, frequent irrigation; critical at tuber initiation and bulking. Avoid heavy flooding. Stop shortly before haulm cutting.", "हल्की, बार-बार सिंचाई; कंद बनने व मोटे होने पर क्रांतिक। भारी भराव से बचें। हरी पत्तियाँ काटने से कुछ पहले बंद करें।"),
        tips=[B("Use healthy certified seed tubers; watch the weather for late blight in cool, cloudy, humid spells.", "स्वस्थ प्रमाणित बीज कंद लें; ठंडे, बादल वाले, नम मौसम में पछेती झुलसा के लिए मौसम पर नज़र रखें।")],
        diseases=[D("Late blight", "पछेती झुलसा", "fungal", "Water-soaked dark patches on leaves, white growth beneath; spreads fast in cool, humid, cloudy weather.", "पत्तियों पर पानी जैसे गहरे धब्बे, नीचे सफेद फफूंद; ठंडे, नम, बादल वाले मौसम में तेज़ी से फैलता है।"),
                  D("Early blight", "अगेती झुलसा", "fungal", "Concentric brown rings on older leaves.", "पुरानी पत्तियों पर छल्लेदार भूरे धब्बे।")]),
    "Onion": dict(
        hi="प्याज", seasons=["Rabi", "Kharif"], water=1, temp=(13, 25),
        soil=dict(good=["alluvial", "black"], ok=["red", "sandy_arid"]),
        npk=((100, 125), (50, 60), (50, 60)),
        sowing=B("Rabi: nursery in October-November, transplant December-January. Kharif/late-kharif varieties exist for some states.", "रबी: अक्टूबर-नवंबर में नर्सरी, दिसंबर-जनवरी में रोपाई। कुछ राज्यों के लिए खरीफ/पछेती खरीफ किस्में।"),
        irrigation=B("Light, frequent irrigation; critical at bulb initiation and enlargement. Stop 10-15 days before harvest for better storage.", "हल्की, बार-बार सिंचाई; कंद बनने व बढ़ने पर क्रांतिक। बेहतर भंडारण के लिए कटाई से 10-15 दिन पहले बंद करें।"),
        tips=[B("Cure bulbs in shade before storage in a ventilated place.", "भंडारण से पहले कंदों को छाया में सुखाएँ और हवादार जगह रखें।")],
        diseases=[D("Purple blotch", "बैंगनी धब्बा", "fungal", "Purple-brown sunken spots with yellow halo on leaves.", "पत्तियों पर पीले घेरे वाले बैंगनी-भूरे धँसे धब्बे।"),
                  D("Thrips", "थ्रिप्स", "insect", "Silvery streaks on leaves; tips curl and dry.", "पत्तियों पर चाँदी जैसी धारियाँ; सिरे मुड़कर सूखते हैं।")]),
    "Barley": dict(
        hi="जौ", seasons=["Rabi"], water=0, temp=(12, 25),
        soil=dict(good=["alluvial", "sandy_arid"], ok=["saline_alkaline", "black", "hill"]),
        npk=((60, 80), (30, 40), (20, 30)),
        sowing=B("Late October to November.", "अक्टूबर अंत से नवंबर।"),
        irrigation=B("2-3 irrigations: crown root initiation, tillering/jointing and flowering.", "2-3 सिंचाई: ताज-जड़ अवस्था, कल्ले/गाँठ व फूल आने पर।"),
        tips=[B("Relatively tolerant of salinity and dry conditions, so useful on marginal land.", "लवणता व सूखे के प्रति अपेक्षाकृत सहनशील, इसलिए सीमांत भूमि के लिए उपयोगी।")],
        diseases=[D("Yellow rust", "पीला रतुआ", "fungal", "Yellow stripes of powder on leaves.", "पत्तियों पर पीले चूर्ण की धारियाँ।"),
                  D("Loose smut", "खुली कंडुआ", "fungal", "Ears replaced by a black powdery mass at flowering.", "फूल आने पर बालियाँ काले चूर्ण में बदल जाती हैं।")]),
}

# --------------------------------------------------------------- fertilizer math
# Common Indian fertilizer products (nutrient content) and bag sizes
FERT = {"urea": {"N": 0.46, "bag": 45}, "dap": {"N": 0.18, "P2O5": 0.46, "bag": 50},
        "mop": {"K2O": 0.60, "bag": 50}}


def fertilizer_plan(crop: str, fertility: str, area_ha: float):
    """Indicative NPK range -> product quantities for the given area.

    fertility: low|medium|high (Soil Health Card rating). Low -> upper end of the
    range, high -> lower end, medium -> midpoint. If fertility unknown -> medium.
    """
    c = CROPS[crop]
    pos = {"low": 1.0, "medium": 0.5, "high": 0.0}.get(fertility, 0.5)
    n, p, k = (lo + (hi - lo) * pos for lo, hi in c["npk"])
    dap = p / FERT["dap"]["P2O5"]
    n_from_dap = dap * FERT["dap"]["N"]
    urea = max(0.0, (n - n_from_dap) / FERT["urea"]["N"])
    mop = k / FERT["mop"]["K2O"]
    per_ha = {"N": round(n), "P2O5": round(p), "K2O": round(k),
              "urea_kg": round(urea), "dap_kg": round(dap), "mop_kg": round(mop)}
    total = {k_: round(v * area_ha, 1) for k_, v in per_ha.items()}
    bags = {"urea": round(total["urea_kg"] / FERT["urea"]["bag"], 1),
            "dap": round(total["dap_kg"] / FERT["dap"]["bag"], 1),
            "mop": round(total["mop_kg"] / FERT["mop"]["bag"], 1)}
    return {"range": {"N": c["npk"][0], "P2O5": c["npk"][1], "K2O": c["npk"][2]},
            "per_ha": per_ha, "total_for_area": total, "bags": bags, "fertility_used": fertility}


def crop_names():
    return list(CROPS.keys())
