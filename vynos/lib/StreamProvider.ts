import { Duplex } from "./duplex"
import Payload, { JSONRPC, randomId, ResponsePayload } from "./Payload"
import { VynosProvider } from "./provider"

export default class StreamProvider extends Duplex implements VynosProvider {
  _callbacks: Map<string, Function>
  name: string
  strict: boolean

  constructor(name?: string, strict?: boolean) {
    super({ objectMode: true })
    this._callbacks = new Map()
    this.name = `StreamProvider at ${name}` || "StreamProvider"
    this.strict = strict || false
  }

  sendAsync<A extends Payload, B extends ResponsePayload>(payload: A, callback: (error: Error | null, response?: B) => void) {
    this.ask<A, B>(payload)
      .then((result: B) => {
        if (result.error) {
          callback(new Error(String(result.error)))
        } else {
          callback(null, result as B)
        }
        return null
      })
      .catch((error) => {
        callback(error as Error)
      })
  }

  send<A extends Payload>(payload: A) {
    throw new Error(`Vynos provider does not support synchronous methods, please use asynchronous style`)
  }

  request<T>(args: { method: string; params?: unknown[] }): Promise<T> {
    const payload: Payload = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: args.method,
      params: args.params || []
    }
    return this.ask<Payload, ResponsePayload>(payload).then((response) => {
      if (response.error) {
        throw new Error(response.error)
      }
      return response.result as T
    })
  }

  ask<A extends Payload, B extends ResponsePayload>(payload: A, timeout: number = 0): Promise<B> {
    let id = payload.id
    let result = new Promise<B>((resolve, reject) => {
      let resolved = false

      this._callbacks.set(id.toString(), (response: B) => {
        resolved = true
        resolve(response)
      })

      if (timeout > 0) {
        setTimeout(() => {
          if (!resolved) {
            reject(new Error("Timeout"))
          }
        }, timeout)
      }
    })
    this.push(payload)
    return result
  }

  listen<B>(id: string, handler: (response: B) => void) {
    this._callbacks.set(id, handler)
  }

  _read(n: number) {
    // Do Nothing
  }

  _write<A extends ResponsePayload>(payload: A, encoding: string, next: Function) {
    let id = payload.id
    let isResult = !!payload.result || !!payload.error
    if (isResult) {
      let callback = this._callbacks.get(id.toString())
      if (callback) {
        callback(payload)
      } else if (this.strict) {
        console.error(`${this.name}: Can not find response callback for id ${id}`)
      }
    }
    next()
  }
}
