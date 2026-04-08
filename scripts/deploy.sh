#!/bin/bash

echo "🚀 Iniciando deploy do Motel Manager..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers antigos..."
docker-compose -f docker/docker-compose.yml down

# Build das imagens
echo "🏗️  Buildando imagens..."
docker-compose -f docker/docker-compose.yml build

# Rodar migrações
echo "📦 Rodando migrações do banco..."
docker-compose -f docker/docker-compose.yml run --rm backend npx prisma migrate deploy

# Rodar seed
echo "🌱 Populando banco de dados..."
docker-compose -f docker/docker-compose.yml run --rm backend npm run seed

# Iniciar serviços
echo "✅ Iniciando serviços..."
docker-compose -f docker/docker-compose.yml up -d

# Verificar status
echo "📊 Verificando status..."
docker-compose -f docker/docker-compose.yml ps

echo "🎉 Deploy concluído! Sistema disponível em http://localhost"