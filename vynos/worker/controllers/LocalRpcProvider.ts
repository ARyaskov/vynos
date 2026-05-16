type JsonRpcPayload = {
  id: number
  jsonrpc: string
  method: string
  params: unknown[]
}

type JsonRpcResponse<T = unknown> = {
  id: number
  jsonrpc: string
  result?: T
  error?: { message?: string }
}

export type RpcTxParams = {
  to?: `0x${string}`
  from?: `0x${string}`
  value?: string | number | bigint
  gas?: string | number | bigint
  gasLimit?: string | number | bigint
  gasPrice?: string | number | bigint
  nonce?: string | number | bigint
  data?: `0x${string}`
  chainId?: string | number
}

export type RpcMessageParams = {
  from: string
  data: string
}

type RpcPayloadLike = {
  id?: number | string
  method: string
  params?: unknown[]
}

export type ProviderHooks = {
  rpcUrl?: string
  static?: {
    eth_syncing?: boolean
    clientVersion?: string
  }
  getAccounts: (callback: (err: unknown, accounts?: Array<string>) => void) => void
  approveTransaction: (txParams: RpcTxParams, callback: (error: unknown, isApproved?: boolean) => void) => void
  signTransaction: (rawTx: RpcTxParams, callback: (error: unknown, rawTx?: string) => void) => void
  signMessage: (messageParams: RpcMessageParams, callback: (error: unknown, rawMsgSig?: string) => void) => void
}

export default class LocalRpcProvider {
  private readonly rpcUrl: string
  private readonly hooks: ProviderHooks

  constructor(rpcUrl: string, hooks: ProviderHooks) {
    this.rpcUrl = rpcUrl
    this.hooks = hooks
  }

  request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    return this.handleRpc(args.method, args.params || [], Date.now())
  }

  sendAsync(payload: RpcPayloadLike, callback: (error: Error | null, response?: JsonRpcResponse) => void) {
    const id = typeof payload?.id === "number" ? payload.id : Date.now()
    this.handleRpc(payload.method, payload.params || [], id)
      .then((result) => {
        callback(null, {
          id,
          jsonrpc: "2.0",
          result
        })
      })
      .catch((error) => callback(error as Error))
  }

  private async handleRpc(method: string, params: unknown[], id: number): Promise<unknown> {
    if (method === "eth_syncing" && this.hooks.static && this.hooks.static.eth_syncing !== undefined) {
      return this.hooks.static.eth_syncing
    }
    if (method === "web3_clientVersion" && this.hooks.static) {
      return this.hooks.static.clientVersion || ""
    }

    if (method === "eth_accounts") {
      return new Promise<string[]>((resolve, reject) => {
        this.hooks.getAccounts((error, accounts) => {
          if (error) {
            reject(error)
            return
          }
          resolve(accounts || [])
        })
      })
    }

    if (method === "eth_sendTransaction") {
      const txParams = (params[0] || {}) as RpcTxParams
      const isApproved = await new Promise<boolean>((resolve, reject) => {
        this.hooks.approveTransaction(txParams, (error, approved) => {
          if (error) {
            reject(new Error(String(error)))
            return
          }
          resolve(!!approved)
        })
      })
      if (!isApproved) {
        throw new Error("Vynos: User rejected transaction")
      }
      const rawTx = await new Promise<string>((resolve, reject) => {
        this.hooks.signTransaction(txParams, (error, signedTx) => {
          if (error || !signedTx) {
            reject(new Error(String(error || "Could not sign transaction")))
            return
          }
          resolve(signedTx)
        })
      })
      return this.rpc("eth_sendRawTransaction", [rawTx], id)
    }

    if (method === "eth_sign") {
      const from = String(params[0] || "")
      const data = String(params[1] || "")
      return new Promise<string>((resolve, reject) => {
        this.hooks.signMessage({ from, data }, (error, signature) => {
          if (error || !signature) {
            reject(new Error(String(error || "Could not sign message")))
            return
          }
          resolve(signature)
        })
      })
    }

    if (method === "personal_sign") {
      const data = String(params[0] || "")
      const from = String(params[1] || "")
      return new Promise<string>((resolve, reject) => {
        this.hooks.signMessage({ from, data }, (error, signature) => {
          if (error || !signature) {
            reject(new Error(String(error || "Could not sign message")))
            return
          }
          resolve(signature)
        })
      })
    }

    return this.rpc(method, params, id)
  }

  private async rpc(method: string, params: unknown[], id: number): Promise<unknown> {
    const payload: JsonRpcPayload = {
      id,
      jsonrpc: "2.0",
      method,
      params
    }

    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })

    const json = (await response.json()) as JsonRpcResponse
    if (json.error) {
      throw new Error(json.error.message || `RPC ${method} failed`)
    }
    return json.result
  }
}
