// ============================================================
// database.js — Banco de dados MongoDB Atlas
// Usa a variável de ambiente MONGO_URI para conectar
// ============================================================
const { MongoClient, ObjectId } = require('mongodb');

// ── URI vem da variável de ambiente (definida no Render) ──
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('\n❌ ERRO: variável MONGO_URI não definida!');
  console.error('   Defina ela no Render > Environment > MONGO_URI\n');
  process.exit(1);
}

// ── Seed: 10 alunos iniciais ──────────────────────────────
const STUDENTS_SEED = [
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

// ── Variáveis do cliente e coleções ──────────────────────
let studentsCol, cardsCol, xpLogCol;

// ── Conecta e retorna o módulo pronto ────────────────────
async function connect() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('cartas'); // nome do banco

  studentsCol = db.collection('students');
  cardsCol    = db.collection('cards');
  xpLogCol    = db.collection('xplog');

  // Índices para buscas rápidas
  await studentsCol.createIndex({ password: 1 }, { unique: true });
  await cardsCol.createIndex({ studentId: 1 });
  await xpLogCol.createIndex({ studentId: 1 });

  // Insere alunos iniciais se ainda não existirem
  for (const s of STUDENTS_SEED) {
    await studentsCol.updateOne(
      { password: s.password },
      { $setOnInsert: { name: s.name, password: s.password, xp: 0, createdAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('✅ MongoDB Atlas conectado!');
}

// ─────────────────────────────────────────────────────────
// HELPERS — todos async (retornam Promise)
// ─────────────────────────────────────────────────────────

/** Busca aluno pela senha */
async function findByPassword(pwd) {
  return studentsCol.findOne({ password: pwd });
}

/** Retorna todos os alunos ordenados por XP (sem a senha) */
async function allStudents() {
  const list = await studentsCol
    .find({}, { projection: { password: 0 } })
    .sort({ xp: -1 })
    .toArray();
  // Normaliza _id para id string
  return list.map(s => ({ ...s, id: s._id.toString() }));
}

/** Busca aluno por ID (sem a senha) */
async function findById(id) {
  let query;
  try { query = { _id: new ObjectId(id) }; }
  catch { return null; }
  const s = await studentsCol.findOne(query, { projection: { password: 0 } });
  return s ? { ...s, id: s._id.toString() } : null;
}

/** Altera XP de um aluno e registra no log */
async function changeXP(studentId, delta, reason) {
  let oid;
  try { oid = new ObjectId(studentId); } catch { return; }

  // Garante que o XP não fique negativo
  const student = await studentsCol.findOne({ _id: oid });
  const novoXP  = Math.max(0, (student?.xp || 0) + Number(delta));

  await studentsCol.updateOne({ _id: oid }, { $set: { xp: novoXP } });
  await xpLogCol.insertOne({
    studentId: studentId.toString(),
    delta: Number(delta),
    reason,
    loggedAt: new Date(),
  });
}

/** Adiciona carta ao aluno */
async function addCard(studentId, cardType, rarity = 'comum') {
  await cardsCol.insertOne({
    studentId: studentId.toString(),
    card_type: cardType,
    rarity,
    acquired_at: new Date(),
  });
}

/** Retorna cartas de um aluno (mais recentes primeiro) */
async function getCards(studentId) {
  return cardsCol
    .find({ studentId: studentId.toString() })
    .sort({ acquired_at: -1 })
    .toArray();
}

/** Histórico de XP de um aluno (últimas 20) */
async function getXPLog(studentId) {
  return xpLogCol
    .find({ studentId: studentId.toString() })
    .sort({ loggedAt: -1 })
    .limit(20)
    .toArray();
}

/** Log global com nome do aluno (últimas 50) */
async function allXPLog() {
  const logs     = await xpLogCol.find().sort({ loggedAt: -1 }).limit(50).toArray();
  const students = await studentsCol.find().toArray();
  const map      = {};
  students.forEach(s => { map[s._id.toString()] = s.name; });
  return logs.map(l => ({ ...l, name: map[l.studentId] || '?' }));
}

/** Reset completo de um aluno */
async function resetStudent(studentId) {
  let oid;
  try { oid = new ObjectId(studentId); } catch { return; }
  await studentsCol.updateOne({ _id: oid }, { $set: { xp: 0 } });
  await cardsCol.deleteMany({ studentId: studentId.toString() });
  await xpLogCol.deleteMany({ studentId: studentId.toString() });
}

module.exports = {
  connect,
  findByPassword,
  allStudents,
  findById,
  changeXP,
  addCard,
  getCards,
  getXPLog,
  allXPLog,
  resetStudent,
};
