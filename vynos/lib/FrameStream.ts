import PostStream from "./PostStream"
import { Duplex } from "./duplex"

class DeferredDuplex extends Duplex {
  private target: Duplex | null = null
  private readonly writeQueue: Array<{ chunk: unknown; encoding: BufferEncoding; next: (error?: Error | null) => void }> = []

  constructor() {
    super({ objectMode: true })
  }

  attach(target: Duplex) {
    this.target = target
    target.on("data", (chunk) => this.push(chunk))
    target.on("end", () => this.push(null))
    target.on("error", (error) => this.emit("error", error))

    while (this.writeQueue.length > 0) {
      const entry = this.writeQueue.shift()!
      target.write(entry.chunk, entry.encoding, entry.next)
    }
  }

  _read() {
    // Do Nothing
  }

  _write(chunk: unknown, encoding: BufferEncoding, next: (error?: Error | null) => void) {
    if (!this.target) {
      this.writeQueue.push({ chunk, encoding, next })
      return
    }
    this.target.write(chunk, encoding, next)
  }
}

export default class FrameStream {
  name: string

  constructor(name?: string) {
    this.name = name || "frame"
  }

  parentName() {
    return `${this.name}-parent`
  }

  childName() {
    return `${this.name}-child`
  }

  toFrame(frame: HTMLIFrameElement): Duplex {
    const result = new DeferredDuplex()
    frame.addEventListener("load", () => {
      let postStream = new PostStream({
        sourceName: this.parentName(),
        targetName: this.childName(),
        target: frame.contentWindow
      })
      result.attach(postStream)
    })
    return result
  }

  toParent(): Duplex {
    return new PostStream({
      sourceName: this.childName(),
      targetName: this.parentName(),
      target: window.parent
    })
  }
}
