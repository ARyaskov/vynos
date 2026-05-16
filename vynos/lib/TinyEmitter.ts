type Listener<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => void

export default class TinyEmitter {
  private readonly listeners = new Map<string, Set<Listener>>()

  on<TArgs extends unknown[]>(event: string, listener: Listener<TArgs>): this {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set<Listener>()
      this.listeners.set(event, set)
    }
    set.add(listener as Listener)
    return this
  }

  addListener<TArgs extends unknown[]>(event: string, listener: Listener<TArgs>): this {
    return this.on(event, listener)
  }

  once<TArgs extends unknown[]>(event: string, listener: Listener<TArgs>): this {
    const wrapped: Listener = (...args: unknown[]) => {
      this.removeListener(event, wrapped)
      listener(...(args as TArgs))
    }
    return this.on(event, wrapped)
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

  removeListener<TArgs extends unknown[]>(event: string, listener: Listener<TArgs>): this {
    const set = this.listeners.get(event)
    if (!set) {
      return this
    }
    set.delete(listener as Listener)
    if (set.size === 0) {
      this.listeners.delete(event)
    }
    return this
  }

  off<TArgs extends unknown[]>(event: string, listener: Listener<TArgs>): this {
    return this.removeListener(event, listener)
  }
}
