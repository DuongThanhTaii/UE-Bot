import { z } from "zod";

// ============ Result Types ============
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// ============ Utility Types ============
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// ============ Event Types ============
export interface BaseEvent {
  type: string;
  timestamp: number;
  source: string;
}

// ============ Zod Schemas ============
export const TimestampedSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseEventSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  source: z.string(),
});
