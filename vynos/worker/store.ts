import { configureStore } from "@reduxjs/toolkit"
import reducers from "./reducers"
import localforage from "localforage"
import { INITIAL_STATE, type PersistentState } from "./WorkerState"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "../lib/storage/dbConfig"

export function createWorkerStore() {
  return configureStore({
    reducer: reducers,
    preloadedState: INITIAL_STATE,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false
      })
  })
}

export type WorkerStore = ReturnType<typeof createWorkerStore>
export type WorkerDispatch = WorkerStore["dispatch"]
export type WorkerRootState = ReturnType<WorkerStore["getState"]>

const workerStateStorage = localforage.createInstance({
  name: VYNOS_DB_NAME,
  version: VYNOS_DB_VERSION,
  storeName: "worker"
})
const PERSIST_KEY = "persistent_state_v2"

export async function loadPersistentState(): Promise<PersistentState | undefined> {
  const persisted = await workerStateStorage.getItem<PersistentState>(PERSIST_KEY)
  if (!persisted) {
    return undefined
  }
  const preferences = {
    ...INITIAL_STATE.persistent.preferences,
    ...(persisted.preferences || {})
  }
  return {
    ...INITIAL_STATE.persistent,
    ...persisted,
    preferences
  }
}

export async function persistPersistentState(state: PersistentState): Promise<void> {
  await workerStateStorage.setItem(PERSIST_KEY, state)
}
