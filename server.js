// ============================================================
// server.js — Servidor principal Express
// ============================================================
const express = require('express');
const session = require('express-session');
const path    = require('path');
const {
  db, findByPassword, allStudents, findById,
  changeXP, addCard, getCards, getXPLog,
  allXPLog, resetStudent,
} = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Senha do professor (admin) ────────────────────────────
const ADMIN_PASSWORD = 'professor2024';

// ── Definição dos tipos de carta e raridades ──────────────
const CARD_TYPES  = ['logica', 'crescimento', 'suporte', 'velocidade'];
const CARD_COSTS  = { comum: 50, especifica: 100, mestra: null };

// ── Middlewares ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'cartas-conquista-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8h
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

// Login do aluno
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const student = findByPassword(password?.trim());
  if (!student) return res.status(401).json({ error: 'Senha incorreta' });

  req.session.studentId = student.id;
  req.session.isAdmin   = false;
  res.json({ ok: true, name: student.name, id: student.id });
});

// Login do professor
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Senha de professor incorreta' });

  req.session.isAdmin   = true;
  req.session.studentId = null;
  res.json({ ok: true });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Verificar sessão
app.get('/api/me', (req, res) => {
  if (req.session?.isAdmin)    return res.json({ role: 'admin' });
  if (req.session?.studentId)  return res.json({ role: 'student', id: req.session.studentId });
  res.json({ role: 'guest' });
});

// ══════════════════════════════════════════════════════════
// ROTAS DO ALUNO
// ══════════════════════════════════════════════════════════

// Perfil completo do aluno logado
app.get('/api/student/profile', requireStudent, (req, res) => {
  const student = findById(req.session.studentId);
  const cards   = getCards(req.session.studentId);
  const log     = getXPLog(req.session.studentId);
  res.json({ student, cards, log });
});

// Comprar carta
app.post('/api/student/buy-card', requireStudent, (req, res) => {
  const { type } = req.body; // 'comum' | 'especifica' | 'mestra'
  const student  = findById(req.session.studentId);

  if (type === 'mestra') {
    return res.status(403).json({ error: 'A Carta Mestra só é concedida pelo professor ao completar o projeto final.' });
  }

  const cost = CARD_COSTS[type];
  if (!cost) return res.status(400).json({ error: 'Tipo inválido' });

  if (student.xp < cost)
    return res.status(400).json({ error: `XP insuficiente. Você precisa de ${cost} XP.` });

  // Desconta XP e adiciona carta
  const cardType = type === 'especifica'
    ? req.body.cardType || CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)]
    : CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];

  changeXP(req.session.studentId, -cost, `Comprou carta ${type}: ${cardType}`);
  addCard(req.session.studentId, cardType, type === 'especifica' ? 'especifica' : 'comum');

  const updated = findById(req.session.studentId);
  res.json({ ok: true, xp: updated.xp, cardType });
});

// ══════════════════════════════════════════════════════════
// ROTAS DO ADMIN
// ══════════════════════════════════════════════════════════

// Lista todos os alunos
app.get('/api/admin/students', requireAdmin, (req, res) => {
  const students = allStudents();
  // Anexa cartas de cada aluno
  const result = students.map(s => ({
    ...s,
    cards: getCards(s.id),
  }));
  res.json(result);
});

// Altera XP de um aluno
app.post('/api/admin/xp', requireAdmin, (req, res) => {
  const { studentId, delta, reason } = req.body;
  if (!studentId || delta === undefined)
    return res.status(400).json({ error: 'Dados incompletos' });

  changeXP(Number(studentId), Number(delta), reason || 'Alteração manual pelo professor');
  const updated = findById(studentId);
  res.json({ ok: true, xp: updated.xp });
});

// Dar carta a um aluno
app.post('/api/admin/give-card', requireAdmin, (req, res) => {
  const { studentId, cardType, rarity } = req.body;
  if (!studentId || !cardType)
    return res.status(400).json({ error: 'Dados incompletos' });

  addCard(Number(studentId), cardType, rarity || 'comum');

  if (rarity === 'mestra') {
    changeXP(Number(studentId), 0, `Recebeu Carta Mestra: ${cardType}`);
  }

  res.json({ ok: true });
});

// Log global de XP
app.get('/api/admin/log', requireAdmin, (req, res) => {
  res.json(allXPLog());
});

// Resetar progresso de um aluno
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId obrigatório' });
  resetStudent(Number(studentId));
  res.json({ ok: true });
});

// ── Fallback: redireciona tudo para index.html ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Inicia servidor ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎮 Cartas de Conquista rodando em http://localhost:${PORT}`);
  console.log(`👨‍🏫 Área admin: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Senha do professor: ${ADMIN_PASSWORD}\n`);
});
