"""Trusted agricultural resources (government / ICAR / State Agricultural Universities).

IMPORTANT: this project does NOT ship a made-up list of soil-testing labs. Lab
addresses change and any hard-coded list would go stale or be wrong. Instead the
"nearby labs" feature
  1. detects the farmer's state/district (browser location -> OpenStreetMap
     Nominatim reverse geocoding, or manual selection),
  2. links to the official Soil Health Card portal, which is the authoritative
     lab/registration system run by the Department of Agriculture & Farmers
     Welfare, and
  3. opens a map search for "soil testing laboratory" around the district.
Websites can change; links are listed so a person can verify them.
"""
from urllib.parse import quote_plus


def B(en, hi):
    return {"en": en, "hi": hi}


STATE_HI = {
    "Andhra Pradesh": "आंध्र प्रदेश", "Arunachal Pradesh": "अरुणाचल प्रदेश", "Assam": "असम",
    "Bihar": "बिहार", "Chhattisgarh": "छत्तीसगढ़", "Delhi": "दिल्ली", "Goa": "गोवा",
    "Gujarat": "गुजरात", "Haryana": "हरियाणा", "Himachal Pradesh": "हिमाचल प्रदेश",
    "Jammu and Kashmir": "जम्मू और कश्मीर", "Jharkhand": "झारखंड", "Karnataka": "कर्नाटक",
    "Kerala": "केरल", "Madhya Pradesh": "मध्य प्रदेश", "Maharashtra": "महाराष्ट्र",
    "Manipur": "मणिपुर", "Meghalaya": "मेघालय", "Mizoram": "मिज़ोरम", "Nagaland": "नागालैंड",
    "Odisha": "ओडिशा", "Puducherry": "पुदुचेरी", "Punjab": "पंजाब", "Rajasthan": "राजस्थान", "Sikkim": "सिक्किम",
    "Tamil Nadu": "तमिलनाडु", "Telangana": "तेलंगाना", "Tripura": "त्रिपुरा",
    "Uttar Pradesh": "उत्तर प्रदेश", "Uttarakhand": "उत्तराखंड", "West Bengal": "पश्चिम बंगाल",
}


# Hindi names for ALL 55 crops in the dataset (shown next to the English name everywhere)
CROP_HI = {
    "Arecanut": "सुपारी", "Arhar/Tur": "अरहर (तुअर)", "Bajra": "बाजरा", "Banana": "केला", "Barley": "जौ",
    "Black pepper": "काली मिर्च", "Cardamom": "इलायची", "Cashewnut": "काजू", "Castor seed": "अरंडी",
    "Coconut": "नारियल", "Coriander": "धनिया", "Cotton(lint)": "कपास (रुई)", "Cowpea(Lobia)": "लोबिया",
    "Dry chillies": "सूखी मिर्च", "Garlic": "लहसुन", "Ginger": "अदरक", "Gram": "चना", "Groundnut": "मूँगफली",
    "Guar seed": "ग्वार", "Horse-gram": "कुलथी", "Jowar": "ज्वार", "Jute": "जूट (पटसन)", "Khesari": "खेसारी",
    "Linseed": "अलसी", "Maize": "मक्का", "Masoor": "मसूर", "Mesta": "मेस्टा (अंबाड़ी)", "Moong(Green Gram)": "मूँग",
    "Moth": "मोठ", "Niger seed": "रामतिल", "Oilseeds total": "कुल तिलहन", "Onion": "प्याज़",
    "Other Cereals": "अन्य अनाज", "Other Kharif pulses": "अन्य खरीफ दलहन", "Other Rabi pulses": "अन्य रबी दलहन",
    "Other Summer Pulses": "अन्य जायद दलहन", "Peas & beans (Pulses)": "मटर व सेम (दलहन)", "Potato": "आलू",
    "Ragi": "रागी (मंडुआ)", "Rapeseed &Mustard": "सरसों (राई)", "Rice": "धान (चावल)", "Safflower": "कुसुम",
    "Sannhamp": "सनई", "Sesamum": "तिल", "Small millets": "छोटे मिलेट (कदन्न)", "Soyabean": "सोयाबीन",
    "Sugarcane": "गन्ना", "Sunflower": "सूरजमुखी", "Sweet potato": "शकरकंद", "Tapioca": "टैपिओका (कसावा)",
    "Tobacco": "तंबाकू", "Turmeric": "हल्दी", "Urad": "उड़द", "Wheat": "गेहूँ", "other oilseeds": "अन्य तिलहन",
}

SEASON_HI = {"Kharif": "खरीफ", "Rabi": "रबी", "Summer": "जायद (गर्मी)", "Autumn": "शरद",
             "Winter": "शीत", "Whole Year": "पूरे वर्ष"}

KISAN_CALL_CENTRE = "1800-180-1551"

