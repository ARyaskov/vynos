import TransactionStorage from "../lib/storage/TransactionMetaStorage"
import { type WorkerStore } from "./store"
import * as actions from "./actions"
import Transaction from "../lib/TransactionMeta"
import TransactionState from "../lib/TransactionState"

export default class TransactionService {
  storage: TransactionStorage
  store: WorkerStore

  constructor(store: WorkerStore) {
    this.storage = new TransactionStorage()
    this.store = store
  }

  addTransaction(transaction: Transaction): Promise<void> {
    return this.storage.add(transaction).then(() => {
      this.store.dispatch(actions.setLastUpdateDb(Date.now()))
    })
  }

  approveTransaction(transaction: Transaction): Promise<boolean> {
    return this.storage.add(transaction).then((res) => {
      return this.dispatchTransaction(transaction)
    })
  }

  async setApproveById(id: string): Promise<void> {
    await this.storage.approve(id)
  }

  async setRejectById(id: string): Promise<void> {
    await this.storage.reject(id)
  }

  checkPendingTrasactions() {
    this.storage.pending().then((transactions) => {
      if (transactions.length) {
        this.store.dispatch(actions.setTransactionPending(true))
      } else {
        this.store.dispatch(actions.setTransactionPending(false))
      }
    })
  }

  dispatchTransaction(transaction: Transaction): Promise<boolean> {
    let resolved = false
    this.store.dispatch(actions.setTransactionPending(true))
    return new Promise((resolve, reject) => {
      this.store.subscribe(() => {
        // FIX ME perfomance problem
        if (resolved) {
          return
        }
        this.storage.byId(transaction.id).then((found) => {
          if (!found) {
            return reject(`Can not find transaction #${transaction.id}`)
          }
          if (found.state !== TransactionState.APPROVED && found.state !== TransactionState.REJECTED) {
            return
          }
          if (this.store.getState().runtime.isTransactionPending) {
            resolved = true
          }
          this.checkPendingTrasactions()
          if (found.state === TransactionState.APPROVED) {
            resolve(true)
          } else if (found.state === TransactionState.REJECTED) {
            resolve(false)
          }
        })
      })
    })
  }
}
