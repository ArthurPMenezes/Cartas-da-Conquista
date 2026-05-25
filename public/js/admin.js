// ============================================================
// admin.js — Lógica do painel do professor
// ============================================================

// Senhas dos alunos (exibidas no painel para referência)
const STUDENT_PASSWORDS = [
  { name: 'Ana Luiza',       password: 'ana123'    },
  { name: 'Francisco',       password: 'francisco456'  },
  { name: 'Henrique',        password: 'henrique789'  },
  { name: 'Anna Beatriz',    password: 'anna321'  },
  { name: 'Matheus',         password: 'matheus654'    },
  { name: 'Arthur',          password: 'arthur987' },
  { name: 'Ana Beatriz',     password: 'beatriz111'   },
  { name: 'Melo',            password: 'henri222'  },
  { name: 'Isabela Torres',  password: 'isa333'    },
  { name: 'Joao Alves',      password: 'joao444'   },
];

// ── Verificar sessão admin ──────────────────────────────
(async () => {
  const res  = await fetch('/api/me');
  const data = await res.json();
  if (data.role === 'admin') {
    showAdminPanel();
    loadStudents();
    loadLog();
    renderPasswordList();
  }
  // Se não é admin, mostra o login (já visível por padrão)
})();

// ── Exibir painel admin ─────────────────────────────────
function showAdminPanel() {
  document.getElementById('admin-login-page').classList.add('hidden');
  document.getElementById('admin-page').classList.remove('hidden');
}

