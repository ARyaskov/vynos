import { createAction } from "@reduxjs/toolkit"
import { type SharedState } from "../../worker/WorkerState"
import WorkerProxy from "../WorkerProxy"

export type SetSharedStateArgs = {
  sharedState: SharedState
}

export const setSharedState = createAction<SetSharedStateArgs>("frame/shared/setSharedState")
export const setPending = createAction<boolean>("frame/shared/setPending")
export const didAcceptTerms = createAction<boolean>("frame/temp/didAcceptTerms")
export const didReceiveMnemonic = createAction<string>("frame/temp/didReceiveMnemonic")
export const setWorkerProxy = createAction<WorkerProxy>("frame/temp/setWorkerProxy")
export const clearTempState = createAction<boolean>("frame/temp/clearTempState")
