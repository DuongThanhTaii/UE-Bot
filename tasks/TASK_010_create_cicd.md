# TASK-010: Create CI/CD Pipeline

## Task Information

- **ID**: T010
- **Phase**: 1 - Foundation
- **Priority**: Medium
- **Estimated Hours**: 2h
- **Dependencies**: T009

---

## Objective

Thiết lập GitHub Actions CI/CD pipeline cho automated testing, building, và deployment.

---

## Acceptance Criteria

- [ ] CI workflow for pull requests
- [ ] CD workflow for main branch
- [ ] ESP32 firmware build workflow
- [ ] Docker build and push workflow
- [ ] Branch protection rules documented

---

## Instructions

### Step 1: Create Directory Structure

```
.github/
├── workflows/
│   ├── ci.yml
│   ├── cd.yml
│   ├── esp32-build.yml
│   └── docker-publish.yml
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── dependabot.yml
```

### Step 2: Create CI Workflow

**File: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "22"
  PNPM_VERSION: "9"

jobs:
  # ===================
  # Lint & Type Check
  # ===================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run Type Check
        run: pnpm typecheck

  # ===================
  # Build
  # ===================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared package
        run: pnpm --filter @ue-bot/shared build

      - name: Build webapp
        run: pnpm --filter @ue-bot/webapp build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8080
          NEXT_PUBLIC_WS_URL: ws://localhost:8080

      - name: Build bridge-service
        run: pnpm --filter @ue-bot/bridge-service build

      - name: Upload webapp build
        uses: actions/upload-artifact@v4
        with:
          name: webapp-build
          path: packages/webapp/.next
          retention-days: 7

      - name: Upload bridge build
        uses: actions/upload-artifact@v4
        with:
          name: bridge-build
          path: packages/bridge-service/dist
          retention-days: 7

  # ===================
  # Test
  # ===================
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test
        env:
          CI: true

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  # ===================
  # Security Scan
  # ===================
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run security audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          severity: "CRITICAL,HIGH"
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "trivy-results.sarif"
```

### Step 3: Create CD Workflow

**File: `.github/workflows/cd.yml`**

```yaml
name: CD

on:
  push:
    branches: [main]
    tags:
      - "v*"

env:
  NODE_VERSION: "22"
  PNPM_VERSION: "9"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ===================
  # Build & Push Docker Images
  # ===================
  docker:
    name: Build Docker Images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service: [webapp, bridge-service]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/${{ matrix.service }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ===================
  # Create Release
  # ===================
  release:
    name: Create Release
    runs-on: ubuntu-latest
    needs: docker
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        uses: orhun/git-cliff-action@v3
        with:
          config: cliff.toml
          args: --latest --strip header

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.content }}
          draft: false
          prerelease: ${{ contains(github.ref, '-') }}
```

### Step 4: Create ESP32 Build Workflow

**File: `.github/workflows/esp32-build.yml`**

```yaml
name: ESP32 Firmware Build

on:
  push:
    branches: [main, develop]
    paths:
      - "packages/esp32-firmware/**"
  pull_request:
    paths:
      - "packages/esp32-firmware/**"

jobs:
  build:
    name: Build ESP32 Firmware
    runs-on: ubuntu-latest
    strategy:
      matrix:
        board: [esp32dev, esp32-s3]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Cache PlatformIO
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/pip
            ~/.platformio/.cache
          key: ${{ runner.os }}-pio-${{ hashFiles('packages/esp32-firmware/platformio.ini') }}

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install PlatformIO
        run: |
          python -m pip install --upgrade pip
          pip install platformio

      - name: Build firmware
        run: |
          cd packages/esp32-firmware
          pio run -e ${{ matrix.board }}

      - name: Upload firmware artifact
        uses: actions/upload-artifact@v4
        with:
          name: firmware-${{ matrix.board }}
          path: |
            packages/esp32-firmware/.pio/build/${{ matrix.board }}/*.bin
          retention-days: 30

  release:
    name: Release Firmware
    runs-on: ubuntu-latest
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: firmware

      - name: Create firmware release
        uses: softprops/action-gh-release@v1
        with:
          files: firmware/**/*.bin
          tag_name: ${{ github.ref_name }}
