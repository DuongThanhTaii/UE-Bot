#!/bin/bash

# Update Moltbot submodule to latest version

set -e

echo "📦 Updating Moltbot submodule..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if submodule exists
if [ ! -d "external/moltbot/.git" ]; then
    echo "⚠️ Moltbot submodule not initialized"
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

# Update submodule
git submodule update --remote external/moltbot

# Check for changes
if [ -n "$(git status --porcelain external/moltbot)" ]; then
    echo "✅ Moltbot updated!"
    echo ""
    echo "New commit:"
    cd external/moltbot && git log -1 --oneline
    cd ../..
    echo ""
    echo "Run 'git add external/moltbot && git commit' to save the update"
else
    echo "ℹ️ Moltbot is already up to date"
fi
