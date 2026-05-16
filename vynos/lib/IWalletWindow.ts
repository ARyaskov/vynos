import Wallet from "../embed/Wallet"

export default interface IWalletWindow extends Window {
  vynos: Wallet
  wallet: Wallet
  showVynosNotification: (text: string, time?: number) => void
}
