/**
 * Verifica se todas as imagens do catálogo existem em public/assets/cards/
 * Uso: node scripts/verify-card-images.js
 */
const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../public/assets/cards/cards.json');
const PUBLIC_ROOT = path.join(__dirname, '../public');

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
let ok = 0;
let fail = 0;

for (const [tipo, cards] of Object.entries(catalog)) {
  for (const card of cards) {
    const rel = card.image.startsWith('/') ? card.image.slice(1) : card.image;
    const filePath = path.join(PUBLIC_ROOT, rel);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${tipo}/${card.id} → ${card.image}`);
      ok++;
    } else {
      console.error(`✗ FALTANDO: ${card.image} (${tipo}/${card.id})`);
      fail++;
    }
  }
}

console.log(`\n${ok} ok, ${fail} faltando`);
process.exit(fail > 0 ? 1 : 0);
