export function isServiceWorker(w: unknown): w is ServiceWorkerGlobalScope {
  return typeof w === "object" && w !== null && "clients" in w
}

export function asServiceWorker(fn: (w: ServiceWorkerGlobalScope) => void) {
  if (isServiceWorker(self)) {
    fn(self)
  }
}
