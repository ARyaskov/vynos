import { Duplex } from "./duplex"

export interface ServiceWorkerStreamOptions {
  sourceName: string
  targetName: string
  source: ServiceWorkerGlobalScope
}

export default class ServiceWorkerStream extends Duplex {
  source: ServiceWorkerGlobalScope
  targetName: string
  sourceName: string
  private messageListener: EventListener

  constructor(options: ServiceWorkerStreamOptions) {
    super({ objectMode: true })
    this.source = options.source
    this.targetName = options.targetName
    this.sourceName = options.sourceName

    this.messageListener = (event: Event) => this.onMessage(event as MessageEvent)
    this.source.addEventListener("message", this.messageListener, false)
  }

  onMessage(event: MessageEvent) {
    let message = event.data
    if (typeof message === "object" && message.target === this.sourceName && message.data) {
      try {
        this.push(message.data)
      } catch (error) {
        this.emit("error", error)
      }
    }
  }

  _read(n: number) {
    // Do Nothing
  }

  _write(data: unknown, encoding: unknown, next: () => void) {
    let message = {
      target: this.targetName,
      data: data
    }
    this.source.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage(message)
      })
    })
    next()
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    this.source.removeEventListener("message", this.messageListener, false)
    callback(err)
  }
}
