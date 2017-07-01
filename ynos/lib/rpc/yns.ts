import {JSONRPC, randomId, RequestPayload, ResponsePayload} from "../Payload"
import {SharedState} from "../../worker/State";

export class InitAccountRequest implements RequestPayload {
  id: number;
  jsonrpc: typeof JSONRPC;
  method: typeof InitAccountRequest.method;
  params: any[];

  static method = "yns_initAccount"

  constructor() {
    this.id = randomId()
    this.method = InitAccountRequest.method
    this.jsonrpc = JSONRPC
    this.params = []
  }
}

export interface InitAccountResponse extends ResponsePayload {
  params: string[]
}

export class GetSharedStateRequest implements RequestPayload {
  id: number;
  jsonrpc: typeof JSONRPC;
  method: typeof GetSharedStateRequest.method;
  params: any[];

  static method: string = "yns_getSharedState"

  static match(payload: RequestPayload): payload is GetSharedStateRequest {
    return payload.method === GetSharedStateRequest.method
  }
}

export interface GetSharedStateResponse extends ResponsePayload {
  result: SharedState
}

export class DidStoreMnemonicRequest implements RequestPayload {
  id: number;
  jsonrpc: typeof JSONRPC;
  method: typeof DidStoreMnemonicRequest.method;
  params: any[];

  static method: string = "yns_didStoreMnemonic"

  static match(payload: RequestPayload): payload is DidStoreMnemonicRequest {
    return payload.method === DidStoreMnemonicRequest.method
  }
}

export interface DidStoreMnemonicResponse extends ResponsePayload {
  result: null
}

export class SetPageRequest implements RequestPayload {
  id: number;
  jsonrpc: typeof JSONRPC;
  method: typeof SetPageRequest.method;
  params: any;

  static method = "yns_setPageRequest"

  static match(payload: RequestPayload): payload is SetPageRequest {
    return payload.method === SetPageRequest.method
  }
}

export interface SetPageResponse extends ResponsePayload {
  result: SharedState
}

export class GenKeyringRequest implements RequestPayload {
  id: number;
  jsonrpc: typeof JSONRPC;
  method: typeof SetPageRequest.method;
  params: string[];

  static method = "yns_genKeyring"

  static match(payload: RequestPayload): payload is GenKeyringRequest {
    return payload.method === GenKeyringRequest.method
  }
}

export interface GenKeyringResponse extends ResponsePayload {
  result: string
}
