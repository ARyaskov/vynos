import BackgroundController from "./BackgroundController"
import { Payload } from "../../lib/Payload"
import { EndFunction } from "../../lib/StreamServer"
import { createPublicClient, custom, type PublicClient } from "viem"
import ProviderOptions from "./ProviderOptions"
import TransactionService from "../TransactionService"
import LocalRpcProvider, { type ProviderHooks } from "./LocalRpcProvider"
import { default as SettingStorage, NetworkSetting } from "../../lib/storage/SettingStorage"
import bus from "../../lib/bus"
import { CHANGE_NETWORK, CHANGE_NETWORK_FOR_MICROPAYMENT_CONTROLLER } from "../../lib/constants"

const settingStorage = new SettingStorage()

export default class NetworkController {
  background: BackgroundController
  provider: LocalRpcProvider | undefined
  publicClient: PublicClient | undefined
  transactions: TransactionService
  rpcUrl: string
  ready: Promise<NetworkSetting> | undefined

  constructor(backgroundController: BackgroundController, transactions: TransactionService) {
    this.background = backgroundController
    this.transactions = transactions
    this.publicClient = undefined
    this.provider = undefined
    this.rpcUrl = ""
    this.ready = undefined
    this.handler = this.handler.bind(this)
    this.getNetwork()

    bus.on(CHANGE_NETWORK, () => {
      this.getNetwork()
    })
  }

  handler(message: Payload, next: Function, end: EndFunction) {
    if (!message.method) {
      end(new Error("Invalid RPC payload: method is required"))
      return
    }
    const method = message.method
    const params = Array.isArray(message.params) ? message.params : []
    const id = message.id
    this.ready!.then((_network: NetworkSetting) => {
      this.provider!.sendAsync(
        {
          id,
          method,
          params
        },
        (error: Error | null, response) => {
          if (error) {
            end(error)
          } else {
            end(null, response as Payload)
          }
        }
      )
    })
  }

  providerOpts(rpcUrl: string): ProviderHooks {
    let providerOptions = new ProviderOptions(this.background, this.transactions, rpcUrl)
    return providerOptions.walled()
  }

  getNetwork() {
    this.ready = settingStorage.getNetwork().then((network: NetworkSetting) => {
      this.rpcUrl = network.value
      this.provider = new LocalRpcProvider(this.rpcUrl, this.providerOpts(this.rpcUrl))
      this.publicClient = createPublicClient({
        transport: custom(this.provider),
        pollingInterval: 3000
      })
      return Promise.resolve(network)
    })
    this.ready.then((network: NetworkSetting) => {
      bus.emit(CHANGE_NETWORK_FOR_MICROPAYMENT_CONTROLLER)
    })
  }

  getPublicClient(): PublicClient | undefined {
    return this.publicClient
  }
}
