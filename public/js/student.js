// ============================================================
// student.js — Lógica do dashboard do aluno
// ============================================================

// ── Verificar autenticação ao carregar ──────────────────
(async () => {
  const res  = await fetch('/api/me');
  const data = await res.json();

  if (data.role === 'admin')   { window.location.href = '/admin.html'; return; }
  if (data.role !== 'student') { window.location.href = '/';           return; }

  // Carrega os dados do perfil
  await loadProfile();
})();

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
async function buyCard(type) {
  // Pega o subtipo para cartas específicas
  let cardType = undefined;
  if (type === 'especifica') {
    const sel = document.getElementById('card-type-select');
    cardType = sel ? sel.value : 'logica';
  }

  try {
    const res  = await fetch('/api/student/buy-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, cardType }),
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

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

// ── Polling: atualiza o perfil a cada 30s ──────────────
// (para que o aluno veja o XP do professor em tempo quasi-real)
setInterval(loadProfile, 30_000);
