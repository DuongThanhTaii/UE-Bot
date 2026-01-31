# TASK-040: Setup CLI Package

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: High
- **Estimated**: 2 hours
- **Dependencies**: Phase 3 completed (agent-core)

## 🎯 Mục tiêu

Khởi tạo CLI package trong monorepo với các dependencies và cấu trúc cần thiết.

## 📝 Yêu cầu

### 1. Package Structure

```
packages/cli/
├── src/
│   ├── index.ts           # Entry point
│   ├── cli.ts             # CLI setup (Commander/Yargs)
│   ├── commands/
│   │   ├── index.ts       # Export all commands
│   │   ├── chat.ts        # Interactive chat
│   │   ├── run.ts         # Single command execution
│   │   └── config.ts      # Configuration commands
│   ├── utils/
│   │   ├── output.ts      # Output formatting
│   │   ├── prompt.ts      # User prompts
│   │   └── spinner.ts     # Loading indicators
│   └── types.ts           # CLI types
├── package.json
├── tsconfig.json
└── README.md
```

### 2. package.json

```json
{
  "name": "@ue-bot/cli",
  "version": "0.1.0",
  "description": "CLI interface for UE-Bot AI Agent",
  "bin": {
    "ue-bot": "./dist/index.js",
    "ub": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format cjs --dts --clean",
    "start": "node dist/index.js",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ue-bot/agent-core": "workspace:*",
    "@ue-bot/shared": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "inquirer": "^9.2.0",
    "conf": "^12.0.0",
    "marked": "^12.0.0",
    "marked-terminal": "^7.0.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.7",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0"
  }
}
```

### 3. CLI Entry Point

```typescript
// src/index.ts
#!/usr/bin/env node
import { cli } from './cli';

cli.parse(process.argv);
```

### 4. CLI Setup

```typescript
// src/cli.ts
import { Command } from 'commander';
import { version } from '../package.json';
import { chatCommand } from './commands/chat';
import { runCommand } from './commands/run';
import { configCommand } from './commands/config';

export const cli = new Command();

cli.name('ue-bot').description('UE-Bot AI Agent CLI').version(version);

// Register commands
cli.addCommand(chatCommand);
cli.addCommand(runCommand);
cli.addCommand(configCommand);

// Default to interactive mode
cli.action(() => {
  // If no command specified, start interactive mode
  chatCommand.parse(['chat']);
});
```

### 5. tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## ✅ Acceptance Criteria

- [ ] Package khởi tạo thành công trong monorepo
- [ ] `pnpm install` không có lỗi
- [ ] `pnpm build` tạo được dist/
- [ ] Binary `ue-bot` và `ub` có thể chạy
- [ ] `ue-bot --version` hiển thị version
- [ ] `ue-bot --help` hiển thị help

## 🧪 Test Cases

```bash
# Test version
ue-bot --version
# Expected: 0.1.0

# Test help
ue-bot --help
# Expected: Shows available commands

# Test alias
ub --help
# Expected: Same as ue-bot --help
```

## 📚 Resources

- [Commander.js](https://github.com/tj/commander.js)
- [Chalk](https://github.com/chalk/chalk)
- [Ora](https://github.com/sindresorhus/ora)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
