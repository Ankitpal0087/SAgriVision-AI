/* Government support prices (MSP) used ONLY as a reference to compare with the farmer's own mandi rate.
   MSP is a minimum purchase price, NOT today's mandi price. Live mandi rates: https://agmarknet.gov.in
   Sources: Union Cabinet decisions, Rabi MSP for marketing season 2027-28 (30 Sep 2026) and
   Kharif MSP for 2026-27 (May 2026). `cost` = CACP projected all-India cost A2+FL per quintal (incl. family labour).
   Only values found in published announcements are listed; verify at desagri.gov.in / agricoop.gov.in. */
window.PRICES = {
  tags: {
    rabi: { en: "Rabi 2027-28 MSP (announced 30 Sep 2026)", hi: "रबी 2027-28 का MSP (30 सितंबर 2026 को घोषित)" },
    kharif: { en: "Kharif 2026-27 MSP (announced May 2026)", hi: "खरीफ 2026-27 का MSP (मई 2026 में घोषित)" },
  },
  items: {
    "Wheat": { msp: 2610, cost: 1264, tag: "rabi" }, "Barley": { msp: 2286, cost: 1447, tag: "rabi" },
    "Gram": { msp: 5958, cost: 3751, tag: "rabi" }, "Masoor": { msp: 7390, tag: "rabi" },
    "Rapeseed &Mustard": { msp: 6613, cost: 3367, tag: "rabi" },
    "Rice": { msp: 2441, tag: "kharif" }, "Maize": { msp: 2410, tag: "kharif" }, "Bajra": { msp: 2900, tag: "kharif" },
    "Jowar": { msp: 4023, tag: "kharif" }, "Ragi": { msp: 5205, tag: "kharif" }, "Arhar/Tur": { msp: 8450, tag: "kharif" },
    "Moong(Green Gram)": { msp: 8780, tag: "kharif" }, "Urad": { msp: 8200, tag: "kharif" }, "Groundnut": { msp: 7517, tag: "kharif" },
    "Soyabean": { msp: 5708, tag: "kharif" }, "Sunflower": { msp: 8343, tag: "kharif" },
  },
};
