const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database (the SQLite file is created automatically) ----------
const db = new Database(path.join(__dirname, 'vegetables.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS vegetables (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    price      REAL    NOT NULL,   -- price per kg
    quantity   INTEGER NOT NULL,   -- stock in kg
    created_at TEXT    DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add sample rows the first time so the demo isn't empty
if (db.prepare('SELECT COUNT(*) AS n FROM vegetables').get().n === 0) {
  const insert = db.prepare(
    'INSERT INTO vegetables (name, category, price, quantity) VALUES (?, ?, ?, ?)'
  );
  [
    ['Spinach', 'Leafy', 3.8, 24],
    ['Carrot', 'Root', 1.6, 60],
    ['Tomato', 'Fruiting', 2.9, 8],
    ['Broccoli', 'Cruciferous', 3.2, 31],
    ['Red onion', 'Allium', 1.4, 45],
    ['Green beans', 'Legume', 4.1, 6],
  ].forEach((row) => insert.run(...row));
}

// ---------- Middleware ----------
app.use(express.json());                                   // read JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));   // serve the front end

// ---------- Validation helper ----------
function validate(body) {
  const name = String(body.name ?? '').trim();
  const category = String(body.category ?? '').trim();
  const price = Number(body.price);
  const quantity = Number(body.quantity);

  if (!name) return { error: 'Name is required.' };
  if (!category) return { error: 'Choose a category.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be 0 or more.' };
  if (!Number.isInteger(quantity) || quantity < 0)
    return { error: 'Stock must be a whole number of 0 or more.' };

  return { value: { name, category, price, quantity } };
}

// ---------- CRUD routes ----------

// READ all
app.get('/api/vegetables', (req, res) => {
  res.json(db.prepare('SELECT * FROM vegetables ORDER BY name COLLATE NOCASE').all());
});

// READ one
app.get('/api/vegetables/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM vegetables WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Vegetable not found.' });
  res.json(row);
});

// CREATE
app.post('/api/vegetables', (req, res) => {
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });

  const info = db
    .prepare('INSERT INTO vegetables (name, category, price, quantity) VALUES (?, ?, ?, ?)')
    .run(value.name, value.category, value.price, value.quantity);

  res.status(201).json(db.prepare('SELECT * FROM vegetables WHERE id = ?').get(info.lastInsertRowid));
});

// UPDATE
app.put('/api/vegetables/:id', (req, res) => {
  const { error, value } = validate(req.body);
  if (error) return res.status(400).json({ error });

  const info = db
    .prepare('UPDATE vegetables SET name = ?, category = ?, price = ?, quantity = ? WHERE id = ?')
    .run(value.name, value.category, value.price, value.quantity, req.params.id);

  if (info.changes === 0) return res.status(404).json({ error: 'Vegetable not found.' });
  res.json(db.prepare('SELECT * FROM vegetables WHERE id = ?').get(req.params.id));
});

// DELETE
app.delete('/api/vegetables/:id', (req, res) => {
  const info = db.prepare('DELETE FROM vegetables WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Vegetable not found.' });
  res.status(204).end();
});

// Handles bad JSON and similar errors
app.use((err, req, res, next) => {
  res.status(400).json({ error: 'Invalid request.' });
});

app.listen(PORT, () => console.log(`Vegetable dashboard running at http://localhost:${PORT}`));