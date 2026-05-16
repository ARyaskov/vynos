import { isAddress, keccak256, parseEther, stringToHex } from "viem"
import VynosBuyResponse from "../vynos/lib/VynosBuyResponse"
import { WalletBuyArguments } from "../vynos/lib/Vynos"
import { BuyProcessEvent } from "../vynos/lib/rpc/buyProcessEventBroadcast"
import { ChannelMeta } from "../vynos/lib/storage/ChannelMetaStorage"
import IWalletWindow from "../vynos/lib/IWalletWindow"
import Setup from "../vynos/embed/Setup"
import Wallet from "../vynos/embed/Wallet"
import MockingIWalletWindow from "./lib/MockingIWalletWindow"
import MockingWallet from "./embed/MockingWallet"
import MockingSetup from "./embed/MockingSetup"
import MockingVynos from "./lib/MockingVynos"

let _window = window as unknown as IWalletWindow
let _mockingWindow = window as unknown as MockingIWalletWindow

function buildEmbedScriptElement(): HTMLScriptElement {
  const script = document.createElement("script")
  script.src = new URL("/vynos.js", window.location.origin).toString()
  return script
}

function ensureWalletBindings(): void {
  if (!_window.vynos) {
    const setup = new Setup(buildEmbedScriptElement(), window)
    const wallet = new Wallet(setup.client(), setup.frame())
    _window.vynos = wallet
    _window.wallet = wallet
  }

  if (!_mockingWindow.mockingVynos) {
    const mockingSetup = new MockingSetup(buildEmbedScriptElement(), window)
    const mockingWallet = new MockingWallet(mockingSetup.client(), mockingSetup.frame())
    _mockingWindow.mockingVynos = mockingWallet
    _mockingWindow.mockingWallet = mockingWallet
  }
}

let recentBuyResponse: VynosBuyResponse | null = null

let gateway = `http://127.0.0.1:3030/payments/accept`

function updateRecentVynosBuyResponse(buyResponse: VynosBuyResponse) {
  recentBuyResponse = buyResponse
  let channelCode = document.getElementById("payment-channel-code")
  let tokenCode = document.getElementById("payment-token-code")
  if (channelCode) {
    channelCode.textContent = "channelId: " + JSON.stringify(buyResponse.channelId)
  }
  if (tokenCode) {
    tokenCode.textContent = "token: " + JSON.stringify(buyResponse.token)
  }
}

let signMessage = function (message: string) {
  if (message === undefined || message === null) {
    message = ""
  }
  let vynos = _window.vynos
  vynos.ready().then(async (wallet) => {
    try {
      const accounts = await wallet.provider.request<string[]>({ method: "eth_accounts" })
      const account = accounts?.[0]
      if (!account || !isAddress(account)) {
        console.error("No account available")
        return
      }
      const hash = keccak256(stringToHex(message))
      try {
        const signature = await wallet.provider.request<string>({
          method: "eth_sign",
          params: [account, hash]
        })
        console.log(signature)
      } catch {
        const signature = await wallet.provider.request<string>({
          method: "personal_sign",
          params: [hash, account]
        })
        console.log(signature)
      }
    } catch (error) {
      console.error(error)
    }
  })
}

let doUnsafeRequestsFromClient = () => {
  let _window = window as unknown as MockingIWalletWindow
  let vynos = _window.mockingVynos
  vynos.ready().then((instance: MockingVynos) => {
    // Intentionally do some evil
    instance.getPrivateKey().then((response) => {})
    instance.clearAccountInfo().then(() => {})
    instance.clearChannelMetastorage().then(() => {})
    instance.clearChannelStorage().then(() => {})
    instance.clearReduxPersistentStorage().then(() => {})
    instance.clearTransactionMetastorage().then(() => {})
  })
}

