import * as redux from "redux";
import reducers from "./reducers";
import {INITIAL_STATE, SharedState, State} from "./State";
import {Store} from "redux";
import * as actions from "./actions";

export default class BackgroundController {
  store: Store<State>

  constructor() {
    this.store = redux.createStore(reducers, INITIAL_STATE)
  }

  setPage(name: string): Promise<SharedState> {
    this.store.dispatch(actions.setPage({name: name}))
    return this.getSharedState()
  }

  getSharedState(): Promise<SharedState> {
    return this.getState().then(state => state.shared)
  }

  getState(): Promise<State> {
    return Promise.resolve(this.store.getState())
  }

  didChangeSharedState(fn: (state: SharedState) => void) {
    this.store.subscribe(() => {
      let state = this.store.getState()
      let sharedState = state.shared
      fn(sharedState)
    })
  }
}