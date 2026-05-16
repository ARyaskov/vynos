import TransactionStorage from "../lib/storage/TransactionMetaStorage"
import type { PublicClient } from "viem"
import * as transactions from "../lib/transactions"
import Transaction from "../lib/TransactionMeta"
import * as actions from "./actions"
import { type WorkerStore } from "./store"
import NetworkController from "./controllers/NetworkController"

export default class IncomingTransactionService {
  private storage: TransactionStorage

  private store: WorkerStore

  private networkController: NetworkController

  private client: PublicClient | undefined

  private timer: ReturnType<typeof setInterval> | undefined
  private latestProcessedBlock: bigint | undefined
  private rpcUnavailableLogged = false

  constructor(storage: TransactionStorage, store: WorkerStore, networkController: NetworkController) {
    this.storage = storage
    this.store = store
    this.networkController = networkController
  }

  async start() {
    await this.networkController.ready!
    this.client = this.networkController.getPublicClient()
    if (!this.client) {
      return
    }

    const poll = async () => {
      if (!this.client) {
        return
      }
      try {
        const currentBlock = await this.client.getBlockNumber()
        this.rpcUnavailableLogged = false
        if (this.latestProcessedBlock !== undefined && currentBlock === this.latestProcessedBlock) {
          return
        }

        const accounts = await this.networkController.background.getAccounts()
        const account = accounts[0]?.toLowerCase()
        if (!account) {
          this.latestProcessedBlock = currentBlock
          return
        }

        const block = await this.client.getBlock({
          blockNumber: currentBlock,
          includeTransactions: true
        })

        for (const tx of block.transactions) {
          if (tx.to && tx.to.toLowerCase() === account) {
            const transactionToAppend = transactions.incoming(tx.from, tx.value)
            await this.addTransaction(transactionToAppend)
          }
        }

        this.latestProcessedBlock = currentBlock
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error)
        const isNetworkFetchFailure = text.includes("Failed to fetch") || text.includes("NetworkError") || text.includes("fetch")

        if (isNetworkFetchFailure) {
          if (!this.rpcUnavailableLogged) {
            this.rpcUnavailableLogged = true
            console.warn(
              `[IncomingTransactionService] RPC is not reachable from browser for "${this.networkController.rpcUrl}". ` +
                "Polling incoming transactions is paused until connectivity is restored (possible CORS/network block)."
            )
          }
          return
        }

        console.error(error)
      }
    }

    await poll()
    this.timer = setInterval(() => {
      poll().catch(console.error)
    }, 3000)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  private addTransaction(transaction: Transaction): Promise<void> {
    return this.storage.add(transaction).then(() => {
      this.store.dispatch(actions.setLastUpdateDb(Date.now()))
    })
  }
}
