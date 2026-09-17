/**
 * Loads the seed bundle built from the client's own code (seed/entry.ts).
 * The path is built at runtime so tsc does not try to resolve the bundle.
 */

export interface SeedModule {
  seedRoom(input: {
    id: string
    title: string
    creator: { id: string; displayName: string; hue: number }
    demo?: boolean
  }): Uint8Array
  describeRoom(state: Uint8Array): {
    title: string
    shape: string
    nodeCount: number
    people: { name: string; hue: number }[]
  }
}

export async function loadSeed(): Promise<SeedModule> {
  const url = new URL('../seed.bundle.mjs', import.meta.url).href
  return (await import(url)) as SeedModule
}