NATIONAL = [
    {"id": "shc", "cat": "soil", "url": "https://soilhealth.dac.gov.in",
     "name": B("Soil Health Card portal", "मृदा स्वास्थ्य कार्ड पोर्टल"),
     "desc": B("Official portal for soil test results, Soil Health Cards and registered soil testing labs.",
               "मिट्टी जाँच परिणाम, मृदा स्वास्थ्य कार्ड और पंजीकृत मृदा जाँच प्रयोगशालाओं का आधिकारिक पोर्टल।")},
    {"id": "kvk", "cat": "advice", "url": "https://kvk.icar.gov.in",
     "name": B("Krishi Vigyan Kendra (KVK) - ICAR", "कृषि विज्ञान केंद्र (KVK) - ICAR"),
     "desc": B("District farm-science centres: soil tests, training, crop and pest advice. Find your district KVK.",
               "ज़िला कृषि-विज्ञान केंद्र: मिट्टी जाँच, प्रशिक्षण, फसल व कीट सलाह। अपने ज़िले का KVK खोजें।")},
    {"id": "icar", "cat": "advice", "url": "https://icar.org.in",
     "name": B("ICAR - Indian Council of Agricultural Research", "ICAR - भारतीय कृषि अनुसंधान परिषद"),
     "desc": B("National research system: varieties, technologies and publications.", "राष्ट्रीय अनुसंधान तंत्र: किस्में, तकनीकें व प्रकाशन।")},
    {"id": "nbss", "cat": "soil", "url": "https://nbsslup.icar.gov.in",
     "name": B("ICAR-NBSS&LUP (soil survey)", "ICAR-NBSS&LUP (मृदा सर्वेक्षण)"),
     "desc": B("National Bureau of Soil Survey and Land Use Planning: soil maps and land-use information.",
               "राष्ट्रीय मृदा सर्वेक्षण एवं भूमि उपयोग नियोजन ब्यूरो: मिट्टी के नक्शे व भूमि उपयोग जानकारी।")},
    {"id": "farmer", "cat": "advice", "url": "https://farmer.gov.in",
     "name": B("Farmers' Portal (Govt. of India)", "किसान पोर्टल (भारत सरकार)"),
     "desc": B("Schemes, advisories, market and weather links in one place.", "योजनाएँ, सलाह, मंडी व मौसम की कड़ियाँ एक जगह।")},
    {"id": "imd", "cat": "weather", "url": "https://mausam.imd.gov.in",
     "name": B("India Meteorological Department (IMD)", "भारत मौसम विज्ञान विभाग (IMD)"),
     "desc": B("Official forecasts, district agromet advisories and the monsoon outlook.", "आधिकारिक पूर्वानुमान, ज़िला कृषि-मौसम सलाह और मानसून आउटलुक।")},
    {"id": "agmark", "cat": "market", "url": "https://agmarknet.gov.in",
     "name": B("Agmarknet (mandi prices)", "एगमार्कनेट (मंडी भाव)"),
     "desc": B("Daily market arrivals and prices - use it to judge profitability, which this app does not.",
               "मंडी की दैनिक आवक व भाव - लाभ का अंदाज़ा इससे लगाएँ; यह ऐप लाभ का आकलन नहीं करता।")},
    {"id": "pmfby", "cat": "scheme", "url": "https://pmfby.gov.in",
     "name": B("PM Fasal Bima Yojana (crop insurance)", "प्रधानमंत्री फसल बीमा योजना"),
     "desc": B("Crop insurance against yield loss from weather and pests.", "मौसम व कीटों से उपज नुकसान के विरुद्ध फसल बीमा।")},
    {"id": "pmksy", "cat": "scheme", "url": "https://pmksy.gov.in",
     "name": B("PMKSY - 'Per Drop More Crop'", "PMKSY - 'पर ड्रॉप मोर क्रॉप'"),
     "desc": B("Support for micro-irrigation (drip and sprinkler).", "सूक्ष्म सिंचाई (ड्रिप व स्प्रिंकलर) के लिए सहायता।")},
    {"id": "pmkisan", "cat": "scheme", "url": "https://pmkisan.gov.in",
     "name": B("PM-KISAN", "पीएम-किसान"), "desc": B("Income support scheme for farmer families.", "किसान परिवारों के लिए आय सहायता योजना।")},
    {"id": "ppqs", "cat": "plant", "url": "https://ppqs.gov.in",
     "name": B("Plant Protection, Quarantine & Storage", "पौध संरक्षण, संगरोध एवं भंडारण निदेशालय"),
     "desc": B("Government plant-protection information and registered pesticide guidance.", "सरकारी पौध-संरक्षण जानकारी व पंजीकृत कीटनाशक मार्गदर्शन।")},
]

