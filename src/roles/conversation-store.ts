// conversation_store role contract (v0.7).
//
// A conversation_store plugin persists per-user chat history with owner +
// visibility scoping (Animus 0.7). Reference impl: `animus-chat-postgres`.
// `conversation_store` is a first-class `PluginKind` in `animus-plugin-protocol`
// (v0.6.4+); the kernel resolves the OPTIONAL conversation_store role by kind.
//
// Method names + wire shapes track `animus-plugin-protocol` (v0.7.0-rc.2).

import type { CallContext, HealthReport } from './context.js';
import type {
  ConversationCreateRequest,
  ConversationCreateResponse,
  ConversationLoadMetaRequest,
  ConversationLoadMetaResponse,
  ConversationSaveMetaRequest,
  ConversationSaveMetaResponse,
  ConversationAppendMessageRequest,
  ConversationAppendMessageResponse,
  ConversationLoadMessagesRequest,
  ConversationLoadMessagesResponse,
  ConversationListRequest,
  ConversationListResponse,
  ConversationDeleteRequest,
  ConversationDeleteResponse,
} from '../types/generated/plugin.js';

export type {
  ChatMessage,
  ConversationMeta,
  ConversationScope,
  ConversationSummary,
  ConversationCreateRequest,
  ConversationCreateResponse,
  ConversationLoadMetaRequest,
  ConversationLoadMetaResponse,
  ConversationSaveMetaRequest,
  ConversationSaveMetaResponse,
  ConversationAppendMessageRequest,
  ConversationAppendMessageResponse,
  ConversationLoadMessagesRequest,
  ConversationLoadMessagesResponse,
  ConversationListRequest,
  ConversationListResponse,
  ConversationDeleteRequest,
  ConversationDeleteResponse,
  Visibility,
} from '../types/generated/plugin.js';
export {
  ChatMessageSchema,
  ConversationMetaSchema,
  ConversationCreateRequestSchema,
  ConversationLoadMetaRequestSchema,
  ConversationSaveMetaRequestSchema,
  ConversationAppendMessageRequestSchema,
  ConversationLoadMessagesRequestSchema,
  ConversationListRequestSchema,
  ConversationDeleteRequestSchema,
  VisibilitySchema,
} from '../types/generated/plugin.js';

/** JSON-RPC method names for the conversation_store role (Rust
 *  `METHOD_CONVERSATION_*`). */
export const CONVERSATION_STORE_METHODS = {
  create: 'conversation/create',
  load_meta: 'conversation/load_meta',
  save_meta: 'conversation/save_meta',
  append_message: 'conversation/append_message',
  load_messages: 'conversation/load_messages',
  list: 'conversation/list',
  delete: 'conversation/delete',
} as const;

export interface ConversationStore {
  create(
    params: ConversationCreateRequest,
    ctx: CallContext,
  ): Promise<ConversationCreateResponse> | ConversationCreateResponse;
  load_meta(
    params: ConversationLoadMetaRequest,
    ctx: CallContext,
  ): Promise<ConversationLoadMetaResponse> | ConversationLoadMetaResponse;
  save_meta(
    params: ConversationSaveMetaRequest,
    ctx: CallContext,
  ): Promise<ConversationSaveMetaResponse> | ConversationSaveMetaResponse;
  append_message(
    params: ConversationAppendMessageRequest,
    ctx: CallContext,
  ): Promise<ConversationAppendMessageResponse> | ConversationAppendMessageResponse;
  load_messages(
    params: ConversationLoadMessagesRequest,
    ctx: CallContext,
  ): Promise<ConversationLoadMessagesResponse> | ConversationLoadMessagesResponse;
  list(params: ConversationListRequest, ctx: CallContext): Promise<ConversationListResponse> | ConversationListResponse;
  delete(
    params: ConversationDeleteRequest,
    ctx: CallContext,
  ): Promise<ConversationDeleteResponse> | ConversationDeleteResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