window.addEventListener("load", function () {
  ensureWalletBindings()
  let vynos = _window.vynos

  vynos.ready().then((instance) => {
    let provider = instance.provider
    void provider
  })

  let displayButton = document.getElementById("display")
  if (displayButton) {
    displayButton.onclick = () => {
      vynos.display()
    }
  }

  /*
  ynos.initFrame().then(() => {
    return ynos.initAccount()
  }).then(() => {
    return ynos.getAccount()
  }).then(address => {
    let span = document.getElementById('account_address')
    if (span) {
      let p = span
      let a = document.createElement('a')
      a.href = 'https://ropsten.etherscan.io/address/' + address.replace(/0x/, '')
      a.text = address
      let arr: Array<HTMLElement> = [].slice.call(p.childNodes);
      arr.forEach(element => {
        p.removeChild(element)
      })
      p.appendChild(a)
    }
  }).catch(error => {
    console.log(error)
  })
  */

  let openChannelForm = document.getElementById("open_channel")
  if (openChannelForm) {
    openChannelForm.onsubmit = function (ev: Event) {
      ev.preventDefault()
      vynos.ready().then((wallet) => {
        let receiverAccount = ""
        let receiverInput = document.getElementById("receiver_address")
        if (receiverInput) {
          receiverAccount = (receiverInput as HTMLInputElement).value
        }
        console.log(receiverAccount)
        const amount = Number.parseInt(parseEther("0.0001").toString(), 10)
        let resultSpan = document.getElementById("open_channel_id")
        if (resultSpan) {
          resultSpan.textContent = "Loading..."
        }
        wallet
          .buyPromised(receiverAccount!, amount, gateway, Date.now().toString())
          .on(BuyProcessEvent.SENT_PAYMENT, (args: WalletBuyArguments) => {
            console.log("on BuyProcessEvent.SENT_PAYMENT")
          })
          .on(BuyProcessEvent.RECEIVED_TOKEN, (_args: WalletBuyArguments, tokenOrChannelId?: string | ChannelMeta) => {
            if (typeof tokenOrChannelId === "string") {
              console.log("on BuyProcessEvent.RECEIVED_TOKEN. Token is " + tokenOrChannelId)
            }
          })
          .on(BuyProcessEvent.OPENING_CHANNEL_FINISHED, (_args: WalletBuyArguments, tokenOrChannelId?: string | ChannelMeta) => {
            if (!tokenOrChannelId || typeof tokenOrChannelId === "string") {
              return
            }
            console.log("on BuyProcessEvent.OPENING_CHANNEL_FINISHED. Channel meta is ")
            console.log(tokenOrChannelId)
          })
          .result.then((buyResponse: VynosBuyResponse) => {
            console.log(buyResponse)
            updateRecentVynosBuyResponse(buyResponse)
            let resultSpan = document.getElementById("open_channel_id")
            if (resultSpan) {
              resultSpan.textContent = recentBuyResponse!.channelId
            }
          })
          .catch((error: Error) => {
            if (error) {
              console.dir(error)
            }
          })
      })
    }
  }

  let openChannelTokensForm = document.getElementById("open_channel_tokens")
  if (openChannelTokensForm) {
    openChannelTokensForm.onsubmit = function (ev: Event) {
      ev.preventDefault()
      vynos.ready().then((wallet) => {
        let tokenContractAddress = ""
        let tokenContractAddressInput = document.getElementById("token_contract_address")
        if (tokenContractAddressInput) {
          tokenContractAddress = (tokenContractAddressInput as HTMLInputElement).value
        }

        let tokenReceiverAddress = ""
        let tokenReceiverAddressInput = document.getElementById("token_receiver_address")
        if (tokenReceiverAddressInput) {
          tokenReceiverAddress = (tokenReceiverAddressInput as HTMLInputElement).value
        }
        console.log(`tokenContractAddress = ${tokenContractAddress}`)
        console.log(`tokenReceiverAddress = ${tokenReceiverAddress}`)
        let amount = 5
        let resultSpan = document.getElementById("open_channel_id_tokens")
        if (resultSpan) {
          resultSpan.textContent = "Loading..."
        }
        wallet
          .buyPromised(tokenReceiverAddress!, amount, gateway, Date.now().toString(), undefined, undefined, tokenContractAddress)
          .on(BuyProcessEvent.SENT_PAYMENT, (args: WalletBuyArguments) => {
            console.log("on BuyProcessEvent.SENT_PAYMENT")
          })
          .on(BuyProcessEvent.RECEIVED_TOKEN, (_args: WalletBuyArguments, tokenOrChannelId?: string | ChannelMeta) => {
            if (typeof tokenOrChannelId === "string") {
              console.log("on BuyProcessEvent.RECEIVED_TOKEN. Token is " + tokenOrChannelId)
            }
          })
          .on(BuyProcessEvent.OPENING_CHANNEL_FINISHED, (_args: WalletBuyArguments, tokenOrChannelId?: string | ChannelMeta) => {
            if (!tokenOrChannelId || typeof tokenOrChannelId === "string") {
              return
            }
            console.log("on BuyProcessEvent.OPENING_CHANNEL_FINISHED. Channel meta is ")
            console.log(tokenOrChannelId)
          })
          .result.then((buyResponse: VynosBuyResponse) => {
            console.log(buyResponse)
            recentBuyResponse = buyResponse
            let channelCode = document.getElementById("payment-channel-code-tokens")
            let tokenCode = document.getElementById("payment-token-code-tokens")
            if (channelCode) {
              channelCode.textContent = "channelId: " + JSON.stringify(buyResponse.channelId)
            }
            if (tokenCode) {
              tokenCode.textContent = "token: " + JSON.stringify(buyResponse.token)
            }
            let resultSpan = document.getElementById("open_channel_id_tokens")
            if (resultSpan) {
              resultSpan.textContent = recentBuyResponse!.channelId
            }
          })
          .catch((error: Error) => {
            if (error) {
              console.dir(error)
            }
          })
      })
    }
  }

  let closeChannelForm = document.getElementById("close_channel")
  if (closeChannelForm) {
    closeChannelForm.onsubmit = function (ev: Event) {
      ev.preventDefault()
      vynos.ready().then((wallet) => {
        if (recentBuyResponse) {
          wallet.closeChannel(recentBuyResponse!.channelId).then(() => {
            console.log("Closing channel:")
            console.log(recentBuyResponse!.channelId)
            let resultSpan = document.getElementById("open_channel_id")
            if (resultSpan) {
              resultSpan.textContent = "n/a"
            }
          })
        }
      })
    }
  }
  let signMessageForm = document.getElementById("sign_message_form")
  if (signMessageForm) {
    signMessageForm.onsubmit = function (ev: Event) {
      ev.preventDefault()
      let messageElement = document.getElementById("sign_message_input") as HTMLInputElement
      if (messageElement) {
        signMessage(messageElement.value)
      }
    }
  }

  let testUnsafeRequestsForm = document.getElementById("test_unsafe_requests_form")
  if (testUnsafeRequestsForm) {
    testUnsafeRequestsForm.onsubmit = function (ev: Event) {
      ev.preventDefault()
      doUnsafeRequestsFromClient()
    }
  }
})