# State Agricultural Universities (official sites; verify before relying on them)
SAU = {
    "Punjab": [("Punjab Agricultural University, Ludhiana", "https://www.pau.edu")],
    "Haryana": [("CCS Haryana Agricultural University, Hisar", "https://hau.ac.in")],
    "Uttar Pradesh": [("C.S. Azad Univ. of Agriculture & Technology, Kanpur", "https://csauk.ac.in")],
    "Uttarakhand": [("G.B. Pant Univ. of Agriculture & Technology, Pantnagar", "https://www.gbpuat.ac.in")],
    "Bihar": [("Bihar Agricultural University, Sabour", "https://www.bausabour.ac.in"),
              ("Dr. Rajendra Prasad Central Agricultural University, Pusa", "https://www.rpcau.ac.in")],
    "Madhya Pradesh": [("Jawaharlal Nehru Krishi Vishwa Vidyalaya, Jabalpur", "https://www.jnkvv.org")],
    "Chhattisgarh": [("Indira Gandhi Krishi Vishwavidyalaya, Raipur", "https://igkv.ac.in")],
    "Maharashtra": [("Mahatma Phule Krishi Vidyapeeth, Rahuri", "https://mpkv.ac.in")],
    "Gujarat": [("Anand Agricultural University", "https://www.aau.in")],
    "Karnataka": [("University of Agricultural Sciences, Bengaluru", "https://uasbangalore.edu.in")],
    "Tamil Nadu": [("Tamil Nadu Agricultural University (Agritech Portal)", "https://agritech.tnau.ac.in")],
    "Kerala": [("Kerala Agricultural University", "https://kau.in")],
    "Andhra Pradesh": [("Acharya N.G. Ranga Agricultural University", "https://angrau.ac.in")],
    "Telangana": [("Prof. Jayashankar Telangana Agricultural University", "https://pjtsau.edu.in")],
    "Odisha": [("Odisha University of Agriculture & Technology", "https://ouat.ac.in")],
    "West Bengal": [("Bidhan Chandra Krishi Viswavidyalaya", "https://bckv.edu.in")],
    "Assam": [("Assam Agricultural University, Jorhat", "https://www.aau.ac.in")],
    "Himachal Pradesh": [("Dr. Y.S. Parmar Univ. of Horticulture & Forestry", "https://yspuniversity.ac.in")],
    "Jammu and Kashmir": [("SKUAST (Jammu / Kashmir)", "https://skuast.org")],
    "Manipur": [("Central Agricultural University, Imphal", "https://cau.ac.in")],
}


def lab_finder_links(state=None, district=None):
    """Links only - no invented lab names. Returns list of {name, url}."""
    place = ", ".join(p for p in [district, state] if p) or "India"
    q = quote_plus(f"soil testing laboratory near {place}")
    q2 = quote_plus(f"Krishi Vigyan Kendra {place}")
    return [
        {"name": B("Official soil testing labs (Soil Health Card portal)", "आधिकारिक मृदा जाँच प्रयोगशालाएँ (मृदा स्वास्थ्य कार्ड पोर्टल)"),
         "url": "https://soilhealth.dac.gov.in", "official": True},
        {"name": B(f"Map search: soil testing laboratory near {place}", f"नक्शे में खोजें: {place} के पास मिट्टी जाँच प्रयोगशाला"),
         "url": f"https://www.google.com/maps/search/?api=1&query={q}", "official": False},
        {"name": B(f"Map search: Krishi Vigyan Kendra near {place}", f"नक्शे में खोजें: {place} के पास कृषि विज्ञान केंद्र"),
         "url": f"https://www.google.com/maps/search/?api=1&query={q2}", "official": False},
        {"name": B("Find your district KVK (ICAR)", "अपने ज़िले का KVK खोजें (ICAR)"),
         "url": "https://kvk.icar.gov.in", "official": True},
    ]


def resources_for(state=None, district=None):
    return {
        "helpline": {"name": B("Kisan Call Centre (toll-free)", "किसान कॉल सेंटर (टोल-फ्री)"), "number": KISAN_CALL_CENTRE},
        "labs": lab_finder_links(state, district),
        "universities": [{"name": n, "url": u} for n, u in SAU.get(state, [])],
        "national": NATIONAL,
        "how_to_sample": B(
            "How to take a soil sample: walk a zig-zag path across the field, take 8-10 small samples from 15 cm depth "
            "(avoid bunds, manure heaps and wet spots), mix, and send about half a kilogram, labelled with your name, field and crop.",
            "मिट्टी का नमूना कैसे लें: खेत में टेढ़े-मेढ़े (ज़िग-ज़ैग) चलकर 15 सेमी गहराई से 8-10 छोटे नमूने लें "
            "(मेड़, खाद के ढेर व गीली जगह से बचें), मिलाएँ और लगभग आधा किलो मिट्टी अपना नाम, खेत व फसल लिखकर भेजें।"),
        "disclaimer": B("Links are to official/academic sites. Websites change; confirm details with your local KVK or agriculture office.",
                        "कड़ियाँ आधिकारिक/शैक्षणिक साइटों की हैं। वेबसाइटें बदलती रहती हैं; जानकारी की पुष्टि स्थानीय KVK या कृषि कार्यालय से करें।"),
    }
