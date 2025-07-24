// db.js
const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

async function readDB() {
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(newData) {
  await fs.writeFile(dbPath, JSON.stringify(newData, null, 2));
}

module.exports = {
  readDB,
  writeDB,
};