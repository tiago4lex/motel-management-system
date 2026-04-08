# 1. Clone o projeto
cd motel-management-system

# 2. Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite o .env com suas configurações

# 3. Instale as dependências
cd backend && npm install
cd ../frontend && npm install

# 4. Configure o banco de dados
cd ../backend
npx prisma migrate dev --name init
npx prisma generate
npm run seed

# 5. Execute em desenvolvimento
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# 6. Acesse o sistema
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Credenciais: admin / admin123

# 7. Para produção com Docker
cd ..
chmod +x scripts/deploy.sh
./scripts/deploy.sh