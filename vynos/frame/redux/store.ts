import { configureStore } from "@reduxjs/toolkit"
import reducers from "./reducers"
import WorkerProxy from "../WorkerProxy"
import { initialState, type FrameState } from "./FrameState"

export type FrameStore = ReturnType<typeof createFrameStore>

export function createFrameStore(workerProxy: WorkerProxy) {
  return configureStore({
    reducer: reducers(workerProxy),
    preloadedState: initialState(workerProxy) as FrameState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: {
          ignoredPaths: ["temp.workerProxy"],
          ignoredActions: ["frame/temp/setWorkerProxy", "frame/shared/setSharedState", "frame/temp/didAcceptTerms", "frame/temp/didReceiveMnemonic"]
        }
      })
  })
}
