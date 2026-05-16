import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { type Preferences, type WorkerState, type PersistentState, type RuntimeWallet, INITIAL_STATE } from "./WorkerState"

export type RestoreWalletParam = {
  keyring: string
  wallet: RuntimeWallet
}

const workerSlice = createSlice({
  name: "worker",
  initialState: INITIAL_STATE as WorkerState,
  reducers: {
    setWallet(state, action: PayloadAction<RuntimeWallet | undefined>) {
      state.runtime.wallet = action.payload
    },
    setLastMicropaymentTime(state, action: PayloadAction<number>) {
      state.runtime.lastMicropaymentTime = action.payload
    },
    setKeyring(state, action: PayloadAction<string>) {
      state.persistent.keyring = action.payload
    },
    restoreWallet(state, action: PayloadAction<RestoreWalletParam>) {
      state.persistent.didInit = true
      state.persistent.keyring = action.payload.keyring
      state.runtime.wallet = action.payload.wallet
    },
    setDidStoreMnemonic(state, _action: PayloadAction<boolean>) {
      state.persistent.didInit = true
    },
    setTransactionPending(state, action: PayloadAction<boolean>) {
      state.runtime.isTransactionPending = action.payload ? Date.now() : 0
    },
    rememberPage(state, action: PayloadAction<string>) {
      state.persistent.rememberPath = action.payload
    },
    setLastUpdateDb(state, action: PayloadAction<number>) {
      state.runtime.lastUpdateDb = action.payload
    },
    setPreferences(state, action: PayloadAction<Preferences>) {
      state.persistent.preferences = action.payload
    },
    setPersistentState(state, action: PayloadAction<PersistentState>) {
      state.persistent = action.payload
    }
  }
})

export const {
  setWallet,
  setLastMicropaymentTime,
  setKeyring,
  restoreWallet,
  setDidStoreMnemonic,
  setTransactionPending,
  rememberPage,
  setLastUpdateDb,
  setPreferences,
  setPersistentState
} = workerSlice.actions

export default workerSlice
