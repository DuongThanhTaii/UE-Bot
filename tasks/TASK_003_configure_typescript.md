# TASK-003: Configure TypeScript

## Task Information

- **ID**: T003
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 2h
- **Dependencies**: T002

---

## Objective

Thiết lập TypeScript configuration cho toàn bộ monorepo với strict mode.

---

## Acceptance Criteria

- [ ] Root tsconfig.json với base settings
- [ ] Package-specific tsconfig files
- [ ] Path aliases configured
- [ ] Strict mode enabled

---

## Instructions

### Step 1: Create Root tsconfig.json

```json
{
  "compilerOptions": {
    // Language & Environment
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // Strict Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",

    // Skip
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Step 2: Create packages/shared/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Step 3: Create packages/bridge-service/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ue-bot/shared": ["../shared/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [{ "path": "../shared" }]
}
```

### Step 4: Create packages/webapp/tsconfig.json

(Next.js specific)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ue-bot/shared": ["../shared/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 5: Create Type Declaration Files

#### packages/shared/src/types/index.ts

```typescript
// Re-export all types
export * from "./common";
export * from "./device";
export * from "./audio";
export * from "./gateway";
```

#### packages/shared/src/types/common.ts

```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

#### packages/shared/src/types/device.ts

```typescript
export type DeviceStatus = "online" | "offline" | "error" | "connecting";

export interface Device {
  id: string;
  name: string;
  macAddress: string;
  status: DeviceStatus;
  lastSeen: Date;
  firmwareVersion: string;
  config: DeviceConfig;
}

export interface DeviceConfig {
  wakeWord: string;
  language: string;
  volume: number;
  sensitivity: number;
}

export interface DeviceCommand {
  deviceId: string;
  command: "start" | "stop" | "status" | "config" | "restart";
  payload?: Record<string, unknown>;
}
```

#### packages/shared/src/types/audio.ts

```typescript
export interface AudioConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  encoding: "pcm" | "opus" | "mp3";
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
  config: AudioConfig;
}

export interface TranscribeResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface SpeechResult {
  audio: Buffer;
  duration: number;
  format: string;
}
```

#### packages/shared/src/types/gateway.ts

```typescript
export interface GatewayConfig {
  host: string;
  port: number;
  token?: string;
  secure: boolean;
}

export interface GatewayMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  sessionId?: string;
}

export interface SessionInfo {
  id: string;
  channel: string;
  model: string;
  tokensUsed: number;
  createdAt: Date;
}
```

---

## Verification Checklist

- [ ] `pnpm typecheck` runs without errors
- [ ] All tsconfig files are valid JSON
- [ ] Path aliases resolve correctly
- [ ] Strict mode catches type errors

---

## Git Commit

```bash
git add .
git commit -m "chore(ts): configure TypeScript with strict mode [T003]"
git push
```

---

## Notes

- Strict mode sẽ bắt nhiều lỗi tiềm ẩn
- Path aliases giúp imports clean hơn
- Composite projects cho better build performance
