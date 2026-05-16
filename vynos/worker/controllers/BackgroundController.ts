import { buildSharedState, INITIAL_STATE, Preferences, RuntimeWallet, SharedState, WorkerState } from "../WorkerState"
import * as actions from "../actions"
import * as bip39 from "bip39"
import { HDKey } from "@scure/bip32"
import { hexToBytes, isHex } from "viem"
import Keyring from "../../frame/lib/Keyring"
import localForage from "localforage"
import TinyEmitter from "../../lib/TinyEmitter"
import bus from "../../lib/bus"
import { CHANGE_NETWORK } from "../../lib/constants"
import { WalletBuyArguments } from "../../lib/Vynos"
import { BuyProcessEvent } from "../../lib/rpc/buyProcessEventBroadcast"
import { ChannelMeta, default as ChannelMetaStorage } from "../../lib/storage/ChannelMetaStorage"
import TransactionService from "../TransactionService"
import NetworkController from "./NetworkController"
import { createWorkerStore, loadPersistentState, persistPersistentState, type WorkerStore } from "../store"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "../../lib/storage/dbConfig"

const HD_PATH = `m/44'/60'/0'/0`

const STATE_UPDATED_EVENT = "stateUpdated"

export default class BackgroundController {
  store: WorkerStore
  events: TinyEmitter
  hydrated: boolean
  sessionMnemonic?: string
  channels?: ChannelMetaStorage
  transactionService?: TransactionService
  networkController: NetworkController | undefined

  constructor() {
    this.store = createWorkerStore()

    this.events = new TinyEmitter()
    this.hydrated = false
    this.sessionMnemonic = undefined
    localForage.config({
      driver: localForage.INDEXEDDB,
      name: VYNOS_DB_NAME,
      version: VYNOS_DB_VERSION
    })
    this.store.subscribe(() => {
      const state = this.store.getState()
      void persistPersistentState(state.persistent).catch(console.error)
      if (this.hydrated) {
        this.events.emit(STATE_UPDATED_EVENT)
      }
    })
    void this.hydratePersistentState().catch((error) => {
      console.error(error)
      this.hydrated = true
      this.events.emit(STATE_UPDATED_EVENT)
    })
  }

  private async hydratePersistentState(): Promise<void> {
    const persisted = await loadPersistentState()
    if (persisted) {
      const nextPersistent = {
        ...persisted,
        // Legacy recovery: if keyring exists, wallet should be treated as initialized.
        didInit: persisted.didInit || !!persisted.keyring
      }
      this.store.dispatch(actions.setPersistentState(nextPersistent))
    }
    this.hydrated = true
    this.events.emit(STATE_UPDATED_EVENT)
  }

  setChannelMetastorage(channelMetaStorage: ChannelMetaStorage) {
    this.channels = channelMetaStorage
  }

  setTransactionService(transactionService: TransactionService) {
    this.transactionService = transactionService
  }

  setNetworkController(networkController: NetworkController) {
    this.networkController = networkController
  }

  awaitHydrated(fn: Function) {
    if (this.hydrated) {
      fn()
    } else {
      this.events.once(STATE_UPDATED_EVENT, () => {
        fn()
      })
    }
  }

  awaitUnlock(fn: Function) {
    const tryCall = () => {
      this.getSharedState().then((sharedState) => {
        let isUnlocked = !sharedState.isLocked && sharedState.didInit
        if (isUnlocked) {
          fn()
        } else {
          this.events.once(STATE_UPDATED_EVENT, tryCall)
        }
      })
    }
    tryCall()
  }

  resolveTransaction() {
    this.store.dispatch(actions.setLastUpdateDb(Date.now()))
  }

  rememberPage(path: string) {
    this.store.dispatch(actions.rememberPage(path))
  }

  getSharedState(): Promise<SharedState> {
    return this.getState().then(buildSharedState)
  }

  getState(): Promise<WorkerState> {
    return new Promise((resolve) => {
      this.awaitHydrated(() => {
        resolve(this.store.getState())
      })
    })
  }

  async genKeyring(password: string): Promise<string> {
    const mnemonic = bip39.generateMnemonic()
    this.sessionMnemonic = mnemonic
    const keyring = this._generateKeyring(password, mnemonic)
    const serialized = await Keyring.serialize(keyring, password)
    this.store.dispatch(actions.setKeyring(serialized))
    return mnemonic
  }

  _generateKeyring(password: string, mnemonic: string): Keyring {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = HDKey.fromMasterSeed(seed)
    const child = root.derive(`${HD_PATH}/0`)
    if (!child.privateKey) {
      throw new Error("Could not derive private key")
    }
    const keyring = new Keyring(child.privateKey)
    let wallet = keyring.wallet
    this.store.dispatch(actions.setWallet(wallet))
    return keyring
  }

  async restoreWallet(password: string, type: string, value: string): Promise<boolean> {
    let keyring: Keyring
    if (type === "seed") {
      this.sessionMnemonic = value
      keyring = this._generateKeyring(password, value)
    } else if (type === "hex") {
      const normalizedHex = value.startsWith("0x") ? value : `0x${value}`
      if (!isHex(normalizedHex, { strict: true })) {
        return Promise.resolve(false)
      }
      const privateKey = hexToBytes(normalizedHex as `0x${string}`)
      if (!Keyring.isValidPrivateKey(privateKey)) {
        return Promise.resolve(false)
      }
      keyring = new Keyring(privateKey)
    } else {
      if (!(await Keyring.isValidV3(value, password))) {
        return false
      }
      keyring = await Keyring.fromV3(value, password)
    }
    let wallet = keyring.wallet
    Keyring.serialize(keyring, password).then((serialized) => {
      this.store.dispatch(actions.restoreWallet({ keyring: serialized, wallet: wallet }))
    })
    return true
  }

