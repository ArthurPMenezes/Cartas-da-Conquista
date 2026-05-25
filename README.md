# 🎮 Cartas de Conquista

Sistema web gamificado de XP e cartas para sala de aula, inspirado no banner *Cartas de Conquista*.

---

## 🚀 Como rodar o projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior

### Instalação

```bash
# 1. Entre na pasta do projeto
cd cartas-de-conquista

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start
```

O servidor inicia em **http://localhost:3000**

---

## 🔑 Senhas de acesso

### Alunos
| Aluno            | Senha       |
|------------------|-------------|
| Ana Lima         | `ana123`    |
| Bruno Silva      | `bruno456`  |
| Carla Mendes     | `carla789`  |
| Diego Costa      | `diego321`  |
| Eduarda Reis     | `edu654`    |
| Felipe Souza     | `felipe987` |
| Gabriela Nunes   | `gabi111`   |
| Henrique Melo    | `henri222`  |
| Isabela Torres   | `isa333`    |
| João Alves       | `joao444`   |

### Professor (Admin)
- URL: `http://localhost:3000/admin.html`
- Senha: `professor2024`

---

## 🗂️ Estrutura do projeto

```
cartas-de-conquista/
├── server.js          # Servidor Express + todas as rotas da API
├── database.js        # Inicialização do SQLite + helpers
├── package.json       # Dependências npm
├── db/
│   └── conquista.db   # Banco SQLite (criado automaticamente)
└── public/
    ├── index.html     # Página de login do aluno
    ├── student.html   # Dashboard do aluno
    ├── admin.html     # Painel do professor
    ├── css/
    │   └── style.css  # Tema futurista neon
    └── js/
        ├── utils.js   # Funções compartilhadas
        ├── student.js # Lógica do dashboard do aluno
        └── admin.js   # Lógica do painel admin
```

---

## 🧠 Arquitetura

### Backend (Node.js + Express)
- **`server.js`**: Servidor HTTP com todas as rotas REST (`/api/...`). Usa `express-session` para autenticação baseada em sessão (cookie).
- **`database.js`**: Cria e inicializa o banco SQLite via `better-sqlite3`. Exporta funções helpers que encapsulam todas as queries.

### Frontend (HTML + CSS + JS vanilla)
- Três páginas independentes (login, aluno, admin).
- Comunicam com o backend via `fetch()`.
- `utils.js` contém funções compartilhadas (toast, logout, renderização de cartas).

### Banco de dados (SQLite)
Três tabelas:
- **`students`** — dados dos alunos (nome, senha, XP)
- **`cards`** — cartas adquiridas por cada aluno
- **`xp_log`** — histórico de todas as alterações de XP

### Autenticação
- Sessões no servidor com cookie HTTP.
- Dois papéis: `student` e `admin`.
- Cada rota verifica o papel via middleware.

---

## ⚙️ API REST

| Método | Rota                    | Acesso  | Descrição                         |
|--------|-------------------------|---------|-----------------------------------|
| POST   | `/api/login`            | Público | Login do aluno (senha)            |
| POST   | `/api/admin/login`      | Público | Login do professor                |
| POST   | `/api/logout`           | Ambos   | Encerra sessão                    |
| GET    | `/api/me`               | Ambos   | Retorna papel da sessão atual     |
| GET    | `/api/student/profile`  | Aluno   | Perfil, cartas e log do aluno     |
| POST   | `/api/student/buy-card` | Aluno   | Compra carta com XP               |
| GET    | `/api/admin/students`   | Admin   | Lista todos os alunos             |
| POST   | `/api/admin/xp`         | Admin   | Altera XP de um aluno             |
| POST   | `/api/admin/give-card`  | Admin   | Dá carta manualmente              |
| GET    | `/api/admin/log`        | Admin   | Log global de XP                  |
| POST   | `/api/admin/reset`      | Admin   | Reseta progresso de um aluno      |

---

## 🎴 Lógica de XP e Cartas

### Tarefas e recompensas
| Tarefa                        | XP   |
|-------------------------------|------|
| Completar exercício do dia    | 10   |
| Ajudar um colega              | 15   |
| Desafio extra de Lógica       | 30   |
| Encontrar e reportar bug      | 20   |
| Propor melhoria ou ideia      | 25   |
| Apresentar projeto/solução    | 40   |
| Completar desafios da semana  | 50   |

### Lojinha
| Carta                  | Custo         |
|------------------------|---------------|
| Carta Comum Aleatória  | 50 XP         |
| Carta de Cor Específica| 100 XP        |
| Carta Mestra           | Projeto final |

### Meta
- **1000 XP** = Carta Mestra desbloqueada pelo professor

---

## 🔧 Personalizar senhas

Edite o array `STUDENTS_SEED` em **`database.js`** antes de rodar pela primeira vez.  
Para alterar depois que o banco já existe, delete o arquivo `db/conquista.db` e reinicie.

Para alterar a senha do professor, edite a constante `ADMIN_PASSWORD` em **`server.js`**.