// ── Login do professor ──────────────────────────────────
async function loginAdmin() {
  const pass = document.getElementById('admin-pass').value.trim();
  if (!pass) return showToast('Digite a senha!', 'error');

  try {
    const res  = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json();

    if (!res.ok) return showToast(data.error || 'Senha incorreta', 'error');

    showToast('Bem-vindo, Professor!', 'success');
    showAdminPanel();
    loadStudents();
    loadLog();
    renderPasswordList();

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

document.getElementById('admin-pass')
  ?.addEventListener('keydown', e => { if (e.key === 'Enter') loginAdmin(); });

// ── Carregar lista de alunos ────────────────────────────
async function loadStudents() {
  try {
    const res     = await fetch('/api/admin/students');
    if (res.status === 401) return;
    const students = await res.json();

    renderTable(students);
    populateSelects(students);

  } catch (e) {
    showToast('Erro ao carregar alunos', 'error');
  }
}

// ── Renderizar tabela de alunos ─────────────────────────
function renderTable(students) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  const MAX_XP = 1000;

  tbody.innerHTML = students.map((s, i) => {
    const rank    = i + 1;
    const rankCls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
    const pct     = Math.min(100, (s.xp / MAX_XP) * 100).toFixed(1);

    // Dot de cartas (máx 8 visíveis)
    const dots = (s.cards || []).slice(0, 8).map(c => {
      const cls = `dot-${c.card_type}`;
      const title = CARD_META[c.card_type]?.label || c.card_type;
      return `<span class="card-dot ${cls}" title="${title}"></span>`;
    }).join('');
    const extra = s.cards.length > 8 ? `<span style="font-size:0.65rem;color:var(--text-muted)">+${s.cards.length-8}</span>` : '';

    return `
      <tr>
        <td><span class="rank-badge ${rankCls}">${rank}°</span></td>
        <td style="font-weight:600">${s.name}</td>
        <td class="xp-cell">${s.xp}</td>
        <td>
          <div class="mini-bar-wrap">
            <div class="mini-bar-fill" style="width:${pct}%"></div>
          </div>
          <span style="font-size:0.65rem;color:var(--text-dim);font-family:var(--font-mono)">${pct}%</span>
        </td>
        <td>
          <div class="cards-mini">${dots}${extra}</div>
          <span style="font-size:0.65rem;color:var(--text-muted);font-family:var(--font-mono)">${s.cards.length} carta(s)</span>
        </td>
        <td>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            <button class="btn btn-green" style="padding:0.25rem 0.5rem;font-size:0.6rem"
                    onclick="quickXP(${s.id}, 10, 'Completou o exercício do dia')">+10</button>
            <button class="btn btn-blue" style="padding:0.25rem 0.5rem;font-size:0.6rem"
                    onclick="quickXP(${s.id}, 30, 'Desafio extra de Lógica')">+30</button>
            <button class="btn btn-gold" style="padding:0.25rem 0.5rem;font-size:0.6rem"
                    onclick="quickXP(${s.id}, 50, 'Completou todos os desafios da semana')">+50</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Preencher selects de alunos ─────────────────────────
function populateSelects(students) {
  const selects = ['xp-student-select', 'card-student-select', 'reset-student-select'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Escolha --</option>' +
      students.map(s => `<option value="${s.id}">${s.name} (${s.xp} XP)</option>`).join('');
    if (current) sel.value = current;
  });
}

// ── Aplicar XP (form completo) ──────────────────────────
async function submitXP() {
  const studentId = document.getElementById('xp-student-select').value;
  const delta     = Number(document.getElementById('xp-delta').value);
  const isCustom  = document.getElementById('xp-reason-select').value === 'outro';
  const reason    = isCustom
    ? document.getElementById('xp-reason-custom').value.trim()
    : document.getElementById('xp-reason-select').value;

  if (!studentId) return showToast('Selecione um aluno', 'error');
  if (!delta)     return showToast('Digite um valor de XP', 'error');
  if (!reason)    return showToast('Digite o motivo', 'error');

  await applyXP(studentId, delta, reason);
}

// ── XP rápido via botão da tabela ──────────────────────
async function quickXP(studentId, delta, reason) {
  await applyXP(studentId, delta, reason);
}

// ── Enviar alteração de XP ──────────────────────────────
async function applyXP(studentId, delta, reason) {
  try {
    const res  = await fetch('/api/admin/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, delta, reason }),
    });
    const data = await res.json();

    if (!res.ok) return showToast(data.error || 'Erro', 'error');

    showToast(`XP ${delta > 0 ? '+' : ''}${delta} aplicado! Novo total: ${data.xp} XP`, 'success');
    loadStudents();
    loadLog();

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

// ── Dar carta manualmente ───────────────────────────────
async function submitCard() {
  const studentId = document.getElementById('card-student-select').value;
  const cardType  = document.getElementById('card-type-admin').value;
  const rarity    = document.getElementById('card-rarity-admin').value;

  if (!studentId) return showToast('Selecione um aluno', 'error');

  try {
    const res  = await fetch('/api/admin/give-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, cardType, rarity }),
    });
    const data = await res.json();

    if (!res.ok) return showToast(data.error || 'Erro', 'error');

    const meta = CARD_META[cardType] || { emoji: '🃏', label: cardType };
    showToast(`${meta.emoji} Carta ${meta.label} dada com sucesso!`, 'success');
    loadStudents();

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

// ── Resetar aluno ───────────────────────────────────────
async function submitReset() {
  const studentId = document.getElementById('reset-student-select').value;
  if (!studentId) return showToast('Selecione um aluno', 'error');

  const select  = document.getElementById('reset-student-select');
  const name    = select.options[select.selectedIndex].text;
  const confirm = window.confirm(`⚠ Tem certeza que deseja resetar o progresso de "${name}"?\n\nEssa ação não pode ser desfeita!`);
  if (!confirm) return;

  try {
    const res  = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();

    if (!res.ok) return showToast(data.error || 'Erro', 'error');

    showToast(`Progresso de ${name} resetado.`, 'info');
    loadStudents();
    loadLog();

  } catch (e) {
    showToast('Erro de conexão', 'error');
  }
}

// ── Carregar log global ─────────────────────────────────
async function loadLog() {
  try {
    const res  = await fetch('/api/admin/log');
    if (!res.ok) return;
    const log  = await res.json();

    const container = document.getElementById('global-log');
    if (!container) return;

    if (!log.length) {
      container.innerHTML = '<span style="font-size:0.72rem;color:var(--text-dim);font-family:var(--font-mono)">Nenhum registro ainda.</span>';
      return;
    }

    container.innerHTML = log.map(e => {
      const pos = e.delta >= 0;
      const sign = pos ? '+' : '';
      return `
        <div class="log-item-small">
          <span class="name">${e.name}</span>
          <span class="reason">${e.reason}</span>
          <span class="delta ${pos ? 'pos' : 'neg'}">${sign}${e.delta}</span>
        </div>
      `;
    }).join('');

  } catch (e) { /* silencioso */ }
}

// ── Renderizar lista de senhas ──────────────────────────
function renderPasswordList() {
  const el = document.getElementById('passwords-list');
  if (!el) return;
  el.innerHTML = STUDENT_PASSWORDS.map(s =>
    `<div style="display:flex;justify-content:space-between;color:var(--text-muted);padding:0.2rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="color:var(--text-primary)">${s.name}</span>
      <span style="color:var(--neon-blue)">${s.password}</span>
    </div>`
  ).join('');
}

// ── Mostrar/esconder campo de motivo personalizado ──────
function updateReasonField() {
  const val = document.getElementById('xp-reason-select').value;
  const row = document.getElementById('reason-custom-row');
  if (row) row.style.display = val === 'outro' ? 'block' : 'none';
}

// ── Auto-refresh a cada 15s ─────────────────────────────
setInterval(() => {
  // Só atualiza se admin-page está visível
  if (!document.getElementById('admin-page').classList.contains('hidden')) {
    loadStudents();
    loadLog();
  }
}, 15_000);
