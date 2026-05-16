import { ServiceWorkerClient } from "../lib/serviceWorkerClient"
import WorkerProxy from "./WorkerProxy"
import { Duplex } from "../lib/duplex"
import renderApplication from "./renderApplication"
import FrameStream from "../lib/FrameStream"
import PostStream from "../lib/PostStream"

export default class Client implements ServiceWorkerClient {
  workerStream: PostStream | undefined
  windowStream: Duplex
  workerProxy: WorkerProxy

  constructor() {
    this.workerProxy = new WorkerProxy()
    this.windowStream = new FrameStream("vynos").toParent()
    this.workerStream = undefined
  }

  async load(serviceWorker: ServiceWorker) {
    this.workerStream = new PostStream({
      sourceName: "frame",
      targetName: "worker",
      source: navigator.serviceWorker,
      target: serviceWorker
    })

    this.windowStream.pipe(this.workerStream)
    this.workerStream.pipe(this.windowStream)

    this.workerStream.pipe(this.workerProxy.provider)
    this.workerProxy.provider.pipe(this.workerStream)

    await renderApplication(document, this.workerProxy)
  }

  unload() {
    if (!this.workerStream) {
      return
    }
    this.windowStream.unpipe(this.workerStream)
    this.workerStream.unpipe(this.windowStream)
    this.workerStream.unpipe(this.workerProxy.provider)
    this.workerProxy.provider.unpipe(this.workerStream)
    this.workerStream.end()
  }
}
