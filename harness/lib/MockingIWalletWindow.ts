import { default as MockingWallet } from "../embed/MockingWallet"

export default interface MockingIWalletWindow extends Window {
  mockingVynos: MockingWallet
  mockingWallet: MockingWallet
  showVynosNotification: (text: string, time?: number) => void
}
