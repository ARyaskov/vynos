import { createConfig } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { custom, type EIP1193Provider } from "viem"
import type StreamProvider from "../lib/StreamProvider"
import { vynosConnector } from "./vynosConnector"

export function createWagmiConfig(provider: StreamProvider) {
  const transport = custom(provider as unknown as EIP1193Provider)

  return createConfig({
    chains: [mainnet, sepolia],
    connectors: [vynosConnector(provider)],
    transports: {
      [mainnet.id]: transport,
      [sepolia.id]: transport
    }
  })
}
