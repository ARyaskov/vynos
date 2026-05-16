import NetworkController from "./NetworkController"
import BackgroundController from "./BackgroundController"
import VynosBuyResponse from "../../lib/VynosBuyResponse"
import ProviderOptions from "./ProviderOptions"
import TransactionService from "../TransactionService"
import * as transactions from "../../lib/transactions"
import PurchaseMeta from "../../lib/PurchaseMeta"
import ChannelMetaStorage from "../../lib/storage/ChannelMetaStorage"
import TransactionState from "../../lib/TransactionState"
import TransactionMeta from "../../lib/TransactionMeta"
import * as actions from "../actions"
import bus from "../../lib/bus"
import { SharedState } from "../WorkerState"
import * as events from "../../lib/events"
import { BuyProcessEvent } from "../../lib/rpc/buyProcessEventBroadcast"
import { WalletBuyArguments } from "../../lib/Vynos"
import { CHANGE_NETWORK_FOR_MICROPAYMENT_CONTROLLER } from "../../lib/constants"
import { resource, isTokenContractDefined } from "../../lib/helpers"
import { PaymentChannel } from "../../lib/paymentChannel"
import { type ProviderHooks } from "./LocalRpcProvider"
import timeparse from "timeparse"

type BuyOptions = {
  receiver: `0x${string}`
  price: bigint
  gateway: string
  meta: string
  tokenContract?: `0x${string}`
}

type IohTeeOptions = {
  databaseUrl: string
  minimumChannelAmount?: bigint
}

type IohTeeInstance = {
  close: (channelId: `0x${string}`) => Promise<unknown>
  buy: (options: BuyOptions) => Promise<{ channelId: string; token: string }>
  channels: () => Promise<PaymentChannel[]>
}

type IohTeeCtor = new (args: { networkId: number; httpRpcUrl: string; mnemonic: string; hdPath: string; options: IohTeeOptions }) => IohTeeInstance

type IohTeeModule = {
  default?: IohTeeCtor
  IohTee?: IohTeeCtor
}

export default class MicropaymentsController {
  network: NetworkController
  background: BackgroundController
  transactions: TransactionService
  channels: ChannelMetaStorage

  constructor(network: NetworkController, background: BackgroundController, transactions: TransactionService) {
    this.network = network
    this.background = background
    this.transactions = transactions
    this.channels = new ChannelMetaStorage()

    bus.on(CHANGE_NETWORK_FOR_MICROPAYMENT_CONTROLLER, async () => {
      this.transactions.storage.changeNetwork().catch((error) => console.error(error))
      this.channels.changeNetwork().catch((error) => console.error(error))
    })
  }

  providerOpts(rpcUrl: string): ProviderHooks {
    let providerOptions = new ProviderOptions(this.background, this.transactions, rpcUrl)
    return providerOptions.approving()
  }

  private inferNetworkId(rpcUrl: string): number {
    const value = rpcUrl.toLowerCase()
    if (value.includes("main")) {
      return 1
    }
    if (value.includes("ropsten")) {
      return 3
    }
    if (value.includes("rinkeby")) {
      return 4
    }
    return 1
  }

  private async buildIohTee(minimumChannelAmount?: number): Promise<IohTeeInstance | null> {
    const mnemonic = this.background.getSessionMnemonic()
    if (!mnemonic) {
      return null
    }

    const options: IohTeeOptions = {
      databaseUrl: "sqlite://vynos.db"
    }

    if (minimumChannelAmount !== undefined) {
      options.minimumChannelAmount = BigInt(Math.trunc(minimumChannelAmount))
    }

    const iohteeSpecifier = "@riaskov/iohtee"
    const module = (await import(/* @vite-ignore */ iohteeSpecifier)) as IohTeeModule
    const IohTee = (module.default || module.IohTee) as IohTeeCtor

    return new IohTee({
      networkId: this.inferNetworkId(this.network.rpcUrl),
      httpRpcUrl: this.network.rpcUrl,
      mnemonic,
      hdPath: `m/44'/60'/0'/0/0`,
      options
    })
  }

