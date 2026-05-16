import { INITIAL_SHARED_STATE, SharedState } from "../../worker/WorkerState"
import WorkerProxy from "../WorkerProxy"
import { MenuState } from "./menu"

export interface InitPageState {
  didAcceptTerms: boolean
  mnemonic: string | null
}

export interface TempState {
  workerProxy: WorkerProxy
  initPage: InitPageState
}

export interface FrameState {
  temp: TempState
  shared: SharedState
  menu: MenuState
}

export function initialState(workerProxy: WorkerProxy): FrameState {
  return {
    temp: {
      initPage: {
        didAcceptTerms: false,
        mnemonic: null
      },
      workerProxy: workerProxy
    },
    shared: INITIAL_SHARED_STATE,
    menu: {
      topmenu: {
        currentMenuItem: "Wallet",
        submenuShowState: ""
      }
    }
  }
}
