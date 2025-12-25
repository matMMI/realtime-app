#!/bin/bash

# Deployment script for Devis Generator
# Usage: ./deploy.sh "commit message"

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment process...${NC}"

# Check if commit message is provided
# Check if commit message is provided
if [ -z "$1" ]; then
    echo ""
    read -p "💬 Message de commit: " input_msg
    if [[ -n "$input_msg" ]]; then
        COMMIT_MSG="$input_msg"
    else
        COMMIT_MSG="Update Frontend - $(date +%Y-%m-%d\ %H:%M:%S)"
    fi
else
    COMMIT_MSG="$1"
fi

# Note: Backend tests are run in the separate backend repository
# This script only handles frontend deployment

echo -e "${BLUE}🧪 Running frontend tests...${NC}"
pnpm test --passWithNoTests
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend tests failed! Aborting deployment.${NC}"
    exit 1
fi

echo -e "${BLUE}🏗️  Building frontend...${NC}"
pnpm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed! Aborting deployment.${NC}"
    exit 1
fi

# Git operations
echo -e "${BLUE}📦 Adding changes to git...${NC}"
git add .

echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

echo -e "${BLUE}⬆️  Pushing to GitHub (main branch)...${NC}"
git push origin main

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Vercel will automatically deploy from main branch.${NC}"
echo -e "${BLUE}Check deployment status at: https://vercel.com${NC}"
