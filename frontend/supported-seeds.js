const SUPPORTED_SEEDS = [
  ['Amla Seed', 'Amla (43).jpg', 'Grows into the amla tree, valued for its nutritious fruit and hardy growth.'],
  ['Apple Seed', 'Apple (1).jpg', 'Grows into an apple tree that produces fruit for fresh eating, juice, and storage.'],
  ['Avocado Seed', 'original_013.jpg', 'Grows into a warm-climate fruit tree with a rich, nutritious fruit.'],
  ['Betel Nut Seed', 'Betel_Nut (10).jpg', 'Grows into the areca palm, a tropical plantation crop grown for its nuts.'],
  ['Black Plum Seed', 'Black_Plum (11).jpg', 'Grows into the jamun tree, which produces dark, sweet-tart fruit.'],
  ['Corn Seed', 'corn-seeds-background-photo.jpg', 'Grows into a cereal crop used for grain, animal feed, and many food products.'],
  ['Date Seed', 'Date (44).jpg', 'Grows into a date palm that produces sweet fruit in hot, dry regions.'],
  ['Flax Seed', 'Linseed1.jpg', 'Produces an oilseed and fibre crop used for flax oil, food, and natural fibre.'],
  ['Hog Plum Seed', 'Hog_Plum (1).jpg', 'Grows into a tropical fruit tree whose fruit is used fresh, in pickles, and chutneys.'],
  ['Jackfruit Seed', 'Jackfruit (11).jpg', 'Grows into a tropical tree producing large fruit and many edible seeds.'],
  ['Litchi Seed', 'Litchi (1).jpg', 'Grows into a warm-climate tree that produces sweet, juicy litchi fruit.'],
  ['Mango Seed', 'Mango (30).jpg', 'Grows into a mango tree, a warm-climate crop valued for its sweet fruit.'],
  ['Mustard Seed', 'MustardSeeds1.jpg', 'Grows into a mustard crop used for oil, spices, and leafy greens.'],
  ['Olive Seed', 'Olive (1).jpg', 'Grows into an olive tree cultivated for table olives and cooking oil.'],
  ['Orange Seed', 'Orange (21).jpg', 'Grows into a citrus tree that produces fruit for fresh eating and juice.'],
  ['Paddy Seed', '20200531_154520 (2).jpg', 'Grows into rice, a major food crop cultivated in flooded or well-watered fields.'],
  ['Pumpkin Seed', 'Pumpkin (21).jpg', 'Grows into a warm-season vine producing pumpkins and edible seeds.'],
  ['Safflower Seed', 'SafflowerSeed1.jpg', 'Grows into an oilseed crop used for cooking oil and natural dye.'],
  ['Sapodilla Seed', 'Sapodilla (21).jpg', 'Grows into a tropical tree producing soft, sweet sapodilla fruit.'],
  ['Sesame Seed', 'BlackSesame1.jpg', 'Grows into an oilseed crop used in cooking, bakery foods, and sesame products.'],
  ['Soybean Seed', '1.webp', 'Grows into a protein-rich pulse and oilseed crop used for food and animal feed.'],
  ['Sunflower Seed', 'SunflowerSeeds40.jpg', 'Grows into a bright, sun-loving crop grown for edible seeds and oil.'],
  ['Tamarind Seed', 'Tamarind (1).jpg', 'Grows into a hardy tree producing sour pods used in cooking, drinks, and chutneys.'],
  ['Wheat Seed', '1544-wheat-seeds-1000x1000.jpg', 'Grows into a staple cereal crop used for flour, bread, and other foods.']
];

const grid = document.querySelector('#supported-seeds-grid');
const searchInput = document.querySelector('#seed-search');
const sortSelect = document.querySelector('#seed-sort');
const seedCount = document.querySelector('#seed-count');
const emptyState = document.querySelector('#supported-seeds-empty');
const detailPanel = document.querySelector('#supported-seed-detail');
const detailName = document.querySelector('#supported-seed-detail-name');
const detailClose = document.querySelector('#supported-seed-detail-close');
const moreButton = document.querySelector('#seed-more');
const identifyLinks = document.querySelectorAll('.supported-seeds-start');
const assetRoot = './assets';
const INITIAL_VISIBLE_SEEDS = 8;
let filteredSeeds = [...SUPPORTED_SEEDS];
let showAllSeeds = false;

function openSeedDetail(seedName) {
  detailName.textContent = seedName;
  detailPanel.hidden = false;
}

function renderSupportedSeeds() {
  const fragment = document.createDocumentFragment();
  const visibleSeeds = showAllSeeds ? filteredSeeds : filteredSeeds.slice(0, INITIAL_VISIBLE_SEEDS);
  visibleSeeds.forEach(([seedName, file, description]) => {
    const card = document.createElement('article');
    card.className = 'supported-seed-card';
    card.dataset.seedType = seedName;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View details for ${seedName}`);
    const image = document.createElement('img');
    image.className = 'supported-seed-image';
    image.src = `${assetRoot}/${encodeURIComponent(seedName)}/${encodeURIComponent(file)}`;
    image.alt = `${seedName} photograph`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'supported-seed-image supported-seed-placeholder';
      placeholder.textContent = 'Image unavailable';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', `${seedName} image unavailable`);
      image.replaceWith(placeholder);
    }, { once: true });
    const name = document.createElement('span');
    name.className = 'supported-seed-name';
    name.textContent = seedName;
    const summary = document.createElement('p');
    summary.className = 'supported-seed-description';
    summary.textContent = description;
    card.append(image, name, summary);
    card.addEventListener('click', () => openSeedDetail(seedName));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSeedDetail(seedName); }
    });
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
  seedCount.textContent = `${visibleSeeds.length} of ${filteredSeeds.length} matching seeds shown`;
  moreButton.hidden = filteredSeeds.length <= INITIAL_VISIBLE_SEEDS;
  moreButton.setAttribute('aria-expanded', String(showAllSeeds));
  moreButton.innerHTML = showAllSeeds ? 'Show Less <span aria-hidden="true">↑</span>' : 'Know More <span aria-hidden="true">→</span>';
  emptyState.hidden = filteredSeeds.length > 0;
}

function updateSeedView() {
  const query = searchInput.value.trim().toLowerCase();
  filteredSeeds = SUPPORTED_SEEDS.filter(([seedName]) => seedName.toLowerCase().includes(query));
  if (sortSelect.value === 'az') filteredSeeds.sort(([left], [right]) => left.localeCompare(right));
  renderSupportedSeeds();
}

searchInput.addEventListener('input', () => { showAllSeeds = false; updateSeedView(); });
sortSelect.addEventListener('change', updateSeedView);
moreButton.addEventListener('click', () => { showAllSeeds = !showAllSeeds; renderSupportedSeeds(); });
detailClose.addEventListener('click', () => { detailPanel.hidden = true; });
identifyLinks.forEach((link) => link.addEventListener('click', (event) => {
  if (sessionStorage.getItem('sagrivision-auth-token')) return;
  event.preventDefault();
  window.location.assign('./login.html?returnTo=./seed-analysis.htm');
}));
renderSupportedSeeds();
