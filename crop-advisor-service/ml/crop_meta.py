"""Crop metadata that is NOT in the CSV: crop group and yield unit.

Why this exists
---------------
The CSV gives Production and Yield without units. Following the convention of
Indian official agricultural statistics (Directorate of Economics & Statistics),
Area is in hectares and Production in tonnes, EXCEPT a few crops reported in
other units. The dataset itself shows this: Coconut "yield" is ~8,000 per ha
(nuts, not tonnes) and fibre crops are small numbers consistent with bales.

`unit_confidence` is "assumed" for the non-tonne units because the CSV does not
state them. Verify against the original source before publishing figures.
"""

GROUPS = {
    "cereal": ["Rice", "Wheat", "Maize", "Bajra", "Jowar", "Ragi", "Barley",
               "Small millets", "Other Cereals"],
    "pulse": ["Gram", "Arhar/Tur", "Moong(Green Gram)", "Urad", "Masoor",
              "Khesari", "Moth", "Horse-gram", "Cowpea(Lobia)",
              "Peas & beans (Pulses)", "Other Rabi pulses",
              "Other Kharif pulses", "Other Summer Pulses"],
    "oilseed": ["Groundnut", "Soyabean", "Rapeseed &Mustard", "Sunflower",
                "Sesamum", "Castor seed", "Safflower", "Linseed", "Niger seed",
                "Oilseeds total", "other oilseeds"],
    "fibre": ["Cotton(lint)", "Jute", "Mesta", "Sannhamp"],
    "sugar": ["Sugarcane"],
    "tuber": ["Potato", "Sweet potato", "Tapioca"],
    "vegetable_spice": ["Onion", "Garlic", "Ginger", "Turmeric", "Dry chillies",
                        "Coriander"],
    "plantation": ["Coconut", "Arecanut", "Banana", "Cashewnut", "Black pepper",
                   "Cardamom"],
    "other": ["Tobacco", "Guar seed"],
}
CROP_GROUP = {c: g for g, cs in GROUPS.items() for c in cs}

# Aggregate rows ("Other ...", "... total") are not a single crop -> never recommended.
AGGREGATE_CROPS = {"Oilseeds total", "other oilseeds", "Other Cereals",
                   "Other Rabi pulses", "Other Kharif pulses",
                   "Other Summer Pulses", "Small millets",
                   "Peas & beans (Pulses)"}

DEFAULT_UNIT = "t/ha"
UNITS = {
    "Coconut": ("nuts/ha", "nuts", "assumed"),
    "Cotton(lint)": ("bales/ha (170 kg)", "bales (170 kg)", "assumed"),
    "Jute": ("bales/ha (180 kg)", "bales (180 kg)", "assumed"),
    "Mesta": ("bales/ha (180 kg)", "bales (180 kg)", "assumed"),
    "Sannhamp": ("bales/ha (180 kg)", "bales (180 kg)", "assumed"),
}


def crop_group(crop: str) -> str:
    return CROP_GROUP.get(crop, "other")


def unit_info(crop: str) -> dict:
    """-> {'yield_unit', 'production_unit', 'tonnes': bool, 'confidence'}"""
    if crop in UNITS:
        y, p, conf = UNITS[crop]
        return {"yield_unit": y, "production_unit": p, "tonnes": False, "confidence": conf}
    return {"yield_unit": "t/ha", "production_unit": "tonnes", "tonnes": True,
            "confidence": "assumed"}
