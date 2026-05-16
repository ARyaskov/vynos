interface NodeModule {
  exports: unknown
  require?: unknown
  id: string
  filename: string
  loaded: boolean
  parent: NodeModule | null
  children: NodeModule[]
  hot?: {
    accept: (path: string, callback?: () => void) => void
  }
}

interface WindowClient {
  url: string
  id: string
  frameType?: string
  type: ClientType
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

type ClientType = "window" | "worker" | "sharedWorker" | "all"

interface ClientsMatchAllOptions {
  includeUncontrolled?: boolean
  type?: ClientType
}

interface Clients {
  get: (id: string) => Promise<WindowClient>
  matchAll: (options?: ClientsMatchAllOptions) => Promise<Array<WindowClient>>
  openWindow: (url: string) => Promise<WindowClient | null>
  claim: () => Promise<void>
}

interface ExtendableEvent extends Event {
  waitUntil<A>(promise: Promise<A>): void
}

interface WorkerGlobalScope extends EventTarget {}

interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  clients: Clients
  skipWaiting: () => Promise<void>
  oninstall: (event: ExtendableEvent) => void
  onactivate: (event: ExtendableEvent) => void
  onmessage: (event: MessageEvent) => void
  registration: ServiceWorkerRegistration
}

declare var module: NodeModule

// Same as module.exports
declare var exports: unknown

declare module "jdenticon" {
  export function update(selector: string, value: string): void
}
