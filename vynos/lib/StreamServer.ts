import { Duplex } from "./duplex"
import { RequestPayload, Payload } from "./Payload"

export type EndFunction = <A extends Payload>(error: Error | null, response?: A) => void
export type Handler = (message: Payload, next: Function, end: EndFunction) => void

export default class StreamServer extends Duplex {
  _handlers: Array<Handler>
  verbose: boolean
  name: string

  constructor(name?: string, verbose: boolean = false) {
    super({ objectMode: true })
    this._handlers = []
    this.name = `StreamServer at ${name}` || "StreamServer"
    this.verbose = verbose
  }

  add(handler: Handler): this {
    this._handlers.push(handler)
    return this
  }

  handle<A extends Payload>(payload: A) {
    const end: EndFunction = (error, response) => {
      if (error !== null) {
        console.error(error)
        this.push({
          id: payload.id,
          jsonrpc: payload.jsonrpc,
          error: error.toString()
        })
      } else {
        if (response) {
          this.push(response)
        }
      }
    }

    const nextHandler = (handlers: Array<Handler>) => {
      let head = (handlers || [])[0]
      let next = () => nextHandler((handlers || []).slice(1))
      if (head) {
        try {
          head(payload, next, end)
        } catch (error) {
          end(error instanceof Error ? error : new Error(String(error)))
        }
      } else {
        if (this.verbose) {
          console.log(`${this.name}: No response for message`, payload)
        }
      }
    }

    nextHandler(this._handlers)
  }

  _read(n: number) {
    // Do Nothing
  }

  _write<A extends RequestPayload>(payload: A, encoding: string, next: Function) {
    this.handle(payload)
    next()
  }
}
