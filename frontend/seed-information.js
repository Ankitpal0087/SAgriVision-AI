const SEED_DETAIL_SESSION_KEY = 'sagrivision-seed-detail';
const detailTitle = document.querySelector('#detail-title');
const detailSubtitle = document.querySelector('#detail-subtitle');
const detailName = document.querySelector('#detail-name');
const detailIntroduction = document.querySelector('#detail-introduction');
const detailFacts = document.querySelector('#detail-facts');
const detailGallery = document.querySelector('#detail-gallery');
const detailEmpty = document.querySelector('#detail-empty');
const backToAnalysis = document.querySelector('#back-to-analysis');

const DETAIL_LABELS = {
  en: { subtitle: 'Detailed information for the detected seed.', detected: 'Detected seed', category: 'Seed category', uses: 'Common uses', characteristic: 'Growing characteristic', season: 'Growing season', unavailable: 'This detail is not available in the current project reference.', identification: 'The current project reference identifies this seed by its crop name and image. No additional visual markers are recorded.', environment: 'Use the growing characteristic above as the available project guidance for the crop environment. More specific soil guidance is not included in the current project reference.', sowing: 'The recorded growing season is shown above. Specific sowing dates and rates are not included in the current project reference.', care: 'The recorded growing characteristic is the available crop-care guidance in the current project reference. More specific care instructions are not included.', harvest: 'Harvest timing guidance is not included in the current project reference.', storage: 'Seed quality and storage guidance is not included in the current project reference.' },
  hi: { subtitle: 'पहचाने गए बीज की विस्तृत जानकारी।', detected: 'पहचाना गया बीज', category: 'बीज की श्रेणी', uses: 'सामान्य उपयोग', characteristic: 'उगने की विशेषता', season: 'उगाने का मौसम', unavailable: 'यह जानकारी मौजूदा प्रोजेक्ट संदर्भ में उपलब्ध नहीं है।', identification: 'मौजूदा प्रोजेक्ट संदर्भ इस बीज की पहचान फसल के नाम और तस्वीर से करता है। अतिरिक्त दृश्य विशेषताएँ दर्ज नहीं हैं।', environment: 'फसल के वातावरण के लिए ऊपर दी गई उगने की विशेषता ही उपलब्ध प्रोजेक्ट जानकारी है। मिट्टी की अधिक विशिष्ट जानकारी उपलब्ध नहीं है।', sowing: 'ऊपर दर्ज उगाने का मौसम दिखाया गया है। बुवाई की विशिष्ट तारीख और मात्रा उपलब्ध नहीं है।', care: 'ऊपर दर्ज उगने की विशेषता ही उपलब्ध फसल-देखभाल जानकारी है। अधिक विशिष्ट निर्देश उपलब्ध नहीं हैं।', harvest: 'कटाई के समय की जानकारी मौजूदा प्रोजेक्ट संदर्भ में उपलब्ध नहीं है।', storage: 'बीज की गुणवत्ता और भंडारण की जानकारी मौजूदा प्रोजेक्ट संदर्भ में उपलब्ध नहीं है।' }
};

let detailRecord = null;

function language() { return getSagriLanguage() === 'hi' ? 'hi' : 'en'; }

function textFor(value, labels) { return value || labels.unavailable; }

function renderDetail() {
  const labels = DETAIL_LABELS[language()];
  const information = detailRecord?.information?.[language()] || detailRecord?.information?.en;
  if (!detailRecord || !information) {
    detailEmpty.hidden = false;
    document.querySelector('.seed-information-intro').hidden = true;
    document.querySelector('.seed-detail-hero').hidden = true;
    document.querySelector('.seed-detail-sections').hidden = true;
    return;
  }
  detailEmpty.hidden = true;
  document.querySelector('.seed-information-intro').hidden = false;
  document.querySelector('.seed-detail-hero').hidden = false;
  document.querySelector('.seed-detail-sections').hidden = false;
  detailTitle.textContent = information.name;
  detailSubtitle.textContent = labels.subtitle;
  detailName.textContent = information.name;
  detailIntroduction.textContent = textFor(information.description, labels);
  detailFacts.replaceChildren();
  [[labels.category, information.category], [labels.uses, information.uses], [labels.characteristic, information.characteristic], [labels.season, information.season]].forEach(([label, value]) => {
    const fact = document.createElement('div');
    const term = document.createElement('span');
    const description = document.createElement('strong');
    term.textContent = label;
    description.textContent = textFor(value, labels);
    fact.append(term, description);
    detailFacts.append(fact);
  });
  detailGallery.replaceChildren();
  (Array.isArray(detailRecord.assets) ? detailRecord.assets : []).forEach((file, index) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = `./assets/${encodeURIComponent(detailRecord.seedType)}/${encodeURIComponent(file)}`;
    image.alt = `${information.name} reference image ${index + 1}`;
    image.loading = index ? 'lazy' : 'eager';
    image.addEventListener('error', () => figure.remove());
    figure.append(image);
    detailGallery.append(figure);
  });
  document.querySelector('#detail-identification').textContent = labels.identification;
  document.querySelector('#detail-uses').textContent = textFor(information.uses, labels);
  document.querySelector('#detail-environment').textContent = textFor(information.characteristic, labels) + ' ' + labels.environment;
  document.querySelector('#detail-season').textContent = textFor(information.season, labels) + ' ' + labels.sowing;
  document.querySelector('#detail-care').textContent = textFor(information.characteristic, labels) + ' ' + labels.care;
  document.querySelector('#detail-harvest').textContent = labels.harvest;
  document.querySelector('#detail-storage').textContent = labels.storage;
}

try { detailRecord = JSON.parse(sessionStorage.getItem(SEED_DETAIL_SESSION_KEY) || 'null'); } catch { detailRecord = null; }
backToAnalysis.addEventListener('click', () => window.location.replace('./seed-analysis.htm'));
document.addEventListener('sagri-language-change', renderDetail);
renderDetail();
