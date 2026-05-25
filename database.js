// ============================================================
// database.js — Banco de dados baseado em arquivo JSON
// (compatível com qualquer ambiente Node.js, sem compilação nativa)
// ============================================================
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'conquista.json');

// ── Garantir que a pasta db exista ───────────────────────
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// ── Estrutura do banco em memória ─────────────────────────
let _db = {
  students: [],  // { id, name, password, xp }
  cards:    [],  // { id, studentId, cardType, rarity, acquiredAt }
  xpLog:    [],  // { id, studentId, delta, reason, loggedAt }
  _nextId:  { students: 1, cards: 1, xpLog: 1 },
};

// ── Carrega o banco do disco (se existir) ─────────────────
function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      _db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao carregar banco:', e.message);
  }
}

// ── Salva o banco no disco ────────────────────────────────
function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2), 'utf8');
}

// ── Seed inicial: 10 alunos ───────────────────────────────
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

function seed() {
  for (const s of STUDENTS_SEED) {
    const exists = _db.students.find(x => x.password === s.password);
    if (!exists) {
      _db.students.push({
        id: _db._nextId.students++,
        name: s.name,
        password: s.password,
        xp: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }
  save();
}

// ── Inicializa ────────────────────────────────────────────
load();
seed();

// ═════════════════════════════════════════════════════════
// HELPERS EXPORTADOS
// ═════════════════════════════════════════════════════════

module.exports = {

  /** Busca aluno pela senha */
  findByPassword(pwd) {
    return _db.students.find(s => s.password === pwd) || null;
  },

  /** Retorna todos os alunos ordenados por XP (sem a senha) */
  allStudents() {
    return _db.students
      .slice()
      .sort((a, b) => b.xp - a.xp)
      .map(({ password, ...rest }) => rest);
  },

  /** Busca aluno por ID (sem a senha) */
  findById(id) {
    const s = _db.students.find(s => s.id === Number(id));
    if (!s) return null;
    const { password, ...rest } = s;
    return rest;
  },

  /** Altera XP de um aluno e registra no log */
  changeXP(studentId, delta, reason) {
    const s = _db.students.find(s => s.id === Number(studentId));
    if (!s) return;
    s.xp = Math.max(0, s.xp + Number(delta));
    _db.xpLog.push({
      id: _db._nextId.xpLog++,
      studentId: Number(studentId),
      delta: Number(delta),
      reason,
      loggedAt: new Date().toISOString(),
    });
    save();
  },

  /** Adiciona carta ao aluno */
  addCard(studentId, cardType, rarity = 'comum') {
    _db.cards.push({
      id: _db._nextId.cards++,
      studentId: Number(studentId),
      card_type: cardType,
      rarity,
      acquired_at: new Date().toISOString(),
    });
    save();
  },

  /** Retorna cartas de um aluno (mais recentes primeiro) */
  getCards(studentId) {
    return _db.cards
      .filter(c => c.studentId === Number(studentId))
      .sort((a, b) => new Date(b.acquired_at) - new Date(a.acquired_at));
  },

  /** Historico de XP de um aluno (ultimas 20) */
  getXPLog(studentId) {
    return _db.xpLog
      .filter(l => l.studentId === Number(studentId))
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
      .slice(0, 20);
  },

  /** Log global de XP com nome do aluno (ultimas 50) */
  allXPLog() {
    return _db.xpLog
      .slice()
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
      .slice(0, 50)
      .map(entry => {
        const student = _db.students.find(s => s.id === entry.studentId);
        return { ...entry, name: student ? student.name : '?' };
      });
  },

  /** Reset completo de um aluno */
  resetStudent(studentId) {
    const id = Number(studentId);
    const s  = _db.students.find(s => s.id === id);
    if (s) s.xp = 0;
    _db.cards  = _db.cards.filter(c => c.studentId !== id);
    _db.xpLog  = _db.xpLog.filter(l => l.studentId !== id);
    save();
  },
};
