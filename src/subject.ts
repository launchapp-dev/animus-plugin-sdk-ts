// Subpath entrypoint: `@launchapp-dev/animus-plugin-sdk/subject`.
// subject_backend role contract + generated Zod types + helpers.
//
// NOTE on naming: the Rust protocol has a type literally named `SubjectSchema`
// (the capability declaration). To avoid colliding with the conventional Zod
// name for the `Subject` type, the `Subject` Zod schema is exported as
// `WireSubjectSchema`. The full generated module is also re-exported under the
// `gen` namespace so every schema/type is reachable without ambiguity.
export * from './roles/subject.js';
export { ensureWireSubject } from './dispatch/subject.js';
export * as gen from './types/generated/subject.js';