```

### Step 5: Create Docker Publish Workflow

**File: `.github/workflows/docker-publish.yml`**

```yaml
name: Docker Publish

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Version tag for the images"
        required: true
        default: "latest"

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  publish:
    name: Publish Docker Images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push webapp
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/webapp/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/webapp:${{ inputs.version }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/webapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push bridge-service
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/bridge-service/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/bridge-service:${{ inputs.version }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/bridge-service:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Step 6: Create PR Template

**File: `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Description

<!-- Describe your changes in detail -->

## Related Issue

<!-- Link to the issue this PR addresses -->

Closes #

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to change)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration change
- [ ] 🧪 Test update

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Additional Notes

<!-- Add any additional notes or context -->
```

### Step 7: Create Issue Templates

**File: `.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug Report
about: Create a report to help us improve
title: "[BUG] "
labels: bug
assignees: ""
---

## Bug Description

<!-- A clear and concise description of what the bug is -->

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

<!-- A clear and concise description of what you expected to happen -->

## Actual Behavior

<!-- A clear and concise description of what actually happened -->

## Screenshots

<!-- If applicable, add screenshots to help explain your problem -->

## Environment

- OS: [e.g. Windows 11, macOS 14, Ubuntu 22.04]
- Browser: [e.g. Chrome 120, Firefox 121]
- Node.js version: [e.g. 22.0.0]
- Package version: [e.g. 1.0.0]

## Additional Context

<!-- Add any other context about the problem here -->
```

**File: `.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
---
name: Feature Request
about: Suggest an idea for this project
title: "[FEATURE] "
labels: enhancement
assignees: ""
---

## Feature Description

<!-- A clear and concise description of what you want to happen -->

## Problem Statement

<!-- Is your feature request related to a problem? Please describe -->

## Proposed Solution

<!-- Describe the solution you'd like -->

## Alternatives Considered

<!-- Describe any alternative solutions or features you've considered -->

## Additional Context

<!-- Add any other context or screenshots about the feature request -->
```

### Step 8: Create Dependabot Config

**File: `.github/dependabot.yml`**

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      dev-dependencies:
        dependency-type: "development"
        patterns:
          - "@types/*"
          - "eslint*"
          - "prettier*"
          - "typescript*"
      production-dependencies:
        dependency-type: "production"
    labels:
      - "dependencies"
      - "automerge"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "dependencies"
      - "github-actions"

  # Docker
  - package-ecosystem: "docker"
    directory: "/packages/webapp"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"

  - package-ecosystem: "docker"
    directory: "/packages/bridge-service"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"
```

---

## Verification Checklist

- [ ] All workflow files have valid YAML syntax
- [ ] CI workflow triggers on PR
- [ ] CD workflow triggers on main push
- [ ] ESP32 workflow only triggers on firmware changes
- [ ] PR template created
- [ ] Issue templates created
- [ ] Dependabot configured

---

## Git Commit

```bash
git add .
git commit -m "feat(ci): add GitHub Actions CI/CD workflows [T010]"
git push
```

---

## Required GitHub Secrets

Sau khi push, cần thêm secrets vào repo settings:

| Secret             | Description              |
| ------------------ | ------------------------ |
| OPENAI_API_KEY     | OpenAI API key           |
| ELEVENLABS_API_KEY | ElevenLabs API key       |
| CODECOV_TOKEN      | (Optional) Codecov token |

---

## Branch Protection Rules

Configure trong GitHub repo settings:

1. **main branch**:
   - Require pull request reviews (1 approval)
   - Require status checks to pass: `lint`, `build`, `test`
   - Require branches to be up to date
   - Include administrators

2. **develop branch**:
   - Require status checks to pass: `lint`
   - Allow force pushes for maintainers
