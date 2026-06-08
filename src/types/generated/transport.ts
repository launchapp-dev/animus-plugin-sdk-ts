// AUTO-GENERATED FROM schemas/animus-transport-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const TransportConfigSchema = z.object({
  "bind_addr": z.string().nullable().optional(),
  "config": z.unknown().optional(),
  "control_socket_path": z.string(),
  "project_root": z.string(),
}).passthrough();
export type TransportConfig = z.infer<typeof TransportConfigSchema>;

export const TransportInfoSchema = z.object({
  "bound_addr": z.string(),
  "started_at": z.string().datetime({ offset: true }),
}).passthrough();
export type TransportInfo = z.infer<typeof TransportInfoSchema>;

export const TransportSchemaSchema = z.object({
  "default_port": z.number().int().min(0).max(65535).nullable().optional(),
  "kinds": z.array(z.string()),
  "supports_streaming": z.boolean(),
  "supports_websocket": z.boolean(),
}).passthrough();
export type TransportSchema = z.infer<typeof TransportSchemaSchema>;
