// Deploy-only fallback extension used when monorepo extension bundles are unavailable.
export default class BuiltinExtensionShim {
  constructor(..._args: unknown[]) {}

  name = 'builtin-extension-shim'

  onLoad(): void {}

  onUnload(): void {}

  // Keep compatibility with extension manager checks at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type(): any {
    return 'shim'
  }
}
