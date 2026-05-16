type EventListener = (...args: unknown[]) => void

type PipeBinding = {
  data: (chunk: unknown) => void
  end: () => void
}

export class Duplex {
  private readonly listeners = new Map<string, Set<EventListener>>()
  private readonly pipes = new Map<Duplex, PipeBinding>()

  constructor(_options?: unknown) {
    void _options
  }

  on(event: string, listener: EventListener): this {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set<EventListener>()
      this.listeners.set(event, set)
    }
    set.add(listener)
    return this
  }

  addListener(event: string, listener: EventListener): this {
    return this.on(event, listener)
  }

  once(event: string, listener: EventListener): this {
    const wrapped: EventListener = (...args: unknown[]) => {
      this.removeListener(event, wrapped)
      listener(...args)
    }
    return this.on(event, wrapped)
  }

  removeListener(event: string, listener: EventListener): this {
    const set = this.listeners.get(event)
    if (!set) {
      return this
    }
    set.delete(listener)
    if (set.size === 0) {
      this.listeners.delete(event)
    }
    return this
  }

  off(event: string, listener: EventListener): this {
    return this.removeListener(event, listener)
  }

  emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event)
    if (!set || set.size === 0) {
      return false
    }
    for (const listener of [...set]) {
      listener(...args)
    }
    return true
  }

  pipe(destination: Duplex): Duplex {
    const binding: PipeBinding = {
      data: (chunk: unknown) => {
        destination.write(chunk)
      },
      end: () => {
        destination.end()
      }
    }

    this.pipes.set(destination, binding)
    this.on("data", binding.data)
    this.on("end", binding.end)
    return destination
  }

  unpipe(destination: Duplex): this {
    const binding = this.pipes.get(destination)
    if (!binding) {
      return this
    }
    this.removeListener("data", binding.data)
    this.removeListener("end", binding.end)
    this.pipes.delete(destination)
    return this
  }

  push(chunk: unknown): boolean {
    if (chunk === null) {
      this.emit("end")
      return false
    }
    this.emit("data", chunk)
    return true
  }

  _read(_n?: number): void {
    // Do Nothing
  }

  _write(_chunk: unknown, _encoding: string, next: (error?: Error | null) => void): void {
    next()
  }

  write(chunk: unknown, encoding?: string | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean {
    const actualEncoding = typeof encoding === "string" ? encoding : "utf8"
    const actualCallback = typeof encoding === "function" ? encoding : callback
    this._write(chunk, actualEncoding, (error?: Error | null) => {
      if (error) {
        this.emit("error", error)
      }
      if (actualCallback) {
        actualCallback(error)
      }
    })
    return true
  }

  end(chunk?: unknown, encoding?: string, callback?: () => void): this {
    if (chunk !== undefined) {
      this.write(chunk, encoding)
    }
    this.emit("end")
    if (callback) {
      callback()
    }
    return this
  }
}
