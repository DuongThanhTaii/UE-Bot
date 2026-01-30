# Update Moltbot submodule to latest version

Write-Host "📦 Updating Moltbot submodule..." -ForegroundColor Cyan

# Navigate to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Check if submodule exists
if (!(Test-Path "external/moltbot/.git")) {
    Write-Host "⚠️ Moltbot submodule not initialized" -ForegroundColor Yellow
    Write-Host "Run: git submodule update --init --recursive"
    exit 1
}

# Update submodule
git submodule update --remote external/moltbot

# Check for changes
$status = git status --porcelain external/moltbot
if ($status) {
    Write-Host "✅ Moltbot updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New commit:"
    Set-Location external/moltbot
    git log -1 --oneline
    Set-Location $projectRoot
    Write-Host ""
    Write-Host "Run 'git add external/moltbot && git commit' to save the update"
} else {
    Write-Host "ℹ️ Moltbot is already up to date" -ForegroundColor Yellow
}
