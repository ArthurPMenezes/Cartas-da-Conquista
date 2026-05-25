// ============================================================
// student.js — Lógica do dashboard do aluno
// ============================================================

let cardCatalog = {};

// ── Verificar autenticação ao carregar ──────────────────
(async () => {
  const res  = await fetch('/api/me');
  const data = await res.json();

  if (data.role === 'admin')   { window.location.href = '/admin.html'; return; }
  if (data.role !== 'student') { window.location.href = '/';           return; }

  // Carrega o catálogo de cartas
  await loadCatalog();

  // Carrega os dados do perfil
  await loadProfile();
})();

// ── Carregar catálogo de cartas ────────────────────────
async function loadCatalog() {
  try {
    const res = await fetch('/api/cards/catalog');
    if (res.ok) {
      cardCatalog = await res.json();
      console.log('🃏 Catálogo carregado:', Object.keys(cardCatalog));
    }
  } catch (e) {
    console.error('Erro ao carregar catálogo:', e);
  }
}

// ── Carregar perfil completo do aluno ───────────────────
async function loadProfile() {
  try {
    const res  = await fetch('/api/student/profile');
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();

    // Atualiza nome no header
    const nameEl = document.getElementById('header-name');
    if (nameEl) nameEl.textContent = data.student.name;

    // Atualiza XP
    updateXPBar(data.student.xp);

    // Atualiza cartas
    renderCards(data.cards);

    // Atualiza log de XP
    renderLog(data.log);

  } catch (e) {
    showToast('Erro ao carregar perfil', 'error');
  }
}

// ── Renderiza a grade de cartas ─────────────────────────
function renderCards(cards) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  if (!cards || cards.length === 0) {
    grid.innerHTML = '<div class="card-empty">Você ainda não possui cartas.<br>Compre na lojinha com seu XP!</div>';
    return;
  }

  grid.innerHTML = cards.map(renderGameCard).join('');
}

// ── Renderiza o histórico de XP ─────────────────────────
function renderLog(log) {
  const list = document.getElementById('log-list');
  if (!list) return;

  if (!log || log.length === 0) {
    list.innerHTML = '<p style="font-size:0.75rem;color:var(--text-dim);font-family:var(--font-mono)">Nenhuma atividade ainda.</p>';
    return;
  }

  list.innerHTML = log.map(entry => {
    const positive = entry.delta >= 0;
    const sign     = positive ? '+' : '';
    return `
      <div class="log-item ${positive ? 'positive' : 'negative'}">
        <span class="log-reason">${entry.reason}</span>
        <span class="log-delta">${sign}${entry.delta} XP</span>
      </div>
    `;
  }).join('');
}

// ── Comprar carta ───────────────────────────────────────
async function buyCard(type, cardType = undefined, cardId = undefined) {
  try {
    const body = { type, cardType };
    if (cardId) body.cardId = cardId;

    const res  = await fetch('/api/student/buy-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Erro ao comprar carta', 'error');
      return;
    }

    // Atualiza XP na interface imediatamente
    updateXPBar(data.xp);

    const meta = CARD_META[data.cardType] || { emoji: '🃏', label: data.cardType };
    showToast(`${meta.emoji} Carta ${meta.label} adquirida!`, 'success');

    // Recarrega o perfil completo
    await loadProfile();

    // Fecha o modal se estiver aberto
    closeCardPicker();

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

// ── Comprar carta aleatória ────────────────────────────
async function buyRandom() {
  await buyCard('comum');
}

// ── Abrir modal seletor de cartas ──────────────────────
function openCardPicker(type) {
  const modal = document.getElementById('card-picker-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  renderPickerTabs();
  renderPickerGrid(Object.keys(cardCatalog)[0] || 'logica');
}

// ── Fechar modal ───────────────────────────────────────
function closeCardPicker() {
  const modal = document.getElementById('card-picker-modal');
  if (modal) modal.classList.add('hidden');
}

// ── Renderizar abas de tipo ────────────────────────────
function renderPickerTabs() {
  const tabsContainer = document.getElementById('picker-tabs');
  if (!tabsContainer) return;

  const types = Object.keys(cardCatalog);
  tabsContainer.innerHTML = types.map((type, idx) => {
    const meta = CARD_META[type] || { emoji: '🃏', label: type };
    const isFirst = idx === 0;
    return `
      <button class="picker-tab ${isFirst ? 'active' : ''}"
              onclick="switchPickerTab('${type}')"
              data-type="${type}">
        ${meta.emoji} ${meta.label}
      </button>
    `;
  }).join('');
}

// ── Trocar aba de tipo ────────────────────────────────
function switchPickerTab(type) {
  const tabs = document.querySelectorAll('.picker-tab');
  tabs.forEach(tab => {
    if (tab.dataset.type === type) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  renderPickerGrid(type);
}

// ── Renderizar grid de cartas de um tipo ──────────────
function renderPickerGrid(type) {
  const grid = document.getElementById('picker-grid');
  if (!grid) return;

  const cards = cardCatalog[type] || [];
  if (cards.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nenhuma carta disponível</p>';
    return;
  }

  grid.innerHTML = cards.map(card => `
    <div class="picker-card" onclick="selectCard('${type}', '${card.id}')">
      <div class="picker-card-name">${card.name}</div>
      <div class="picker-card-id">ID: ${card.id}</div>
    </div>
  `).join('');
}

// ── Selecionar e comprar carta específica ────────────
async function selectCard(type, cardId) {
  await buyCard('especifica', type, cardId);
}

// ── Polling: atualiza o perfil a cada 30s ──────────────
// (para que o aluno veja o XP do professor em tempo quasi-real)
setInterval(loadProfile, 30_000);

