import { combineReducers, createReducer, type Reducer } from "@reduxjs/toolkit"
import { type FrameState, initialState } from "./FrameState"
import * as actions from "./actions"
import { topmenu } from "./menu"
import WorkerProxy from "../WorkerProxy"

export default function reducers(workerProxy: WorkerProxy): Reducer<FrameState> {
  const state = initialState(workerProxy)

  const tempReducer = createReducer(state.temp, (builder) => {
    builder
      .addCase(actions.didAcceptTerms, (draft, action) => {
        draft.initPage.didAcceptTerms = action.payload
      })
      .addCase(actions.didReceiveMnemonic, (draft, action) => {
        draft.initPage.mnemonic = action.payload
      })
      .addCase(actions.setWorkerProxy, (draft, action) => {
        draft.workerProxy = action.payload
      })
      .addCase(actions.clearTempState, (draft) => {
        draft.initPage.didAcceptTerms = false
        draft.initPage.mnemonic = null
      })
  })

  const sharedReducer = createReducer(state.shared, (builder) => {
    builder
      .addCase(actions.setSharedState, (_draft, action) => action.payload.sharedState)
      .addCase(actions.setPending, (draft, action) => {
        draft.isTransactionPending = action.payload ? Date.now() : 0
      })
  })

  return combineReducers({
    temp: tempReducer,
    shared: sharedReducer,
    menu: topmenu
  })
}
