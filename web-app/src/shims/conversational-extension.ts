// Minimal deploy-time shim for standalone web builds.
// The real extension exists in the full monorepo and is loaded on desktop/mobile builds.
export default class JanConversationalExtension {
  constructor(..._args: unknown[]) {}
}
