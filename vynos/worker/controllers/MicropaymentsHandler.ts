import MicropaymentsController from "./MicropaymentsController"
import { RequestPayload } from "../../lib/Payload"
import { EndFunction } from "../../lib/StreamServer"
import {
  BuyRequest,
  BuyResponse,
  CloseChannelRequest,
  CloseChannelResponse,
  ListChannelsRequest,
  ListChannelsResponse,
  OpenChannelRequest,
  OpenChannelResponse,
  SetApproveByIdRequest,
  SetApproveByIdResponse,
  SetRejectByIdRequest,
  SetRejectByIdResponse
} from "../../lib/rpc/yns"
import { PaymentChannelSerde } from "../../lib/paymentChannel"

export default class MicropaymentsHandler {
  controller: MicropaymentsController

  constructor(controller: MicropaymentsController) {
    this.controller = controller
    this.handler = this.handler.bind(this)
  }

  openChannel(message: OpenChannelRequest, next: Function, end: EndFunction) {
    let receiver = message.params[0]
    const amountRaw = Number(message.params[1])
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      end(new Error("Invalid channel amount"))
      return
    }
    const amount = Math.trunc(amountRaw)
    this.controller
      .openChannel(receiver, amount)
      .then((channel) => {
        let response: OpenChannelResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: [PaymentChannelSerde.serialize(channel)]
        }
        end(null, response)
      })
      .catch(end)
  }

  closeChannel(message: CloseChannelRequest, next: Function, end: EndFunction) {
    let channelId = message.params[0]
    this.controller
      .closeChannel(channelId)
      .then((channelId) => {
        let response: CloseChannelResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: [channelId]
        }
        end(null, response)
      })
      .catch(end)
  }

  listChannels(message: ListChannelsRequest, next: Function, end: EndFunction) {
    this.controller
      .listChannels()
      .then((channels) => {
        let response: ListChannelsResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: channels.map((pc) => PaymentChannelSerde.serialize(pc))
        }
        end(null, response)
      })
      .catch((error: unknown) => {
        const messageText = error instanceof Error ? error.message : String(error)
        if (messageText.includes("IohTee requires mnemonic in session")) {
          const response: ListChannelsResponse = {
            id: message.id,
            jsonrpc: message.jsonrpc,
            result: []
          }
          end(null, response)
          return
        }
        const errorObject = error instanceof Error ? error : new Error(String(error))
        end(errorObject)
      })
  }

  buy(message: BuyRequest, next: Function, end: EndFunction) {
    const receiver = message.params[0]
    const amount = message.params[1]
    const gateway = message.params[2]
    const meta = message.params[3]
    const purchaseMeta = message.params[4]
    const channelValue = message.params[5]
    const tokenContract = message.params[6]
    this.controller
      .buy(receiver, amount, gateway, meta, purchaseMeta, channelValue, tokenContract)
      .then((vynosBuyResponse) => {
        let response: BuyResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: [vynosBuyResponse]
        }
        end(null, response)
      })
      .catch(end)
  }

  setApproveById(message: SetApproveByIdRequest, next: Function, end: EndFunction) {
    let id = message.params[0]
    this.controller.transactions
      .setApproveById(id)
      .then(() => {
        let response: SetApproveByIdResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: null
        }
        end(null, response)
      })
      .catch(end)
  }

  setRejectById(message: SetRejectByIdRequest, next: Function, end: EndFunction) {
    let id = message.params[0]
    this.controller.transactions
      .setRejectById(id)
      .then(() => {
        let response: SetRejectByIdResponse = {
          id: message.id,
          jsonrpc: message.jsonrpc,
          result: null
        }
        end(null, response)
      })
      .catch(end)
  }

  handler(message: RequestPayload, next: Function, end: EndFunction) {
    if (OpenChannelRequest.match(message)) {
      this.openChannel(message, next, end)
    } else if (CloseChannelRequest.match(message)) {
      this.closeChannel(message, next, end)
    } else if (ListChannelsRequest.match(message)) {
      this.listChannels(message, next, end)
    } else if (BuyRequest.match(message)) {
      this.buy(message, next, end)
    } else if (SetApproveByIdRequest.match(message)) {
      this.setApproveById(message, next, end)
    } else if (SetRejectByIdRequest.match(message)) {
      this.setRejectById(message, next, end)
    } else {
      next()
    }
  }
}
