# 🎮 Cartas de Conquista

Sistema web gamificado de XP e cartas para sala de aula, inspirado no banner *Cartas de Conquista*.

---

## 🚀 Como rodar o projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (para produção/deploy)

### Instalação Local

```bash
# 1. Entre na pasta do projeto
cd cartas-de-conquista

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start
```

O servidor inicia em **http://localhost:3000**

### Deploy no Render

1. **Crie uma conta** em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Crie um cluster** e obtenha a string de conexão
3. **No Render, adicione a variável de ambiente:**
   - Vá em: Render > Seu App > Environment
   - **Nome:** `MONGO_URI`
   - **Valor:** Cole a string de conexão do MongoDB Atlas
4. **Faça deploy** do código
5. **Acesse:** `https://seu-app.onrender.com`

**Exemplo de MONGO_URI:**
```
mongodb+srv://usuario:senha@cluster.mongodb.net/cartas?retryWrites=true&w=majority
```

---

## 🗂️ Estrutura do projeto

```
cartas-de-conquista/
├── server.js               # Servidor Express + todas as rotas da API
├── database.js             # Inicialização do MongoDB + helpers
├── package.json            # Dependências npm
├── public/assets/cards/
│   └── cards.json          # Catálogo de cartas (JSON com tipos e nomes)
├── db/
│   └── conquista.db        # Banco SQLite (criado automaticamente)
└── public/
    ├── index.html          # Página de login do aluno
    ├── student.html        # Dashboard do aluno
    ├── admin.html          # Painel do professor
    ├── assets/cards/
    │   ├── cards.json      # Catálogo de cartas com imagens
    │   ├── logica/         # Imagens de cartas de Lógica
    │   ├── crescimento/    # Imagens de cartas de Crescimento
    │   ├── suporte/        # Imagens de cartas de Suporte
    │   ├── velocidade/     # Imagens de cartas de Velocidade
    │   └── mestra/         # Imagens de cartas Mestra
    ├── css/
    │   └── style.css       # Tema futurista neon com estilos do modal
    └── js/
        ├── utils.js        # Funções compartilhadas
        ├── student.js      # Lógica do dashboard do aluno (picker)
        └── admin.js        # Lógica do painel admin
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

## 🃏 Sistema de Cartas Digitais (EAD)

Para alunos a distância, o sistema oferece seleção de cartas digitais de **Magic the Gathering** filtradas por tipo (cor).

### Como adicionar cartas

1. **Edite o arquivo** `public/assets/cards/cards.json`
2. **Adicione cartas** seguindo a estrutura:

```json
{
  "logica": [
    {
      "id": "001",
      "name": "Card Name",
      "image": "/assets/cards/logica/001.jpg"
    },
    {
      "id": "002",
      "name": "Another Card",
      "image": "/assets/cards/logica/002.jpg"
    }
  ],
  "crescimento": [...],
  "suporte": [...],
  "velocidade": [...],
  "mestra": [...]
}
```

3. **Coloque as imagens** nas pastas correspondentes:
   - `public/assets/cards/logica/` para cartas azuis
   - `public/assets/cards/crescimento/` para cartas verdes
   - `public/assets/cards/suporte/` para cartas amarelas
   - `public/assets/cards/velocidade/` para cartas vermelhas
   - `public/assets/cards/mestra/` para cartas especiais

4. **Reinicie o servidor** para carregar o novo catálogo

### Interface do aluno

- Clique em **"ESCOLHER"** na lojinha
- Modal abre com **5 abas** (uma por cor/tipo)
- Clique na aba desejada para ver as cartas do tipo
- Clique na carta específica para comprar (deduz 100 XP)
- Carta é adicionada a "Minhas Cartas"


## 🔧 Personalizar senhas

Edite o array `STUDENTS_SEED` em **`database.js`** antes de rodar pela primeira vez.  
Para alterar depois que o banco já existe, delete o arquivo `db/conquista.db` e reinicie.

Para alterar a senha do professor, edite a constante `ADMIN_PASSWORD` em **`server.js`**.
