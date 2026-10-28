const learningLessons = [
  { id: 'getting-started', category: 'Getting started', title: 'Find your way around SAgriVision AI', summary: 'Use the public pages to learn first, then sign in to open the protected tools.', steps: ['Start with Learning, Features, or About to understand the tools.', 'Choose Login when you are ready to use protected features.', 'From the dashboard, open Seed Identification or Crop Recommendation.', 'Use the page controls and read the result details before making a farm decision.'], note: 'The public pages explain the product. They do not run a prediction or replace local agricultural advice.' },
  { id: 'seed-identification', category: 'Seed Identification', title: 'Identify a seed from a clear image', summary: 'The Seed Identification workflow accepts an image and displays an identified seed type with a confidence value.', steps: ['Open Supported Seeds from the dashboard to review the supported classes.', 'Choose Start Seed Identification and open the identification page.', 'Upload a clear seed image using the image control.', 'Review the identified seed type and confidence, then use the related information and images for context.', 'If the image is unclear or the result seems unexpected, try a better image and seek expert confirmation.'], note: 'A confidence value is a model signal, not a guarantee. Lighting, focus, background, seed condition, and unsupported classes can affect results.', image: './assets/Corn Seed/corn-seeds-close-up-background-image-photo.jpg', alt: 'Close view of corn seeds' },
  { id: 'crop-recommendation', category: 'Crop Recommendation', title: 'Choose inputs for crop recommendations', summary: 'Crop Recommendation uses soil, season, climate, and category selections to find compatible crops.', steps: ['Open Crop Recommendation after signing in.', 'Select a supported soil type, season, climate, and crop category.', 'Submit the form to request recommendations.', 'Review the returned crop list, matching details, and available crop information.', 'Compare the suggestions with local soil tests, weather, water availability, and advice from an agricultural professional.'], note: 'Similarity-based results show how close selected conditions are to records used by the recommender. Similarity is not a probability or a promise of yield.', image: './assets/Wheat Seed/1544-wheat-seeds-1000x1000.jpg', alt: 'Wheat seeds' },
  { id: 'disease-prediction-treatment', category: 'Disease Prediction & Treatment', title: 'Disease Prediction & Treatment — Coming Soon', summary: 'Planned to help farmers review possible crop-health concerns and any future treatment guidance in one place.', steps: ['This module is in development and is not available as an active workflow in the current dashboard.'], note: 'No disease predictions, treatment instructions, supported-disease list, or action button is provided here. When released, AI guidance should still be verified with an agricultural expert, especially for serious or spreading crop problems.' },
  { id: 'ai-farming-chatbot', category: 'AI Farming Chatbot', title: 'AI Farming Chatbot — Coming Soon', summary: 'Planned to help farmers ask farming-related questions and receive general AI-supported guidance.', steps: ['This module is in development and is not available as an active workflow in the current dashboard.'], note: 'No chatbot interaction or result is provided here. Future guidance should be checked against local conditions and qualified agricultural advice, and should not be treated as a guaranteed diagnosis, treatment plan, or farm outcome.' },
  { id: 'understanding-results', category: 'Understanding results', title: 'Read AI results carefully', summary: 'AI output is best used as supporting information alongside field knowledge and expert guidance.', steps: ['Check the exact input values used for the result.', 'Read the confidence or similarity wording instead of treating it as certainty.', 'Look for missing, unusual, or unsupported inputs.', 'Use the result to ask a better farming question, not as the only basis for a costly decision.', 'Keep notes of field observations and compare them with the tool output over time.'], note: 'Educational examples on this page are explanations only. They are not live predictions.' },
  { id: 'responsible-use', category: 'Responsible use', title: 'Use AI with practical checks', summary: 'Good farm decisions combine AI-supported information with local conditions and human judgment.', steps: ['Confirm the crop or seed is suitable for your region and season.', 'Consider irrigation, soil test results, pests, disease pressure, and market needs.', 'Ask a qualified agricultural advisor when the result affects major spending or crop safety.', 'Do not treat an unavailable result as evidence that a crop cannot grow.', 'Keep personal account information private and use only your own authorized login.'], note: 'SAgriVision AI provides decision support. It does not guarantee germination, yield, disease diagnosis, or financial outcomes.' }
];

