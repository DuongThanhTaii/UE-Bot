# TASK-004: Setup ESLint + Prettier

## Task Information

- **ID**: T004
- **Phase**: 1 - Foundation
- **Priority**: Medium
- **Estimated Hours**: 1h
- **Dependencies**: T003

---

## Objective

Cấu hình ESLint và Prettier cho code quality và formatting consistency.

---

## Acceptance Criteria

- [ ] ESLint configured với TypeScript rules
- [ ] Prettier configured cho formatting
- [ ] VSCode settings for auto-format
- [ ] Lint-staged for pre-commit hooks

---

## Instructions

### Step 1: Install Dependencies (Root)

```bash
pnpm add -Dw eslint @eslint/js typescript-eslint eslint-plugin-import eslint-config-prettier
```

### Step 2: Create eslint.config.mjs (ESLint Flat Config)

```javascript
// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },

  // Base ESLint rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-specific settings
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // TypeScript specific
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/strict-boolean-expressions": "off",

      // Import rules
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },

  // Test files relaxed rules
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
```

### Step 3: Create .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "printWidth": 100,
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "proseWrap": "always"
      }
    }
  ]
}
```

### Step 4: Create .prettierignore

```
node_modules
dist
build
.next
coverage
pnpm-lock.yaml
*.min.js
*.min.css
```

### Step 5: Create .vscode/settings.json

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.eol": "\n"
}
```

### Step 6: Create .vscode/extensions.json

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode-remote.remote-containers",
    "platformio.platformio-ide"
  ]
}
```

### Step 7: Setup Husky (Pre-commit Hooks)

```bash
# Initialize husky
pnpm exec husky init

# Create pre-commit hook
echo "pnpm lint-staged" > .husky/pre-commit
```

### Step 8: Update package.json Scripts

Add these to root package.json if not present:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,json,md,yml,yaml}": ["prettier --write"]
  }
}
```

---

## Verification Checklist

- [ ] `pnpm lint` runs without errors (may have warnings initially)
- [ ] `pnpm format:check` passes
- [ ] VSCode shows ESLint errors inline
- [ ] Auto-format on save works
- [ ] Pre-commit hook triggers lint-staged

---

## Git Commit

```bash
git add .
git commit -m "chore(lint): setup ESLint and Prettier [T004]"
git push
```

---

## Notes

- ESLint flat config (new format) được sử dụng
- Prettier plugin cho Tailwind sẽ được cài khi setup webapp
- Một số rules có thể cần điều chỉnh theo project
