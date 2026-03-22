#!/bin/bash

# Smart Emergency Response System - Complete Setup Script
# This script sets up the entire production environment

echo "🚀 Smart Emergency Response System - Production Setup"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check MongoDB
echo -e "${BLUE}Step 1: Checking MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB is not running!${NC}"
    echo "Please start MongoDB first:"
    echo "  brew services start mongodb-community"
    echo "  or"
    echo "  mongod --dbpath /path/to/data"
    exit 1
fi
echo -e "${GREEN}✅ MongoDB is running${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build TypeScript
echo -e "${BLUE}Step 3: Building backend...${NC}"
npm run build
echo -e "${GREEN}✅ Backend built${NC}"
echo ""

# Step 4: Seed resources
echo -e "${BLUE}Step 4: Seeding emergency resources...${NC}"
npm run seed:resources
echo ""

# Step 5: Setup responders
echo -e "${BLUE}Step 5: Setting up responder accounts...${NC}"
npm run setup:responders
echo ""

# Step 6: Summary
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo ""
echo "========================================================"
echo -e "${BLUE}📱 Next Steps:${NC}"
echo ""
echo "1. Start Backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start User App:"
echo "   cd frontend && npm start"
echo ""
echo "3. Start Responder App (Optional):"
echo "   cd responder-app && npm start"
echo ""
echo "4. Create a NEW incident in the User App"
echo "   (Old incidents won't have auto-assignment)"
echo ""
echo "========================================================"
echo -e "${BLUE}🔑 Responder Login Credentials:${NC}"
echo ""
echo "Ambulance Paramedic:"
echo "  Email: sarah.ambulance@emergency.com"
echo "  Password: responder123"
echo ""
echo "Fire Fighter:"
echo "  Email: james.fire@emergency.com"
echo "  Password: responder123"
echo ""
echo "Police Officer:"
echo "  Email: emily.police@emergency.com"
echo "  Password: responder123"
echo ""
echo "========================================================"
echo -e "${GREEN}🎉 Ready for Demo!${NC}"
echo ""
