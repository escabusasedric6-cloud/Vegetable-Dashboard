
const CATEGORIES = {
  Leafy: '#2f7d46',
  Root: '#c8641f',
  Fruiting: '#c0392b',
  Cruciferous: '#6f9a2a',
  Allium: '#8e5ba8',
  Legume: '#b08a1e'
};

const LOW_STOCK = 10;
const STORAGE_KEY = 'vegetable-dashboard-items';

const DEFAULT_ITEMS = [
  { id: 1, name: 'Spinach', category: 'Leafy', price: 3.8, quantity: 24 },
  { id: 2, name: 'Carrot', category: 'Root', price: 1.6, quantity: 60 },
  { id: 3, name: 'Tomato', category: 'Fruiting', price: 2.9, quantity: 8 },
  { id: 4, name: 'Broccoli', category: 'Cruciferous', price: 3.2, quantity: 31 },
  { id: 5, name: 'Red onion', category: 'Allium', price: 1.4, quantity: 45 },
  { id: 6, name: 'Green beans', category: 'Legume', price: 4.1, quantity: 6 }
];

let items = readItems();
let editingId = null;

const $ = (selector) => document.querySelector(selector);

const money = (number) => '$' + Number(number).toFixed(2);

const esc = (value) => String(value).replace(/[&<>"']/g, (character) =>
  ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character])
);

const color = (category) => CATEGORIES[category] || '#8a948d';

// LOAD SAVED DATA
function readItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_ITEMS)
      );
      return [...DEFAULT_ITEMS];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [...DEFAULT_ITEMS];

  } catch (error) {
    console.error(error);
    return [...DEFAULT_ITEMS];
  }
}

// SAVE DATA
function saveItems() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items)
  );
}

// TOAST MESSAGE
function toast(message) {
  const t = $('#toast');

  t.textContent = message;
  t.classList.add('show');

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    t.classList.remove('show');
  }, 2400);
}

// DISPLAY DASHBOARD
function render() {

  const totalStock = items.reduce(
    (sum, v) => sum + Number(v.quantity), 0
  );

  const totalValue = items.reduce(
    (sum, v) => sum + Number(v.quantity) * Number(v.price), 0
  );

  const lowStock = items.filter(
    (v) => Number(v.quantity) <= LOW_STOCK
  ).length;

  // SUMMARY
  $('#stats').innerHTML = [
    ['Varieties', items.length],
    ['Total stock', totalStock + ' kg'],
    ['Stock value', money(totalValue)],
    ['Running low', lowStock]
  ].map(([label, value]) =>
    `<div><strong>${value}</strong><span>${label}</span></div>`
  ).join('');

  // CATEGORY BAR
  const byCategory = {};

  items.forEach((v) => {
    byCategory[v.category] =
      (byCategory[v.category] || 0) + Number(v.quantity);
  });

  const parts = Object.entries(byCategory)
    .filter(([, quantity]) => quantity > 0);

  $('#bar').innerHTML = parts.map(([category, quantity]) =>
    `<i style="width:${totalStock ? quantity / totalStock * 100 : 0}%;background:${color(category)}"
    title="${esc(category)}: ${quantity} kg"></i>`
  ).join('');

  $('#legend').innerHTML = parts.map(([category, quantity]) =>
    `<li>
      <span class="dot" style="background:${color(category)}"></span>
      ${esc(category)} ${quantity} kg
    </li>`
  ).join('');

  // SEARCH AND FILTER
  const q = $('#q').value.trim().toLowerCase();
  const category = $('#filter').value;

  const filtered = items.filter((v) =>
    (!category || v.category === category) &&
    v.name.toLowerCase().includes(q)
  );

  // TABLE
  $('#rows').innerHTML = filtered.length

    ? filtered.map((v) => `
      <tr>
        <td>
          <span class="dot" style="background:${color(v.category)}"></span>
          ${esc(v.name)}
        </td>

        <td>${esc(v.category)}</td>

        <td class="num">${money(v.price)}</td>

        <td class="num">
          ${v.quantity} kg
          ${v.quantity <= LOW_STOCK
            ? '<span class="low">Low</span>'
            : ''}
        </td>

        <td class="act">
          <button class="btn small" data-edit="${v.id}">
            Edit
          </button>

          <button class="btn small danger" data-delete="${v.id}">
            Delete
          </button>
        </td>
      </tr>
    `).join('')

    : `<tr>
        <td colspan="5" class="empty">
          No vegetables match. Clear the search or add a new one.
        </td>
      </tr>`;
}

// ADD OR EDIT DIALOG
const dlg = $('#dlg');
const form = $('#form');

function openDialog(veg) {

  editingId = veg ? veg.id : null;

  form.reset();

  $('#err').textContent = '';

  $('#dlgTitle').textContent =
    veg ? 'Edit ' + veg.name : 'Add vegetable';

  $('#saveBtn').textContent =
    veg ? 'Save changes' : 'Add vegetable';

  if (veg) {
    form.elements.name.value = veg.name;
    form.elements.category.value = veg.category;
    form.elements.price.value = veg.price;
    form.elements.quantity.value = veg.quantity;
  }

  dlg.showModal();

  form.elements.name.focus();
}

// ADD AND UPDATE VEGETABLE
form.addEventListener('submit', (e) => {

  e.preventDefault();

  const name = form.elements.name.value.trim();
  const category = form.elements.category.value;
  const price = Number(form.elements.price.value);
  const quantity = Number(form.elements.quantity.value);

  // VALIDATION
  if (!name) {
    $('#err').textContent = 'Please enter a vegetable name.';
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    $('#err').textContent = 'Price must be 0 or more.';
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    $('#err').textContent =
      'Stock must be a whole number of 0 or more.';
    return;
  }

  const vegetableData = {
    name,
    category,
    price,
    quantity
  };

  // UPDATE
  if (editingId !== null) {

    items = items.map((v) =>
      v.id === editingId
        ? { ...v, ...vegetableData }
        : v
    );

  } else {

    // CREATE
    const nextId = items.length
      ? Math.max(...items.map((v) => Number(v.id))) + 1
      : 1;

    items.push({
      id: nextId,
      ...vegetableData
    });
  }

  saveItems();

  dlg.close();

  render();

  toast(
    (editingId !== null ? 'Saved ' : 'Added ') + name
  );

  editingId = null;
});

// BUTTONS
$('#addBtn').onclick = () => openDialog(null);

$('#cancel').onclick = () => dlg.close();

// SEARCH
$('#q').oninput = render;

// FILTER
$('#filter').onchange = render;

// EDIT AND DELETE
$('#rows').addEventListener('click', (e) => {

  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;

  // EDIT
  if (editId !== undefined) {

    const veg = items.find(
      (v) => v.id === Number(editId)
    );

    if (veg) openDialog(veg);
  }

  // DELETE
  if (deleteId !== undefined) {

    const veg = items.find(
      (v) => v.id === Number(deleteId)
    );

    if (!veg) return;

    if (!confirm(`Delete ${veg.name}? This can't be undone.`)) {
      return;
    }

    items = items.filter(
      (v) => v.id !== Number(deleteId)
    );

    saveItems();

    render();

    toast('Deleted ' + veg.name);
  }
});

// INITIALIZE CATEGORY OPTIONS
const options = Object.keys(CATEGORIES)
  .map((c) => `<option value="${c}">${c}</option>`)
  .join('');

$('#filter').innerHTML =
  '<option value="">All categories</option>' + options;

form.elements.category.innerHTML = options;

// INITIAL DISPLAY
render();
