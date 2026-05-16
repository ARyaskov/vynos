import { createConnector } from "wagmi"
import { getAddress, type Address, type EIP1193Provider, type ProviderRpcError } from "viem"
import type StreamProvider from "../lib/StreamProvider"

function parseChainId(hexChainId: string): number {
  return Number.parseInt(hexChainId, 16)
}

type ConnectResult<withCapabilities extends boolean = false> = {
  accounts: withCapabilities extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[]
  chainId: number
}

async function requestRpc<T>(provider: EIP1193Provider, method: string, params?: unknown[]): Promise<T> {
  const requestProvider = provider as unknown as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
  return requestProvider.request({ method, params }) as Promise<T>
}

export function vynosConnector(provider: StreamProvider) {
  return createConnector<EIP1193Provider>((config) => ({
    id: "vynos",
    name: "Vynos",
    type: "vynos",

    async connect<withCapabilities extends boolean = false>({
      withCapabilities = false
    }: {
      withCapabilities?: withCapabilities | boolean | undefined
    } = {}): Promise<ConnectResult<withCapabilities>> {
      const accounts = await this.getAccounts()
      const chainId = await this.getChainId()
      if (accounts.length === 0) {
        throw new Error("No available account in Vynos provider")
      }
      if (withCapabilities) {
        return {
          accounts: accounts.map((address) => ({ address, capabilities: {} })),
          chainId
        } as unknown as ConnectResult<withCapabilities>
      }
      return { accounts, chainId } as unknown as ConnectResult<withCapabilities>
    },

    async disconnect() {
      // Session lifecycle is managed by Vynos itself.
    },

    async getAccounts() {
      const ethProvider = await this.getProvider()
      const accounts = await requestRpc<string[]>(ethProvider, "eth_accounts")
      return accounts.map((address: string) => getAddress(address))
    },

    async getChainId() {
      const ethProvider = await this.getProvider()
      const chainIdHex = await requestRpc<string>(ethProvider, "eth_chainId")
      return parseChainId(chainIdHex)
    },

    async getProvider(): Promise<EIP1193Provider> {
      return provider as unknown as EIP1193Provider
    },

    async isAuthorized() {
      const accounts = await this.getAccounts()
      return accounts.length > 0
    },

    async switchChain({ chainId }) {
      const ethProvider = await this.getProvider()
      await requestRpc<unknown>(ethProvider, "wallet_switchEthereumChain", [{ chainId: `0x${chainId.toString(16)}` }])
      const chain = config.chains.find((c) => c.id === chainId)
      if (!chain) {
        throw new Error(`Unsupported chain ${chainId}`)
      }
      return chain
    },

    onAccountsChanged(accounts) {
      if (!accounts.length) {
        this.onDisconnect()
        return
      }
      config.emitter.emit("change", { accounts: accounts.map((address) => getAddress(address)) })
    },

    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: parseChainId(chainId) })
    },

    onDisconnect(error?: Error) {
      const rpcError = error as ProviderRpcError | undefined
      if (rpcError && rpcError.code === 1013) {
        return
      }
      config.emitter.emit("disconnect")
    }
  }))
}
