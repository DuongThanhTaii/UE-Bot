# External Dependencies

This directory contains external repositories as git submodules.

## Moltbot

[Moltbot](https://github.com/moltbot/moltbot) is the core AI engine used by UE-Bot.

### Initialization

```bash
# First time setup
git submodule update --init --recursive

# Update to latest
./scripts/update-moltbot.sh  # Linux/macOS
./scripts/update-moltbot.ps1 # Windows
```

### Configuration

1. Copy `.env.example` to `.env` in `external/moltbot/`
2. Fill in required API keys
3. Start Moltbot: `cd external/moltbot && npm install && npm start`

### Integration

UE-Bot integrates with Moltbot via HTTP API:

- Bridge Service → Moltbot API
- See `packages/bridge-service/src/clients/moltbot-client.ts`

### Customization

⚠️ **Do not modify files in external/moltbot directly**

If you need to customize Moltbot:

1. Fork the repository
2. Update `.gitmodules` to point to your fork
3. Make changes in your fork
4. Submit PRs upstream if applicable

## Note on Submodules

If Moltbot repository is not available:
- The project will still work without the submodule
- Bridge service will use mock responses in development
- You can substitute with any compatible AI backend
