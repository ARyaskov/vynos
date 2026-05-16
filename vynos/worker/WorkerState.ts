export interface Preferences {
  micropaymentThreshold: number
  micropaymentThrottlingHumanReadable: string
  currency: string
  theme: "light" | "dark" | "system"
}

export interface RuntimeWallet {
  getPrivateKey: () => Uint8Array
  getAddressString: () => string
}

export interface RuntimeState {
  wallet?: RuntimeWallet
  isTransactionPending: number
  lastUpdateDb: number
  lastMicropaymentTime: number
}

export interface SharedState {
  didInit: boolean
  isLocked: boolean
  isTransactionPending: number
  rememberPath: string
  lastUpdateDb: number
  preferences: Preferences
  lastMicropaymentTime: number
}

export interface PersistentState {
  didInit: boolean
  keyring?: string
  rememberPath: string
  preferences: Preferences
}

export interface WorkerState {
  persistent: PersistentState
  runtime: RuntimeState
}

export const INITIAL_SHARED_STATE: SharedState = {
  didInit: false,
  isLocked: true,
  isTransactionPending: 0,
  rememberPath: "/",
  lastUpdateDb: 0,
  preferences: {
    micropaymentThreshold: 1000000,
    micropaymentThrottlingHumanReadable: "-1ms",
    currency: "ETH",
    theme: "light"
  },
  lastMicropaymentTime: -1
}

export const INITIAL_STATE: WorkerState = {
  persistent: {
    didInit: false,
    rememberPath: "/",
    preferences: {
      micropaymentThreshold: 1000000,
      micropaymentThrottlingHumanReadable: "-1ms",
      currency: "ETH",
      theme: "light"
    }
  },
  runtime: {
    isTransactionPending: 0,
    lastUpdateDb: 0,
    lastMicropaymentTime: -1
  }
}

export function buildSharedState(state: WorkerState): SharedState {
  const defaults: Preferences = {
    micropaymentThreshold: 1000000,
    micropaymentThrottlingHumanReadable: "-1ms",
    currency: "ETH",
    theme: "light"
  }
  const preferences = {
    ...defaults,
    ...(state.persistent.preferences || {})
  }

  return {
    didInit: state.persistent.didInit,
    isLocked: !state.runtime.wallet,
    isTransactionPending: state.runtime.isTransactionPending,
    rememberPath: state.persistent.rememberPath,
    lastUpdateDb: state.runtime.lastUpdateDb,
    preferences,
    lastMicropaymentTime: state.runtime.lastMicropaymentTime
  }
}
