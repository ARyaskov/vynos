import localforage from "localforage"
import TransactionMeta from "../TransactionMeta"
import TransactionState from "../TransactionState"
import bus from "../../lib/bus"
import * as events from "../events"
import { default as SettingStorage } from "./SettingStorage"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "./dbConfig"

type TransactionMap = Record<string, TransactionMeta>

const transactionsStore = localforage.createInstance({
  name: VYNOS_DB_NAME,
  version: VYNOS_DB_VERSION,
  storeName: "transactions"
})

const settingStorage = new SettingStorage()

export default class TransactionMetaStorage {
  private networkName: string = ""

  private async ensureNetworkName(): Promise<string> {
    if (this.networkName) {
      return this.networkName
    }
    const network = await settingStorage.getNetwork()
    this.networkName = network.name
    return this.networkName
  }

  private async storageKey(): Promise<string> {
    const networkName = await this.ensureNetworkName()
    return `transactions_${networkName}`
  }

  private async loadMap(): Promise<TransactionMap> {
    const key = await this.storageKey()
    return (await transactionsStore.getItem<TransactionMap>(key)) || {}
  }

  private async saveMap(value: TransactionMap): Promise<void> {
    const key = await this.storageKey()
    await transactionsStore.setItem(key, value)
  }

  async add(transaction: TransactionMeta): Promise<TransactionMeta> {
    const transactions = await this.loadMap()
    transactions[transaction.id] = transaction
    await this.saveMap(transactions)
    return transaction
  }

  async byId(id: string): Promise<TransactionMeta | null> {
    const transactions = await this.loadMap()
    return transactions[id] || null
  }

  pending(): Promise<Array<TransactionMeta>> {
    return this.find({ state: TransactionState.PENDING.toString() })
  }

  approved(): Promise<Array<TransactionMeta>> {
    return this.find({ state: TransactionState.APPROVED.toString() })
  }

  view(id: string) {
    return this.update({ id }, { $set: { state: "VIEWED" } })
  }

  approve(id: string) {
    return this.update({ id }, { $set: { state: "APPROVED" } }).then((array) => {
      bus.emit(events.txApproved(id))
      return array
    })
  }

  reject(id: string) {
    return this.update({ id }, { $set: { state: "REJECTED" } }).then((array) => {
      bus.emit(events.txRejected(id))
      return array
    })
  }

  async update(query: Record<string, unknown>, update: { $set?: Partial<TransactionMeta> }): Promise<Array<TransactionMeta>> {
    const transactions = await this.loadMap()
    const changed: TransactionMeta[] = []

    const patch = update.$set || {}
    for (const tx of Object.values(transactions)) {
      if (this.matches(tx, query)) {
        Object.assign(tx, patch)
        changed.push(tx)
      }
    }

    await this.saveMap(transactions)
    return changed
  }

  all(): Promise<Array<TransactionMeta>> {
    return this.find({})
  }

  clear(cb: () => void) {
    this.saveMap({})
      .then(() => cb())
      .catch((error) => {
        console.error("Error while deleting transactions local database")
        console.error(error)
        cb()
      })
  }

  async changeNetwork(): Promise<void> {
    const network = await settingStorage.getNetwork()
    this.networkName = network.name
  }

  protected async find(query: Record<string, unknown>): Promise<Array<TransactionMeta>> {
    const transactions = await this.loadMap()
    return Object.values(transactions)
      .filter((transaction) => this.matches(transaction, query))
      .sort((left, right) => left.time - right.time)
  }

  private matches(candidate: TransactionMeta, query: Record<string, unknown>): boolean {
    const entries = Object.entries(query)
    if (entries.length === 0) {
      return true
    }

    for (const [key, expected] of entries) {
      const value = (candidate as unknown as Record<string, unknown>)[key]
      if (value !== expected) {
        return false
      }
    }

    return true
  }
}
