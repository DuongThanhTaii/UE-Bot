#!/bin/bash
# UE-Bot Gateway Startup Script
# Run Moltbot/OpenClaw Gateway with Groq configuration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOLTBOT_DIR="$SCRIPT_DIR/external/moltbot"
GATEWAY_PORT=18789

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 UE-Bot Gateway Startup${NC}"
echo "================================"

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  GROQ_API_KEY not set in environment${NC}"
    echo "   Reading from ~/.openclaw/openclaw.json..."
fi

# Check if Moltbot directory exists
if [ ! -d "$MOLTBOT_DIR" ]; then
    echo -e "${RED}❌ Moltbot directory not found: $MOLTBOT_DIR${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "$MOLTBOT_DIR/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    cd "$MOLTBOT_DIR"
    pnpm install
fi

# Check if build exists
if [ ! -f "$MOLTBOT_DIR/dist/entry.js" ]; then
    echo -e "${YELLOW}🔨 Building Moltbot...${NC}"
    cd "$MOLTBOT_DIR"
    pnpm build
fi

# Start Gateway
echo -e "${GREEN}🌐 Starting Gateway on port $GATEWAY_PORT...${NC}"
cd "$MOLTBOT_DIR"

# Run gateway
exec node dist/entry.js gateway "$@"
