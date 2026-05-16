import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface WelcomePopupState {
  welcomePopupState: string
}

const initialState: WelcomePopupState = {
  welcomePopupState: "is-active"
}

const welcomeSlice = createSlice({
  name: "frame/welcome",
  initialState,
  reducers: {
    setWelcomePopupState(state, action: PayloadAction<string>) {
      state.welcomePopupState = action.payload
    }
  }
})

export const { setWelcomePopupState } = welcomeSlice.actions
export const welcome = welcomeSlice.reducer
