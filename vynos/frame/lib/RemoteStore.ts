import { type Store } from "@reduxjs/toolkit"
import { SharedState } from "../../worker/WorkerState"
import WorkerProxy from "../WorkerProxy"
import TinyEmitter from "../../lib/TinyEmitter"
import { SharedStateBroadcastType, SharedStateBroadcast } from "../../lib/rpc/SharedStateBroadcast"
import { type Action, type Reducer, type Unsubscribe } from "@reduxjs/toolkit"
import { FrameState } from "../redux/FrameState"
import { setSharedState } from "../redux/actions"

export default class RemoteStore {
  workerProxy: WorkerProxy
  state: SharedState
  eventEmitter: TinyEmitter

  constructor(workerProxy: WorkerProxy, initial: SharedState) {
    this.workerProxy = workerProxy
    this.state = initial
    this.eventEmitter = new TinyEmitter()
    this.workerProxy.addListener(SharedStateBroadcastType, this.onSharedStateBroadcast.bind(this))
    this.dispatch = this.dispatch.bind(this)
  }

  onSharedStateBroadcast(data: SharedStateBroadcast) {
    this.state = data.result
    this.eventEmitter.emit("update")
  }

  dispatch<A extends Action>(action: A): A {
    this.workerProxy.dispatch(action)
    return action
  }

  getState(): SharedState {
    return this.state
  }

  subscribe(listener: () => void): Unsubscribe {
    this.eventEmitter.addListener("update", listener)
    return () => {
      this.eventEmitter.removeListener("update", listener)
    }
  }

  replaceReducer(nextReducer: Reducer<SharedState>): void {
    // Do Nothing
  }

  wireToLocal(store: Store<FrameState>) {
    this.subscribe(() => {
      store.dispatch(setSharedState({ sharedState: this.getState() }))
    })
    store.dispatch(setSharedState({ sharedState: this.getState() }))
  }
}
