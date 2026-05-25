// ============================================================
// server.js — Servidor principal Express
// ============================================================
const express = require('express');
const session = require('express-session');
const path    = require('path');
const fs      = require('fs');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Senha do professor (admin) ────────────────────────────
const ADMIN_PASSWORD = 'professor2024';

// ── Catálogo de cartas (lido do JSON) ─────────────────────
const CATALOG_PATH = path.join(__dirname, 'public/assets/cards/cards.json');
let CARD_CATALOG = {};
try {
  CARD_CATALOG = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  console.log('🃏 Catálogo de cartas carregado:', Object.keys(CARD_CATALOG).map(k => `${k}(${CARD_CATALOG[k].length})`).join(', '));
} catch (e) {
  console.warn('⚠ Catálogo cards.json não encontrado ou inválido. Usando catálogo vazio.');
}

// ── Tipos de carta e custos da lojinha ───────────────────
const CARD_TYPES = ['logica', 'crescimento', 'suporte', 'velocidade'];
const CARD_COSTS = { comum: 50, especifica: 100, mestra: null };

// ── Helper: pega carta aleatória de um tipo ───────────────
function randomCardOf(tipo) {
  const pool = CARD_CATALOG[tipo];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Middlewares ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'cartas-conquista-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 },
}));

// ── Middlewares de autenticação ───────────────────────────
const requireStudent = (req, res, next) => {
  if (req.session?.studentId) return next();
  res.status(401).json({ error: 'Não autenticado' });
};

const requireAdmin = (req, res, next) => {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Acesso negado' });
};

// ══════════════════════════════════════════════════════════
// ROTAS DE AUTENTICAÇÃO
// ══════════════════════════════════════════════════════════

app.post('/api/login', async (req, res) => {
  const student = await db.findByPassword(req.body.password?.trim());
  if (!student) return res.status(401).json({ error: 'Senha incorreta' });
  req.session.studentId = student._id.toString();
  req.session.isAdmin   = false;
  res.json({ ok: true, name: student.name, id: student._id.toString() });
});

app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Senha de professor incorreta' });
  req.session.isAdmin   = true;
  req.session.studentId = null;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (req.session?.isAdmin)   return res.json({ role: 'admin' });
  if (req.session?.studentId) return res.json({ role: 'student', id: req.session.studentId });
  res.json({ role: 'guest' });
});

// ── Catálogo público (alunos e admin precisam) ─────────────
app.get('/api/cards/catalog', (req, res) => {
  res.json(CARD_CATALOG);
});

// ══════════════════════════════════════════════════════════
// ROTAS DO ALUNO
// ══════════════════════════════════════════════════════════

app.get('/api/student/profile', requireStudent, async (req, res) => {
  const student = await db.findById(req.session.studentId);
  const cards   = await db.getCards(req.session.studentId);
  const log     = await db.getXPLog(req.session.studentId);
  res.json({ student, cards, log });
});

app.post('/api/student/buy-card', requireStudent, async (req, res) => {
  const { type, cardType, cardId } = req.body;
  const student = await db.findById(req.session.studentId);

  if (type === 'mestra')
    return res.status(403).json({ error: 'A Carta Mestra só é concedida pelo professor ao completar o projeto final.' });

  const cost = CARD_COSTS[type];
  if (!cost) return res.status(400).json({ error: 'Tipo inválido' });
  if (student.xp < cost)
    return res.status(400).json({ error: `XP insuficiente. Você precisa de ${cost} XP.` });

  // ── Determina o tipo final ────────────────────────────
  const finalType = (type === 'especifica' && cardType)
    ? cardType
    : CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];

  // ── Determina a carta específica ──────────────────────
  const pool = CARD_CATALOG[finalType] || [];
  let selectedCard = null;

  if (type === 'especifica' && cardId) {
    // Aluno escolheu uma carta específica
    selectedCard = pool.find(c => c.id === cardId) || null;
  }
  // Se não escolheu (comum) ou não achou o id: sorteia
  if (!selectedCard && pool.length > 0) {
    selectedCard = pool[Math.floor(Math.random() * pool.length)];
  }

  const rarity    = type === 'especifica' ? 'especifica' : 'comum';
  const cardName  = selectedCard?.name  || finalType;
  const cardImage = selectedCard?.image || null;
  const cId       = selectedCard?.id    || null;

  await db.changeXP(
    req.session.studentId,
    -cost,
    `Comprou carta ${rarity}: ${cardName}`
  );
  await db.addCard(req.session.studentId, finalType, rarity, cId, cardName, cardImage);

  const updated = await db.findById(req.session.studentId);
  res.json({
    ok: true,
    xp:        updated.xp,
    cardType:  finalType,
    cardName,
    cardImage,
    cardId:    cId,
  });
});

// ══════════════════════════════════════════════════════════
// ROTAS DO ADMIN
// ══════════════════════════════════════════════════════════

app.get('/api/admin/students', requireAdmin, async (req, res) => {
  const students = await db.allStudents();
  const result   = await Promise.all(
    students.map(async s => ({ ...s, cards: await db.getCards(s.id) }))
  );
  res.json(result);
});

app.post('/api/admin/xp', requireAdmin, async (req, res) => {
  const { studentId, delta, reason } = req.body;
  if (!studentId || delta === undefined)
    return res.status(400).json({ error: 'Dados incompletos' });

  await db.changeXP(studentId, Number(delta), reason || 'Alteração manual pelo professor');
  const updated = await db.findById(studentId);
  res.json({ ok: true, xp: updated.xp });
});

app.post('/api/admin/give-card', requireAdmin, async (req, res) => {
  const { studentId, cardType, rarity, cardId } = req.body;
  if (!studentId || !cardType)
    return res.status(400).json({ error: 'Dados incompletos' });

  // Resolve a carta específica (se informada) ou sorteia
  const pool = CARD_CATALOG[cardType] || [];
  let selectedCard = null;

  if (cardId) {
    selectedCard = pool.find(c => c.id === cardId) || null;
  }
  if (!selectedCard && pool.length > 0) {
    selectedCard = pool[Math.floor(Math.random() * pool.length)];
  }

  const cardName  = selectedCard?.name  || cardType;
  const cardImage = selectedCard?.image || null;
  const cId       = selectedCard?.id    || null;

  await db.addCard(studentId, cardType, rarity || 'comum', cId, cardName, cardImage);
  res.json({ ok: true, cardName, cardImage });
});

app.get('/api/admin/log', requireAdmin, async (req, res) => {
  res.json(await db.allXPLog());
});

app.post('/api/admin/reset', requireAdmin, async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId obrigatório' });
  await db.resetStudent(studentId);
  res.json({ ok: true });
});

// ── Fallback SPA ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Conecta ao MongoDB e inicia o servidor ────────────────
db.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎮 Cartas de Conquista rodando em http://localhost:${PORT}`);
      console.log(`👨‍🏫 Área admin: http://localhost:${PORT}/admin.html`);
      console.log(`🔑 Senha do professor: ${ADMIN_PASSWORD}\n`);
    });
  })
  .catch(err => {
    console.error('❌ Falha ao conectar no MongoDB:', err.message);
    process.exit(1);
  });