// AUTO-GENERATED FROM schemas/animus-trigger-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const TriggerEventSchema = z.object({
  "action_hint": z.string().nullable().optional(),
  "id": z.string(),
  "kind": z.string(),
  "occurred_at": z.string().datetime({ offset: true }),
  "payload": z.unknown(),
  "subject_id": z.string().nullable().optional(),
}).passthrough();
export type TriggerEvent = z.infer<typeof TriggerEventSchema>;

export const TriggerSchemaSchema = z.object({
  "kinds": z.array(z.string()),
  "supports_ack": z.boolean(),
  "supports_dedup": z.boolean(),
  "supports_resume": z.boolean(),
}).passthrough();
export type TriggerSchema = z.infer<typeof TriggerSchemaSchema>;