const features = [
  { icon: '◈', title: 'Seed Identification', text: 'Identify a seed from an uploaded or captured image and review the available identification result.', linkLabel: 'Know More About Supported Seeds →', link: './supported-seeds.html' },
  { icon: '⌁', title: 'Crop Recommendation', text: 'Explore crop suggestions based on soil, season, climate, and available crop categories.', linkLabel: 'Know More About Crops →', link: './crop-recommendation/info' },
  { icon: '✣', title: 'Disease Detection', text: 'Learn about the planned AI-assisted crop disease detection and treatment guidance.', status: 'Coming Soon', linkLabel: 'Know More About Disease →', link: './learning.html#disease-prediction-treatment' },
  { icon: '✦', title: 'AI Farming Chatbot', text: 'Planned assistance for farmers with agriculture-related questions.', status: 'Coming Soon', linkLabel: 'Know More About Chatbot →', link: './learning.html#ai-farming-chatbot' },
  { icon: '▤', title: 'Learning Resources', text: 'Practical lessons explaining how to use SAgriVision, understand results, and use AI responsibly.', linkLabel: 'Explore Learning Resources →', link: './learning.html' }
];

const learningHindi = {
  'getting-started': { category: 'शुरुआत करें', title: 'SAgriVision AI को समझें', summary: 'पहले सार्वजनिक पेजों से जानकारी लें, फिर सुरक्षित टूल खोलने के लिए लॉग इन करें।', steps: ['टूल समझने के लिए Learning, Features या About पेज से शुरुआत करें।', 'सुरक्षित सुविधाएँ इस्तेमाल करने के लिए तैयार होने पर Login चुनें।', 'डैशबोर्ड से Seed Identification या Crop Recommendation खोलें।', 'खेती का निर्णय लेने से पहले पेज के नियंत्रण और परिणामों का विवरण पढ़ें।'], note: 'सार्वजनिक पेज उत्पाद को समझाते हैं। वे भविष्यवाणी नहीं करते और स्थानीय कृषि सलाह का विकल्प नहीं हैं।' },
  'seed-identification': { category: 'बीज पहचान', title: 'साफ़ तस्वीर से बीज पहचानें', summary: 'Seed Identification में तस्वीर देने पर पहचाने गए बीज का प्रकार और confidence value दिखाई जाती है।', steps: ['समर्थित वर्ग देखने के लिए डैशबोर्ड से Supported Seeds खोलें।', 'Start Seed Identification चुनकर पहचान पेज खोलें।', 'इमेज नियंत्रण से बीज की साफ़ तस्वीर अपलोड करें।', 'पहचाना गया बीज और confidence देखें, फिर संबंधित जानकारी और तस्वीरों से संदर्भ लें।', 'तस्वीर अस्पष्ट हो या परिणाम असामान्य लगे तो बेहतर तस्वीर लें और विशेषज्ञ से पुष्टि कराएँ।'], note: 'Confidence value मॉडल का संकेत है, गारंटी नहीं। रोशनी, फोकस, पृष्ठभूमि, बीज की स्थिति और असमर्थित वर्ग परिणाम बदल सकते हैं।', alt: 'मकई के बीज का नज़दीकी दृश्य' },
  'crop-recommendation': { category: 'फसल सुझाव', title: 'फसल सुझाव के लिए इनपुट चुनें', summary: 'Crop Recommendation मिट्टी, मौसम, जलवायु और फसल श्रेणी चुनकर अनुकूल फसलें खोजता है।', steps: ['लॉग इन करने के बाद Crop Recommendation खोलें।', 'समर्थित मिट्टी, मौसम, जलवायु और फसल श्रेणी चुनें।', 'सुझाव पाने के लिए फॉर्म जमा करें।', 'मिली फसलों की सूची, मिलान विवरण और उपलब्ध फसल जानकारी देखें।', 'स्थानीय मिट्टी जाँच, मौसम, पानी की उपलब्धता और कृषि विशेषज्ञ की सलाह के साथ सुझावों की तुलना करें।'], note: 'Similarity-based परिणाम बताते हैं कि चुनी हुई स्थितियाँ recommender के रिकॉर्ड से कितनी मिलती हैं। Similarity संभावना या उपज का वादा नहीं है।', alt: 'गेहूँ के बीज' },
  'disease-prediction-treatment': { category: 'रोग पहचान और उपचार', title: 'रोग पहचान और उपचार — जल्द आ रहा है', summary: 'भविष्य में किसानों को फसल स्वास्थ्य की संभावित समस्याएँ और उपचार संबंधी मार्गदर्शन समझने में सहायता देने की योजना है।', steps: ['यह मॉड्यूल विकास में है और वर्तमान डैशबोर्ड में सक्रिय सुविधा के रूप में उपलब्ध नहीं है।'], note: 'यहाँ कोई रोग परिणाम, उपचार निर्देश, समर्थित रोग सूची या कार्रवाई बटन नहीं दिया गया है। सुविधा आने पर भी गंभीर या फैलती समस्या में कृषि विशेषज्ञ से पुष्टि करें।' },
  'ai-farming-chatbot': { category: 'AI कृषि चैटबॉट', title: 'AI कृषि चैटबॉट — जल्द आ रहा है', summary: 'भविष्य में किसान खेती से जुड़े प्रश्न पूछकर सामान्य AI-आधारित मार्गदर्शन ले सकेंगे।', steps: ['यह मॉड्यूल विकास में है और वर्तमान डैशबोर्ड में सक्रिय सुविधा के रूप में उपलब्ध नहीं है।'], note: 'यहाँ कोई चैट या परिणाम उपलब्ध नहीं है। भविष्य के मार्गदर्शन को स्थानीय परिस्थितियों और योग्य कृषि सलाह से जाँचें; इसे पक्का रोग-निदान, उपचार योजना या खेती के परिणाम की गारंटी न मानें।' },
  'understanding-results': { category: 'परिणाम समझें', title: 'AI परिणाम ध्यान से पढ़ें', summary: 'AI परिणामों का उपयोग खेत की जानकारी और विशेषज्ञ सलाह के साथ सहायक जानकारी के रूप में करें।', steps: ['परिणाम में इस्तेमाल किए गए सभी इनपुट देखें।', 'Confidence या similarity के शब्द पढ़ें और उन्हें निश्चित सत्य न मानें।', 'अनुपलब्ध, असामान्य या असमर्थित इनपुट पर ध्यान दें।', 'परिणाम को महँगा निर्णय लेने का एकमात्र आधार न बनाकर बेहतर कृषि प्रश्न पूछने में उपयोग करें।', 'खेत के निरीक्षण लिखें और समय के साथ उनकी तुलना टूल के परिणामों से करें।'], note: 'इस पेज के उदाहरण केवल समझाने के लिए हैं। वे लाइव भविष्यवाणियाँ नहीं हैं।' },
  'responsible-use': { category: 'जिम्मेदारी से उपयोग', title: 'व्यावहारिक जाँच के साथ AI इस्तेमाल करें', summary: 'अच्छे खेती के निर्णयों में AI जानकारी के साथ स्थानीय परिस्थितियाँ और मानव समझ भी शामिल होती है।', steps: ['पुष्टि करें कि फसल आपके क्षेत्र और मौसम के लिए उपयुक्त है।', 'सिंचाई, मिट्टी जाँच, कीट, रोग का दबाव और बाजार की जरूरतों पर विचार करें।', 'बड़े खर्च या फसल सुरक्षा से जुड़े निर्णय में योग्य कृषि सलाहकार से पूछें।', 'अनुपलब्ध परिणाम को इस प्रमाण की तरह न लें कि कोई फसल उग नहीं सकती।', 'खाते की व्यक्तिगत जानकारी सुरक्षित रखें और केवल अपने अधिकृत लॉगिन का उपयोग करें।'], note: 'SAgriVision AI निर्णय लेने में सहायता देता है। यह अंकुरण, उपज, रोग-निदान या आर्थिक परिणाम की गारंटी नहीं देता।' }
};

