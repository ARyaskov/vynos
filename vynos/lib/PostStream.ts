import { Duplex } from "./duplex"
import {
  ClearAccountInfoRequest,
  ClearChannelMetastorageRequest,
  ClearChannelStorageRequest,
  ClearReduxPersistentStorageRequest,
  ClearTransactionMetastorageRequest,
  GetPrivateKeyHexRequest
} from "./rpc/yns"

const restrictedMethodsForClient = [
  GetPrivateKeyHexRequest.method,
  ClearAccountInfoRequest.method,
  ClearChannelStorageRequest.method,
  ClearReduxPersistentStorageRequest.method,
  ClearChannelMetastorageRequest.method,
  ClearTransactionMetastorageRequest.method
]

export type Target = Window | ServiceWorker | null

function isWindow(target: Target): target is Window {
  return !!(target as Window).window
}

function isServiceWorker(target: Target): target is ServiceWorker {
  return target instanceof ServiceWorker
}

export type PostStreamOptions = {
  sourceName: string
  targetName: string
  target?: Target
  source?: EventTarget
  origin?: string
}

export default class PostStream extends Duplex {
  sourceName: string
  targetName: string
  sourceWindow: EventTarget
  targetWindow: Target
  origin: string
  highWaterMark: number
  writableHighWaterMark: number
  readableHighWaterMark: number
  writableLength: number
  readableLength: number
  private messageListener: EventListener

  constructor(options: PostStreamOptions) {
    super({ objectMode: true })

    this.sourceName = options.sourceName
    this.targetName = options.targetName
    this.sourceWindow = options.source || window
    this.targetWindow = options.target || window

    this.origin = options.target ? "*" : window.location.origin

    this.highWaterMark = 16
    this.writableHighWaterMark = 16
    this.readableHighWaterMark = 16
    this.writableLength = 16
    this.readableLength = 16

    this.messageListener = (event: Event) => this.onMessage(event as MessageEvent)
    this.sourceWindow.addEventListener("message", this.messageListener)
  }

  onMessage(event: MessageEvent) {
    let message = event.data

    let correctOrigin = this.origin === "*" || event.origin === this.origin
    let correctSource = event.source === this.targetWindow

    if (correctOrigin && correctSource && typeof message === "object") {
      if (message.target === this.sourceName && message.data) {
        try {
          this.push(message.data)
        } catch (error) {
          this.emit("error", error)
        }
      }
    }
  }

  _read() {
    // Do Nothing
  }

  _destroy(err: Error, callback: Function) {
    this.sourceWindow.removeEventListener("message", this.messageListener)
    callback()
  }

  _write(data: unknown, encoding: string, next: () => void) {
    let message = {
      target: this.targetName,
      data: data
    }
    if (isWindow(this.targetWindow)) {
      const method = typeof data === "object" && data !== null && "method" in data ? (data as { method?: unknown }).method : undefined
      if (typeof method === "string" && restrictedMethodsForClient.includes(method)) {
        console.error("Client requested restricted method: " + method)
      } else {
        this.targetWindow.postMessage(message, this.origin)
      }
    } else if (isServiceWorker(this.targetWindow)) {
      this.targetWindow.postMessage(message)
    } else {
      throw new Error("Can not write to empty target")
    }
    next()
  }

  end(cb?: () => void): this
  end(chunk: unknown, cb?: () => void): this
  end(chunk: unknown, encoding?: string, cb?: () => void): this
  end(...args: unknown[]): this {
    super.end(...args)
    this.sourceWindow.removeEventListener("message", this.messageListener)
    return this
  }
}
