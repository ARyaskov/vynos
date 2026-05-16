import BackgroundController from "./BackgroundController"
import TransactionService from "../TransactionService"
import { randomId } from "../../lib/Payload"
import * as transactions from "../../lib/transactions"
import { DISPLAY_REQUEST } from "../../lib/constants"
import bus from "../../lib/bus"
import { bytesToHex, type Hex, type TransactionSerializable, hexToBytes } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { type ProviderHooks, type RpcMessageParams, type RpcTxParams } from "./LocalRpcProvider"

export type ApproveTransactionCallback = (error: unknown, isApproved?: boolean) => void
export type ApproveSignCallback = (error: unknown, rawMsgSig?: string) => void
export type SignTxCallback = (error: unknown, rawTx?: string) => void

function toBigIntOrUndefined(value: unknown): bigint | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  if (typeof value === "bigint") {
    return value
  }
  if (typeof value === "number") {
    return BigInt(value)
  }
  if (typeof value === "string") {
    return value.startsWith("0x") ? BigInt(value) : BigInt(value)
  }
  return undefined
}

export default class ProviderOptions {
  background: BackgroundController
  rpcUrl: string
  transactions: TransactionService

  constructor(background: BackgroundController, transactions: TransactionService, rpcUrl: string) {
    this.background = background
    this.transactions = transactions
    this.rpcUrl = rpcUrl
  }

  getAccounts(callback: (err: unknown, accounts?: Array<string>) => void) {
    this.background
      .getAccounts()
      .then((accounts) => {
        callback(null, accounts)
      })
      .catch((error) => {
        callback(error)
      })
  }

  approveTransaction(txParams: RpcTxParams, callback: ApproveTransactionCallback) {
    const gas = Number(txParams.gas ?? txParams.gasLimit ?? 0)
    const gasPrice = Number(txParams.gasPrice ?? 0)
    const fee = gas * gasPrice
    const amount = Number(txParams.value ?? 0)
    const transaction = transactions.ethereum(randomId().toString(), txParams.to || "", amount, fee)
    this.transactions
      .approveTransaction(transaction)
      .then((result) => {
        if (result) {
          callback(null, result)
        } else {
          callback("Vynos: User rejected transaction")
        }
      })
      .catch((error) => {
        callback(error.message)
      })
  }

  approveTransactionAlways(_txParams: RpcTxParams, callback: ApproveTransactionCallback) {
    callback(null, true)
  }

  signTransaction(rawTx: RpcTxParams, callback: SignTxCallback) {
    this.background
      .getPrivateKey()
      .then((privateKey) => {
        const privateKeyHex = bytesToHex(privateKey) as Hex
        const account = privateKeyToAccount(privateKeyHex)
        const txRequest = {
          to: rawTx.to as Hex | undefined,
          nonce: toBigIntOrUndefined(rawTx.nonce),
          gas: toBigIntOrUndefined(rawTx.gas ?? rawTx.gasLimit),
          gasPrice: toBigIntOrUndefined(rawTx.gasPrice),
          value: toBigIntOrUndefined(rawTx.value),
          data: rawTx.data as Hex | undefined,
          chainId: rawTx.chainId !== undefined ? Number(rawTx.chainId) : undefined
        }
        account
          .signTransaction(txRequest as TransactionSerializable)
          .then((txHex) => {
            callback(null, txHex)
          })
          .catch((error: Error) => {
            callback(error.message)
          })
      })
      .catch((error) => {
        callback(error.message)
      })
  }

  signMessageAlways(messageParams: RpcMessageParams, callback: ApproveSignCallback) {
    this.background
      .getPrivateKey()
      .then((privateKey) => {
        const privateKeyHex = bytesToHex(privateKey) as Hex
        const account = privateKeyToAccount(privateKeyHex)
        account
          .signMessage({ message: { raw: hexToBytes(messageParams.data as Hex) } })
          .then((signature) => {
            callback(null, signature)
          })
          .catch((error: Error) => {
            callback(error.message)
          })
      })
      .catch((error) => {
        callback(error.message)
      })
  }

  signMessage(messageParams: RpcMessageParams, callback: ApproveSignCallback) {
    if (typeof messageParams.data === "string" && !messageParams.data.startsWith("0x")) {
      callback(new Error("Vynos signMessage: message data must be 32 byte hex string"))
      return
    }

    let matchArray = messageParams.data.substring(2).match(/[0-9A-Fa-f]+/g)
    if (!matchArray || matchArray.length > 1 || matchArray[0].length !== messageParams.data.substring(2).length) {
      callback(new Error("Vynos signMessage: message data must be 32 byte hex string"))
      return
    }

    if (messageParams.data.length - "0x".length < 32) {
      callback(new Error("Vynos signMessage: message data must be 32 byte hex string"))
      return
    }

    bus.emit(DISPLAY_REQUEST, true)
    const transaction = transactions.signature(messageParams.from, messageParams.data)
    this.transactions
      .approveTransaction(transaction)
      .then((result) => {
        if (result) {
          this.signMessageAlways(messageParams, callback)
        } else {
          callback(new Error("Vynos: User rejected sign"))
        }
      })
      .catch((error) => {
        callback(error.message)
      })
  }

  walled(): ProviderHooks {
    return {
      static: {
        eth_syncing: false,
        clientVersion: `LiteratePayments/v${1.0}`
      },
      rpcUrl: this.rpcUrl,
      getAccounts: this.getAccounts.bind(this),
      approveTransaction: this.approveTransaction.bind(this),
      signTransaction: this.signTransaction.bind(this),
      signMessage: this.signMessage.bind(this)
      // tx signing, newUnapprovedTransaction
      // processTransaction: processTransaction,
      // old style msg signing, newUnsignedMessage
      // processMessage: processMessage,
      // new style msg signing, newUnsignedPersonalMessage
      // processPersonalMessage: processPersonalMessage,
    }
  }

  approving(): ProviderHooks {
    return {
      static: {
        eth_syncing: false,
        clientVersion: `LiteratePayments/v${1.0}`
      },
      rpcUrl: this.rpcUrl,
      getAccounts: this.getAccounts.bind(this),
      approveTransaction: this.approveTransactionAlways.bind(this),
      signTransaction: this.signTransaction.bind(this),
      signMessage: this.signMessageAlways.bind(this)
      // tx signing, newUnapprovedTransaction
      // processTransaction: processTransaction,
      // old style msg signing, newUnsignedMessage
      // processMessage: processMessage,
      // new style msg signing, newUnsignedPersonalMessage
      // processPersonalMessage: processPersonalMessage,
    }
  }
}
