# @ue-bot/shared

Shared types, utilities, and constants for UE-Bot project.

## Installation

This is an internal package and is automatically available in the monorepo.

## Usage

```typescript
// Import types
import type { Device, AudioConfig, GatewayMessage } from "@ue-bot/shared";

// Import utilities
import { logger, validate, delay, retry } from "@ue-bot/shared";

// Import constants
import { AUDIO_CONSTANTS, DEVICE_CONSTANTS } from "@ue-bot/shared";

// Or import from specific paths
import type { Device } from "@ue-bot/shared/types";
import { logger } from "@ue-bot/shared/utils";
import { AUDIO_CONSTANTS } from "@ue-bot/shared/constants";
```

## Structure

- `types/` - TypeScript type definitions with Zod schemas
  - `common.ts` - Result types, utility types, event types
  - `device.ts` - Device interfaces, statuses, commands
  - `audio.ts` - Audio configuration, transcription, synthesis
  - `gateway.ts` - Gateway communication interfaces
- `utils/` - Utility functions
  - `logger.ts` - Logging utility with configurable levels
  - `validation.ts` - Zod validation helpers and validators
  - `helpers.ts` - General helper functions (delay, retry, formatting)
- `constants/` - Shared constants
  - `audio.ts` - Audio-related constants
  - `device.ts` - Device-related constants

## Building

```bash
pnpm build              # Build the package
pnpm dev                # Watch mode
pnpm typecheck          # Type check
pnpm lint               # Lint code
pnpm test               # Run tests
```

## Key Features

- **Type Safe**: All TypeScript with strict mode enabled
- **Zod Schemas**: Runtime validation for all data types
- **Flexible Logger**: Configurable logging with different levels
- **Utility Helpers**: Common functions for retry logic, formatting, validation
- **ESM & CJS**: Dual format exports for maximum compatibility
