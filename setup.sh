#!/bin/bash

echo "🚀 Router Management System - Setup Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}🐘 Step 2: Starting PostgreSQL and Redis...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ Database containers started${NC}"
echo ""

echo -e "${BLUE}📄 Step 3: Setting up environment files...${NC}"
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ Created backend/.env${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env already exists, skipping${NC}"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✅ Created frontend/.env${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env already exists, skipping${NC}"
fi
echo ""

echo -e "${BLUE}🗄️  Step 4: Setting up database...${NC}"
echo "Waiting for PostgreSQL to be ready..."
sleep 5
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..
echo -e "${GREEN}✅ Database schema created${NC}"
echo ""

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "To start development servers, run:"
echo -e "${BLUE}  npm run dev${NC}"
echo ""
echo "Or start individually:"
echo -e "${BLUE}  Backend:  cd backend && npm run start:dev${NC}"
echo -e "${BLUE}  Frontend: cd frontend && npm run dev${NC}"
echo ""
echo "Backend will run on: http://localhost:4000"
echo "Frontend will run on: http://localhost:3000"
