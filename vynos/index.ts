import Wallet from "./embed/Wallet"
import Setup from "./embed/Setup"
import IWalletWindow from "./lib/IWalletWindow"

const currentScript = document.currentScript instanceof HTMLScriptElement ? document.currentScript : null
let setup = new Setup(currentScript, window)
let wallet = new Wallet(setup.client(), setup.frame())

let w = window as unknown as IWalletWindow
if (w && !w.vynos) {
  w.vynos = wallet
}

export { WalletBuyArguments } from "./lib/Vynos"
export { BuyProcessEvent } from "./lib/rpc/buyProcessEventBroadcast"
export type { ChannelMeta } from "./lib/storage/ChannelMetaStorage"
export { default as PromisedWalletResponse } from "./lib/promised"
export type { default as VynosBuyResponse } from "./lib/VynosBuyResponse"

export default wallet
