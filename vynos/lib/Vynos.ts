import {PaymentChannel, PaymentChannelJSON} from "machinomy/lib/channel";
import Promise = require('bluebird')
import YnosPayInChannelResponse from "./VynosPayInChannelResponse";
import Web3 = require("web3")

export default interface Vynos {
  getAccount: () => Promise<string>
  openChannel: (receiverAccount: string, channelValue: BigNumber.BigNumber) => Promise<PaymentChannel>
  depositToChannel: (ch: PaymentChannel) => Promise<PaymentChannel>
  closeChannel: (ch: PaymentChannel) => Promise<PaymentChannel>;
  listChannels: () => Promise<Array<PaymentChannel>>;
  makePayment: () => void // web3.eth.sendTransaction
  payInChannel: (ch: PaymentChannel, amount: number, override?: boolean) => Promise<YnosPayInChannelResponse> // FIXME What about lifecycle events? Amount is bignumber, actually.
  initAccount: () => Promise<void>
  initFrame: (frame?: HTMLIFrameElement) => Promise<void>
  getWeb3(): Promise<Web3>
}