  openChannel(_receiver: string, _amount: number): Promise<PaymentChannel> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"))
    })
  }

  closeChannel(channelId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.background.awaitUnlock(async () => {
        try {
          const iohtee = await this.buildIohTee()
          if (!iohtee) {
            throw new Error("IohTee requires mnemonic in session. Restore wallet from seed phrase to enable micropayments.")
          }
          await iohtee.close(channelId as `0x${string}`)

          let channelDescription = JSON.stringify({ channelId: channelId })
          let transaction = transactions.closeChannel(channelDescription)
          await this.transactions.addTransaction(transaction)
          resolve(channelId)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  buy(
    receiver: string,
    amount: number,
    gateway: string,
    meta: string,
    purchaseMeta: PurchaseMeta,
    channelValue?: number,
    tokenContract?: string
  ): Promise<VynosBuyResponse> {
    return this.checkGateway(gateway)
      .then(() => {
        return new Promise<VynosBuyResponse>((resolve, reject) => {
          this.background.awaitUnlock(async () => {
            let transaction = transactions.micropayment(purchaseMeta, receiver, amount, tokenContract)
            let sharedState = await this.background.getSharedState()
            await this.approve(sharedState, transaction, async () => {
              try {
                let walletBuyArguments: WalletBuyArguments = new WalletBuyArguments(
                  receiver,
                  amount,
                  gateway,
                  meta,
                  purchaseMeta,
                  channelValue,
                  tokenContract
                )
                let accounts = await this.background.getAccounts()
                let account = accounts[0]

                let response: VynosBuyResponse
                const iohtee = await this.buildIohTee(channelValue)
                if (!iohtee) {
                  throw new Error("IohTee requires mnemonic in session. Restore wallet from seed phrase to enable micropayments.")
                }

                const buyOptions: BuyOptions = {
                  receiver: receiver as `0x${string}`,
                  price: BigInt(Math.trunc(amount)),
                  gateway,
                  meta
                }
                if (tokenContract && tokenContract.startsWith("0x")) {
                  buyOptions.tokenContract = tokenContract as `0x${string}`
                }

                const result = await iohtee.buy(buyOptions)
                response = { channelId: result.channelId, token: result.token }

                bus.emit(BuyProcessEvent.SENT_PAYMENT, walletBuyArguments)
                bus.emit(BuyProcessEvent.RECEIVED_TOKEN, walletBuyArguments, response.token)

                let channelFound = await this.channels.firstById(response.channelId)
                if (!channelFound) {
                  bus.emit(BuyProcessEvent.NO_CHANNEL_FOUND, walletBuyArguments)
                  bus.emit(BuyProcessEvent.OPENING_CHANNEL_STARTED, walletBuyArguments)

                  let newChannelMeta = {
                    channelId: response.channelId,
                    title: purchaseMeta.siteName,
                    host: purchaseMeta.origin,
                    icon: resource("/frame/styles/images/channel.png"),
                    openingTime: Date.now()
                  }
                  await this.channels.save(newChannelMeta)
                  let channelDescription = JSON.stringify({ channelId: response.channelId })
                  let transaction = transactions.openChannel(
                    "Opening of channel",
                    channelDescription,
                    account,
                    receiver,
                    channelValue ? channelValue : amount * 10
                  )
                  await this.transactions.addTransaction(transaction)
                  bus.emit(BuyProcessEvent.OPENING_CHANNEL_FINISHED, walletBuyArguments, newChannelMeta)
                } else {
                  bus.emit(BuyProcessEvent.CHANNEL_FOUND, walletBuyArguments, channelFound)
                }
                transaction.state = TransactionState.APPROVED
                await this.background.setLastMicropaymentTime(Date.now())
                resolve(response)
                bus.emit(BuyProcessEvent.SENT_TOKEN, walletBuyArguments, response.token)
              } catch (e) {
                reject(e)
              }
            })
            let rejectedEvent = events.txRejected(transaction.id)
            bus.once(rejectedEvent, () => {
              reject("Micropayment is rejected by the user")
            })
          })
        })
      })
      .catch((_error: Error) => {
        return { channelId: "", token: "" } as VynosBuyResponse
      })
  }

  listChannels(): Promise<Array<PaymentChannel>> {
    return new Promise((resolve, reject) => {
      this.background.awaitUnlock(async () => {
        try {
          const iohtee = await this.buildIohTee()
          if (!iohtee) {
            throw new Error("IohTee requires mnemonic in session. Restore wallet from seed phrase to enable micropayments.")
          }
          resolve(await iohtee.channels())
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  private checkGateway(gateway: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fetch(gateway, { method: "HEAD" })
        .then((response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve()
          } else {
            reject(`Unsuccessful response from gateway ${gateway}. Response status: ${response.status}`)
          }
        })
        .catch((error) => {
          console.error(`Gateway ${gateway} unavailable. Error: ${error}`)
          reject(`Gateway ${gateway} unavailable. Error: ${error}`)
        })
    })
  }

  private async approve(sharedState: SharedState, transaction: TransactionMeta, fn: () => void) {
    let interval = Date.now() - sharedState.lastMicropaymentTime
    let throttlingInMs = -1
    if (
      sharedState.preferences.micropaymentThrottlingHumanReadable === "-1ms" ||
      sharedState.preferences.micropaymentThrottlingHumanReadable === "0" ||
      sharedState.preferences.micropaymentThrottlingHumanReadable.length === 0
    ) {
      throttlingInMs = -1
    } else if (/^\d+$/.test(sharedState.preferences.micropaymentThrottlingHumanReadable)) {
      throttlingInMs = parseInt(sharedState.preferences.micropaymentThrottlingHumanReadable, 10)
    } else {
      throttlingInMs = timeparse(sharedState.preferences.micropaymentThrottlingHumanReadable)
    }

    const transactionAmount = this.asBigInt(transaction.amount)
    const micropaymentThreshold = this.asBigInt(sharedState.preferences.micropaymentThreshold)

    if ((transactionAmount > micropaymentThreshold || interval < throttlingInMs) && !isTokenContractDefined(transaction.tokenContract)) {
      transaction.state = TransactionState.PENDING
      await this.transactions.addTransaction(transaction)
      await this.transactions.store.dispatch(actions.setTransactionPending(true))
      bus.once(events.txApproved(transaction.id), fn)
    } else {
      await this.transactions.addTransaction(transaction)
      fn()
    }
  }

  private asBigInt(value: number | string | bigint): bigint {
    if (typeof value === "bigint") {
      return value
    }
    if (typeof value === "number") {
      return BigInt(Math.trunc(value))
    }
    if (value.startsWith("0x")) {
      return BigInt(value)
    }
    return BigInt(value || "0")
  }
}
