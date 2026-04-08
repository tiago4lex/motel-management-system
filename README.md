# 🏨 SISMOTEL - Sistema de Gerenciamento de Motel

Sistema completo para gestão de motel com controle de quartos, ocupação, consumos, estoque, múltiplas telas e relatórios.

---
## ✨ Funcionalidades

- **Gestão de Quartos**: Controle total de status (disponível, ocupado, limpeza, manutenção)
- **Tipos de Alocação**: 
  - Por Hora: Valor inicial + acréscimo por hora
  - Pernoite: Valor fixo
- **Consumos**: Adição de produtos com busca por código ou nome
- **Controle de Estoque**: Gerenciamento completo de produtos
- **Múltiplas Telas**:
  - Recepção: Dashboard principal
  - Entrada: Com anúncio por voz (TTS)
  - Saída: Com anúncio por voz (TTS)
- **Relatórios**: Dashboard com gráficos e exportação para Excel
- **Administração**: CRUD completo para quartos, produtos e usuários
- **Controle de Acesso**: Autenticação JWT com perfis (Admin/Operador)

---
## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- Prisma ORM
- MySQL
- JWT para autenticação
- Socket.io para tempo real
- ExcelJS para exportação

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts para gráficos
- Socket.io-client
- Axios
- Heroicons

---
## 📋 Pré-requisitos

- Node.js 18+
- MySQL 8.0+
- npm ou yarn

---
## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/sismotel.git
cd sismotel
```

### 2. Configure o backend

```bash
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Edite o arquivo .env com suas configurações
# DATABASE_URL="mysql://usuario:senha@localhost:3306/motel_db"

# Execute as migrações do Prisma
npx prisma migrate dev --name init

# Gere o cliente Prisma
npx prisma generate

# Popule o banco com dados iniciais
npm run seed

# Inicie o servidor
npm run dev
```

### 3. Configure o frontend

```bash
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o frontend
npm run dev
```

### 4. Acesse o sistema

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

#### Credenciais padrão

- Admin: admin / admin123
- Operador: operador / operator123

---
## 🐳 Deploy com Docker

### Usando Docker Compose

```bash
# Na raiz do projeto
docker-compose -f docker/docker-compose.yml up -d

# Acesse o sistema em http://localhost
```

### Build manual

```bash
# Backend
cd backend
docker build -t sismotel-backend -f ../docker/Dockerfile.backend .

# Frontend
cd frontend
docker build -t sismotel-frontend -f ../docker/Dockerfile.frontend .

# Executar containers
docker run -d -p 3000:3000 --name sismotel-backend sismotel-backend
docker run -d -p 80:80 --name sismotel-frontend sismotel-frontend
```

---
## 📁 Estrutura do Projeto

```text
sismotel/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Controladores da aplicação
│   │   ├── services/       # Regras de negócio
│   │   ├── repositories/   # Acesso a dados
│   │   ├── middleware/     # Middlewares (auth, erro)
│   │   ├── routes/         # Rotas da API
│   │   ├── config/         # Configurações
│   │   └── app.js          # Configuração do Express
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo do banco de dados
│   │   └── seed.js         # Dados iniciais
│   └── server.js           # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── contexts/       # Contextos (Auth, Socket)
│   │   ├── hooks/          # Hooks customizados
│   │   └── App.jsx         # Componente principal
│   └── index.html
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
└── README.md
```

---
## 🔧 Configuração Adicional

### Variáveis de Ambiente

#### Backend (.env)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://user:password@localhost:3306/motel_db"
JWT_SECRET="seu-jwt-secret"
JWT_REFRESH_SECRET="seu-refresh-secret"
CORS_ORIGIN="http://localhost:5173"
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

---
## 📊 Funcionalidades Detalhadas

### Gestão de Quartos

- Visualização em grid estilo Bitz
- Status coloridos (verde=disponível, vermelho=ocupado, amarelo=limpeza)
- Check-in rápido
- Alteração de status manual
- Controle de tempo real

### Sistema de Consumos

- Busca por código (3 dígitos) ou nome
- Adição rápida de produtos
- Remoção de consumos
- Atualização automática do valor

### Relatórios

- Dashboard com métricas principais
- Gráficos de faturamento
- Ranking de produtos
- Taxa de ocupação
- Exportação para Excel

### Administração

- CRUD de quartos
- CRUD de tipos de quarto
- CRUD de produtos
- CRUD de usuários
- Controle de estoque