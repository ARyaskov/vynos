import StreamProvider from "../lib/StreamProvider"
import TinyEmitter from "../lib/TinyEmitter"
import { SharedState, Preferences } from "../worker/WorkerState"
import { JSONRPC, randomId } from "../lib/Payload"
import { isSharedStateBroadcast, SharedStateBroadcastType } from "../lib/rpc/SharedStateBroadcast"
import {
  DidStoreMnemonicRequest,
  GenKeyringRequest,
  GenKeyringResponse,
  GetSharedStateRequest,
  GetSharedStateResponse,
  LockWalletRequest,
  RestoreWalletRequest,
  RestoreWalletResponse,
  RememberPageRequest,
  UnlockWalletRequest,
  UnlockWalletResponse,
  TransactonResolved,
  ChangeNetworkRequest,
  GetPrivateKeyHexRequest,
  GetPrivateKeyHexResponse,
  SetPreferencesRequest,
  SetApproveByIdRequest,
  SetRejectByIdRequest,
  ClearTransactionMetastorageRequest,
  ClearReduxPersistentStorageRequest,
  ClearChannelMetastorageRequest,
  CloseChannelRequest,
  ListChannelsRequest,
  ListChannelsResponse,
  ClearChannelStorageRequest,
  ClearAccountInfoRequest
} from "../lib/rpc/yns"
import { type Action } from "@reduxjs/toolkit"
import { PaymentChannel, PaymentChannelSerde } from "../lib/paymentChannel"

const REQUEST_TIMEOUT_MS = 30000

export default class WorkerProxy extends TinyEmitter {
  provider: StreamProvider

  constructor() {
    super()
    this.provider = new StreamProvider("WorkerProxy")
    this.provider.listen(SharedStateBroadcastType, (data) => {
      if (data && typeof data === "object" && isSharedStateBroadcast(data as object)) {
        this.emit(SharedStateBroadcastType, data)
      }
    })
  }

  doLock(): Promise<void> {
    let request: LockWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: LockWalletRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  doUnlock(password: string): Promise<string | undefined> {
    let request: UnlockWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: UnlockWalletRequest.method,
      params: [password]
    }
    return this.provider.ask<UnlockWalletRequest, UnlockWalletResponse>(request).then((response) => {
      return response.error
    })
  }

  genKeyring(password: string): Promise<string> {
    let request: GenKeyringRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: GenKeyringRequest.method,
      params: [password]
    }
    return this.provider.ask<GenKeyringRequest, GenKeyringResponse>(request, REQUEST_TIMEOUT_MS).then((response) => {
      return response.result
    })
  }

  restoreWallet(password: string, type: string, value: string): Promise<string> {
    let request: RestoreWalletRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: RestoreWalletRequest.method,
      params: [password, type, value]
    }
    return this.provider.ask<RestoreWalletRequest, RestoreWalletResponse>(request, REQUEST_TIMEOUT_MS).then((response) => {
      return response.result
    })
  }

  getSharedState(): Promise<SharedState> {
    let request: GetSharedStateRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: GetSharedStateRequest.method,
      params: []
    }
    return this.provider.ask<GetSharedStateRequest, GetSharedStateResponse>(request).then((response) => {
      return response.result
    })
  }

  didStoreMnemonic(): Promise<void> {
    let request: DidStoreMnemonicRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: DidStoreMnemonicRequest.method,
      params: []
    }
    return this.provider.ask(request, REQUEST_TIMEOUT_MS).then(() => {
      return
    })
  }

  rememberPage(path: string): void {
    let request: RememberPageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: RememberPageRequest.method,
      params: [path]
    }
    this.provider.ask(request).then(() => {
      // Do Nothing
    })
  }

  resolveTransaction(): void {
    let request: TransactonResolved = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: TransactonResolved.method,
      params: []
    }
    this.provider.ask(request).then(() => {
      // Do Nothing
    })
  }

  getPrivateKeyHex(): Promise<string> {
    let request: GetPrivateKeyHexRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: GetPrivateKeyHexRequest.method,
      params: []
    }
    return this.provider.ask<GetPrivateKeyHexRequest, GetPrivateKeyHexResponse>(request).then((response) => {
      return response.result
    })
  }

  dispatch<A extends Action>(action: A) {
    console.warn("WorkerProxy#dispatch", action)
  }

  changeNetwork(): Promise<void> {
    let request: ChangeNetworkRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ChangeNetworkRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  setPreferences(preferences: Preferences): Promise<void> {
    let request: SetPreferencesRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: SetPreferencesRequest.method,
      params: [preferences]
    }

    return this.provider.ask(request).then(() => {
      return
    })
  }

  setApproveById(id: string): void {
    let request: SetApproveByIdRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: SetApproveByIdRequest.method,
      params: [id]
    }
    this.provider.ask(request).then(() => {
      // Do Nothing
    })
  }

  setRejectById(id: string): void {
    let request: SetRejectByIdRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: SetRejectByIdRequest.method,
      params: [id]
    }
    this.provider.ask(request).then(() => {
      // Do Nothing
    })
  }

  clearTransactionMetastorage(): Promise<void> {
    let request: ClearTransactionMetastorageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ClearTransactionMetastorageRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  clearChannelMetastorage(): Promise<void> {
    let request: ClearChannelMetastorageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ClearChannelMetastorageRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  clearReduxPersistentStorage(): Promise<void> {
    let request: ClearReduxPersistentStorageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ClearReduxPersistentStorageRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  clearChannelStorage(): Promise<void> {
    let request: ClearChannelStorageRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ClearChannelStorageRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  clearAccountInfo(): Promise<void> {
    let request: ClearAccountInfoRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ClearAccountInfoRequest.method,
      params: []
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  closeChannel(channelId: string): Promise<void> {
    let request: CloseChannelRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: CloseChannelRequest.method,
      params: [channelId]
    }
    return this.provider.ask(request).then(() => {
      return
    })
  }

  listChannels(): Promise<Array<PaymentChannel>> {
    let request: ListChannelsRequest = {
      id: randomId(),
      jsonrpc: JSONRPC,
      method: ListChannelsRequest.method,
      params: []
    }
    return this.provider
      .ask<ListChannelsRequest, ListChannelsResponse>(request)
      .then((response) => {
        const serializedChannels = Array.isArray(response?.result) ? response.result : []
        return serializedChannels.map((pc) => PaymentChannelSerde.deserialize(pc))
      })
      .catch((_error: unknown) => {
        return []
      })
  }
}
