// ============================================================
// utils.js — Funções compartilhadas entre todas as páginas
// ============================================================

/**
 * Exibe uma notificação toast temporária
 * @param {string} message - Texto a exibir
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - Milissegundos (padrão 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Faz logout e volta para o login
 */
async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

/**
 * Formata data ISO em formato legível
 * @param {string} iso
 */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Mapeia tipo de carta para emoji e label
 */
const CARD_META = {
  logica:       { emoji: '🧠', label: 'Lógica',       cls: 'card-logica'      },
  crescimento:  { emoji: '🌱', label: 'Crescimento',  cls: 'card-crescimento' },
  suporte:      { emoji: '🤝', label: 'Suporte',      cls: 'card-suporte'     },
  velocidade:   { emoji: '⚡', label: 'Velocidade',   cls: 'card-velocidade'  },
  mestra:       { emoji: '👑', label: 'Mestra',       cls: 'card-mestra'      },
};

/**
 * Resolve a URL da imagem: MongoDB → catálogo (card_id) → fallback por tipo
 */
function resolveCardImage(card, catalog = {}) {
  const pool = catalog[card?.card_type] || [];
  if (card?.card_id) {
    const found = pool.find(c => c.id === card.card_id);
    if (found?.image) return found.image;
  }

  if (card?.card_image) return card.card_image;

  if (pool.length > 0 && pool[0].image) return pool[0].image;

  const typeFallback = {
    logica: '/assets/cards/fallback/logica.svg',
    crescimento: '/assets/cards/fallback/crescimento.svg',
    suporte: '/assets/cards/fallback/suporte.svg',
    velocidade: '/assets/cards/fallback/velocidade.svg',
    mestra: '/assets/cards/fallback/mestra.svg',
  };
  return typeFallback[card?.card_type] || null;
}

/**
 * Cria o HTML de um game-card visual com imagem de fundo
 */
function renderGameCard(card, catalog = {}) {
  const meta = CARD_META[card.card_type] || { emoji: '🃏', label: card.card_type, cls: 'card-logica' };
  const displayName = card.card_name || meta.label;
  const imageUrl = resolveCardImage(card, catalog);
  const hasImage = Boolean(imageUrl);
  const bgStyle = hasImage ? `background-image:url('${imageUrl.replace(/'/g, '%27')}');` : '';

  return `
    <div class="game-card ${meta.cls}${hasImage ? ' game-card--has-image' : ''}"
         style="${bgStyle}"
         title="${escapeHtml(displayName)} — adquirida em ${formatDate(card.acquired_at)}">
      ${hasImage ? '' : `<div class="card-icon">${meta.emoji}</div>`}
      <div class="card-footer">
        <div class="card-name">${escapeHtml(displayName)}</div>
        <div class="card-rarity">${escapeHtml(card.rarity || '')}</div>
      </div>
    </div>
  `;
}

/**
 * Atualiza a barra de XP e texto de porcentagem
 */
function updateXPBar(xp) {
  const MAX = 1000;
  const pct  = Math.min(100, (xp / MAX) * 100);
  const bar  = document.getElementById('xp-bar');
  const pctEl = document.getElementById('xp-pct');
  const xpEl  = document.getElementById('xp-display');
  const hXP   = document.getElementById('header-xp');

  if (bar)   bar.style.width   = pct + '%';
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  if (xpEl)  xpEl.textContent  = xp;
  if (hXP)   hXP.textContent   = xp + ' XP';
}