  getSessionMnemonic(): string | undefined {
    return this.sessionMnemonic
  }

  getAccounts(): Promise<Array<string>> {
    return this.getWallet()
      .then((wallet) => {
        let account = wallet.getAddressString()
        return [account]
      })
      .catch(() => {
        return []
      })
  }

  getWallet(): Promise<RuntimeWallet> {
    return this.getState().then((state) => {
      let wallet = state.runtime.wallet
      if (wallet) {
        return Promise.resolve(wallet)
      } else {
        return Promise.reject(new Error("Wallet is not available"))
      }
    })
  }

  getPrivateKey(): Promise<Uint8Array> {
    return this.getWallet().then((wallet) => {
      return wallet.getPrivateKey()
    })
  }

  didStoreMnemonic(): Promise<void> {
    return new Promise((resolve) => {
      this.awaitHydrated(() => {
        this.store.dispatch(actions.setDidStoreMnemonic(true))
        resolve()
      })
    })
  }

  unlockWallet(password: string): Promise<void> {
    return this.getState()
      .then((state) => {
        let keyring = state.persistent.keyring
        if (keyring) {
          return Promise.resolve(Keyring.deserialize(keyring, password))
        } else {
          return Promise.reject(new Error("Keyring is not present"))
        }
      })
      .then((keyring: Keyring) => {
        this.store.dispatch(actions.setWallet(keyring.wallet))
      })
  }

  lockWallet(): Promise<void> {
    return this.getState().then(() => {
      this.store.dispatch(actions.setWallet(undefined))
    })
  }

  didChangeSharedState(fn: (state: SharedState) => void) {
    this.store.subscribe(() => {
      if (!this.hydrated) {
        return
      }
      this.getSharedState().then((sharedState) => {
        fn(sharedState)
      })
    })
  }

  clearChannelMetastorage() {
    this.channels!.clear(() => {
      this.store.dispatch(actions.setLastUpdateDb(Date.now()))
    })
  }

  clearTransactionMetastorage() {
    this.transactionService!.storage.clear(() => {
      this.store.dispatch(actions.setLastUpdateDb(Date.now()))
    })
  }

  clearReduxPersistentStorage() {
    this.store.dispatch(actions.setPersistentState({ ...INITIAL_STATE.persistent }))
  }

  clearChannelStorage() {
    localForage.removeItem("vynos")
  }

  clearAccountInfo() {
    ;["Sepolia", "Ropsten", "Rinkeby", "Main", ""].map(async (network: string) => {
      await localForage.setItem("transactions_" + network, "")
      await localForage.setItem("channels_" + network, "")
      this.store.dispatch(actions.setLastUpdateDb(Date.now()))
    })
    localForage.setItem("vynos", "")
  }

  changeNetwork(): Promise<void> {
    return new Promise((resolve) => {
      bus.emit(CHANGE_NETWORK)
      return resolve()
    })
  }

  setPreferences(preferences: Preferences): Promise<void> {
    return new Promise((resolve) => {
      this.store.dispatch(actions.setPreferences(preferences))
      resolve()
    })
  }

  setLastMicropaymentTime(lastMicropaymentTime: number): Promise<void> {
    return new Promise((resolve) => {
      this.store.dispatch(actions.setLastMicropaymentTime(lastMicropaymentTime))
      resolve()
    })
  }

  onBuyProcessEvent(fn: (typeOfMessage: BuyProcessEvent, args: WalletBuyArguments, token?: string, channelId?: ChannelMeta) => void): void {
    bus.on(BuyProcessEvent.NO_CHANNEL_FOUND, (args: WalletBuyArguments) => {
      fn(BuyProcessEvent.NO_CHANNEL_FOUND, args)
    })

    bus.on(BuyProcessEvent.CHANNEL_FOUND, (args: WalletBuyArguments, channel: ChannelMeta) => {
      fn(BuyProcessEvent.CHANNEL_FOUND, args, undefined, channel)
    })

    bus.on(BuyProcessEvent.OPENING_CHANNEL_STARTED, (args: WalletBuyArguments) => {
      fn(BuyProcessEvent.OPENING_CHANNEL_STARTED, args)
    })

    bus.on(BuyProcessEvent.OPENING_CHANNEL_FINISHED, (args: WalletBuyArguments, channel: ChannelMeta) => {
      fn(BuyProcessEvent.OPENING_CHANNEL_FINISHED, args, undefined, channel)
    })

    bus.on(BuyProcessEvent.SENT_PAYMENT, (args: WalletBuyArguments) => {
      fn(BuyProcessEvent.SENT_PAYMENT, args)
    })

    bus.on(BuyProcessEvent.RECEIVED_TOKEN, (args: WalletBuyArguments, token: string) => {
      fn(BuyProcessEvent.RECEIVED_TOKEN, args, token)
    })

    bus.on(BuyProcessEvent.SENT_TOKEN, (args: WalletBuyArguments, token: string) => {
      fn(BuyProcessEvent.SENT_TOKEN, args, token)
    })
  }
}