const learningUi = {
  en: { eyebrow: 'LEARN AT YOUR PACE', title: 'Simple lessons for using SAgriVision AI.', intro: 'Search a topic, filter by category, and open a lesson for practical steps. Examples on this page are educational explanations, not live predictions.', searchLabel: 'Search lessons', searchPlaceholder: 'Search lessons by name or topic', filterLabel: 'Filter lessons', library: 'LESSON LIBRARY', heading: 'What would you like to learn?', all: 'All', count: ['lesson', 'lessons'], footer: 'Need an account? ', login: 'Log in to SAgriVision AI', categories: { 'All': 'All', 'Getting started': 'Getting started', 'Seed Identification': 'Seed Identification', 'Crop Recommendation': 'Crop Recommendation', 'Disease Prediction & Treatment': 'Disease Prediction & Treatment', 'AI Farming Chatbot': 'AI Farming Chatbot', 'Understanding results': 'Understanding results', 'Responsible use': 'Responsible use' } },
  hi: { eyebrow: 'अपनी गति से सीखें', title: 'SAgriVision AI इस्तेमाल करने के आसान पाठ।', intro: 'विषय खोजें, श्रेणी चुनें और उपयोगी कदमों के लिए पाठ खोलें। इस पेज के उदाहरण केवल जानकारी हैं, लाइव भविष्यवाणी नहीं।', searchLabel: 'पाठ खोजें', searchPlaceholder: 'नाम या विषय से पाठ खोजें', filterLabel: 'पाठ की श्रेणी चुनें', library: 'पाठ पुस्तकालय', heading: 'आप क्या सीखना चाहेंगे?', all: 'सभी', count: ['पाठ', 'पाठ'], footer: 'क्या आपको खाता चाहिए? ', login: 'SAgriVision AI में लॉग इन करें', categories: { 'All': 'सभी', 'Getting started': 'शुरुआत करें', 'Seed Identification': 'बीज पहचान', 'Crop Recommendation': 'फसल सुझाव', 'Disease Prediction & Treatment': 'रोग पहचान और उपचार', 'AI Farming Chatbot': 'AI कृषि चैटबॉट', 'Understanding results': 'परिणाम समझें', 'Responsible use': 'जिम्मेदारी से उपयोग' } }
};

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', event => {
      if (event.target.closest('.nav-link')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const active = link.dataset.page === page;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
  });
}

