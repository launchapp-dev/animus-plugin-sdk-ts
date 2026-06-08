// subject_backend role contract.
//
// Wire shapes (Subject, SubjectFilter, SubjectList, SubjectPatch,
// SubjectSchema, ...) are generated from the Rust schema and re-exported below.
// The author-facing interfaces here are deliberately ergonomic wrappers around
// those wire shapes: the SDK auto-fills wire-mandatory fields, unwraps the
// daemon's `{filter}` envelope, and backfills `kind` from the route so authors
// of single-kind backends can ignore most of the plumbing.

import type { CallContext, HealthReport } from './context.js';
import {
  type Subject as WireSubject,
  type SubjectFilter,
  type SubjectList,
  type SubjectStatus as WireSubjectStatus,
  SubjectSchema as WireSubjectSchemaSchema,
} from '../types/generated/subject.js';

// Re-export the generated wire types for advanced authors who want the exact
// Rust shape.
export type {
  Subject as WireSubject,
  SubjectFilter,
  SubjectList,
  SubjectId,
  SubjectAttachment,
  SubjectChangedEvent,
  ChangeKind,
  CustomFieldSpec,
  CustomFieldKind,
  StatusDispatchHint,
  DeleteSubjectRequest,
  DeleteSubjectResponse,
} from '../types/generated/subject.js';
export {
  SubjectSchema as WireSubjectSchema,
  SubjectFilterSchema,
  SubjectPatchSchema as WireSubjectPatchSchema,
} from '../types/generated/subject.js';

/**
 * Normalized subject status (mirrors Rust `SubjectStatus`, kebab-case wire
 * form). Backends translate from their native status via workflow YAML
 * `status_map`.
 */
export type SubjectStatus = WireSubjectStatus;

/**
 * A single subject record. Same shape as the generated wire `Subject`, but with
 * the wire-mandatory fields (`status`, `created_at`, `updated_at`) kept
 * required for author ergonomics — the SDK auto-fills them on the wire if an
 * author omits them in a hello-world example.
 */
export interface Subject extends WireSubject {
  id: string;
  kind: string;
  title: string;
  status: SubjectStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Params for `subject/list` — a flat `SubjectFilter` (top-level fields, not
 * nested under `filter`). All fields optional, combined with AND semantics.
 * The SDK pre-fills `kind: [ctx.kind]` when the host sends no kind filter.
 */
export type SubjectListParams = SubjectFilter;

/** Result of `subject/list`. Mirrors the generated `SubjectList`. */
export type SubjectListResult = SubjectList;

/** Context passed to every subject-backend method. `kind` is parsed from the
 *  RPC method by the SDK so authors don't have to. */
export interface SubjectCallContext extends CallContext {
  /** Subject kind extracted from the JSON-RPC method (e.g. "task"). */
  kind: string;
}

/** Wire shape of `subject/create` params (host serializes top-level keys). */
export interface SubjectCreateRequest {
  kind: string;
  title: string;
  description?: string;
  status?: SubjectStatus;
  priority?: number;
  assignee?: string;
  labels?: string[];
  parent?: string;
  url?: string;
  custom?: Record<string, unknown>;
}

/**
 * Wire shape of `subject/update` `patch` payload, mirroring Rust `SubjectPatch`.
 * `assignee` is tri-state: `undefined` = no change, `null` = clear, `string` =
 * set. Labels split into add/remove sets to avoid lost-write races.
 */
export interface SubjectPatch {
  status?: SubjectStatus;
  assignee?: string | null;
  labels_add?: string[];
  labels_remove?: string[];
  comment?: string;
  custom?: Record<string, unknown>;
}

export interface SubjectBackend {
  list(params: SubjectListParams, ctx: SubjectCallContext): Promise<SubjectListResult> | SubjectListResult;
  get(params: { id: string }, ctx: SubjectCallContext): Promise<Subject | null> | Subject | null;
  create?(params: SubjectCreateRequest, ctx: SubjectCallContext): Promise<Subject> | Subject;
  update?(params: { id: string; patch: SubjectPatch }, ctx: SubjectCallContext): Promise<Subject> | Subject;
  status?(params: { id: string; status: SubjectStatus }, ctx: SubjectCallContext): Promise<Subject> | Subject;
  next?(params: Record<string, never>, ctx: SubjectCallContext): Promise<Subject | null> | Subject | null;
  /**
   * Optional `subject/delete` (spec §7.1, v0.1.8+). Permanently removes a
   * subject. Backends that don't implement it get `-32001`
   * (`method_not_supported`) so the host falls back to soft-cancel.
   */
  delete?(params: { id: string }, ctx: SubjectCallContext): Promise<{ ok: boolean }> | { ok: boolean } | Promise<void> | void;
  /** Optional `subject/schema` payload; derived from `subject_kinds` if omitted. */
  schema?(ctx: CallContext): Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Optional health probe. */
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}

/** Internal: the generated SubjectSchema Zod schema, surfaced for the runtime. */
export const _wireSubjectSchemaSchema = WireSubjectSchemaSchema;