function lessonMarkup(lesson) {
  const text = learningLanguage === 'hi' ? { ...lesson, ...learningHindi[lesson.id] } : lesson;
  const image = lesson.image ? `<img src="${lesson.image}" alt="${text.alt || lesson.alt}" />` : '';
  const searchable = `${lesson.title} ${text.title} ${lesson.category} ${text.category} ${lesson.summary} ${text.summary}`.toLowerCase();
  return `<article class="lesson-card" id="${lesson.id}" data-category="${lesson.category}" data-title="${searchable}">${image}<button class="lesson-summary" type="button" aria-expanded="false" aria-controls="lesson-${lesson.id}"><span><span class="lesson-meta">${text.category}</span><strong>${text.title}</strong><p>${text.summary}</p></span><span class="lesson-chevron" aria-hidden="true">+</span></button><div class="lesson-details" id="lesson-${lesson.id}" hidden><ol>${text.steps.map(step => `<li>${step}</li>`).join('')}</ol><p class="note">${text.note}</p></div></article>`;
}

let learningLanguage = 'en';

function setupLearning() {
  const list = document.querySelector('#lesson-list');
  if (!list) return;
  const search = document.querySelector('#lesson-search');
  const filter = document.querySelector('#lesson-category');
  const count = document.querySelector('#lesson-count');
  const apply = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const category = filter?.value || 'All';
    let visible = 0;
    list.querySelectorAll('.lesson-card').forEach(card => {
      const matchesQuery = !query || card.dataset.title.includes(query) || card.dataset.category.toLowerCase().includes(query);
      const matchesCategory = category === 'All' || card.dataset.category === category;
      const show = matchesQuery && matchesCategory;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const t = learningUi[learningLanguage];
    if (count) count.textContent = `${visible} ${visible === 1 ? t.count[0] : t.count[1]}`;
  };
  const applyLanguage = () => {
    const t = learningUi[learningLanguage];
    document.documentElement.lang = learningLanguage === 'hi' ? 'hi' : 'en';
    document.querySelector('#learning-eyebrow').textContent = t.eyebrow;
    document.querySelector('#learning-title').textContent = t.title;
    document.querySelector('#learning-intro').textContent = t.intro;
    document.querySelector('#learning-search-label').textContent = t.searchLabel;
    document.querySelector('#learning-filter-label').textContent = t.filterLabel;
    search.placeholder = t.searchPlaceholder;
    document.querySelector('#learning-library').textContent = t.library;
    document.querySelector('#lesson-heading').textContent = t.heading;
    filter.querySelectorAll('option').forEach(option => { option.textContent = t.categories[option.value]; });
    const footer = document.querySelector('#learning-footer');
    footer.innerHTML = `${t.footer}<a href="./login.html">${t.login}</a>.`;
    document.querySelectorAll('[data-learning-language]').forEach(button => {
      const active = button.dataset.learningLanguage === learningLanguage;
      button.setAttribute('aria-pressed', String(active));
    });
    list.innerHTML = learningLessons.map(lessonMarkup).join('');
    apply();
  };
  document.querySelectorAll('[data-learning-language]').forEach(button => button.addEventListener('click', () => {
    learningLanguage = button.dataset.learningLanguage === 'hi' ? 'hi' : 'en';
    applyLanguage();
  }));
  search?.addEventListener('input', apply);
  filter?.addEventListener('change', apply);
  list.addEventListener('click', event => {
    const button = event.target.closest('.lesson-summary');
    if (!button) return;
    const details = document.getElementById(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    button.querySelector('.lesson-chevron').textContent = open ? '+' : '−';
    details.hidden = open;
  });
  applyLanguage();
}

function setupFeatures() {
  const list = document.querySelector('#feature-list');
  if (!list) return;
  list.innerHTML = features.map(feature => `<article class="card feature-card"><div class="card-icon" aria-hidden="true">${feature.icon}</div><h3>${feature.title}</h3>${feature.status ? `<span class="feature-status">${feature.status}</span>` : ''}<p>${feature.text}</p><a class="feature-link" href="${feature.link}">${feature.linkLabel}</a></article>`).join('');
}

setupNavigation();
setupLearning();
setupFeatures();
