import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface MenuState {
  topmenu: {
    currentMenuItem: string
    submenuShowState: string
  }
}

const initialState: MenuState = {
  topmenu: {
    currentMenuItem: "Wallet",
    submenuShowState: ""
  }
}

const menuSlice = createSlice({
  name: "frame/menu",
  initialState,
  reducers: {
    setCurrentMenuItem(state, action: PayloadAction<string>) {
      state.topmenu.currentMenuItem = action.payload
    },
    setSubmenuShowState(state, action: PayloadAction<string>) {
      state.topmenu.submenuShowState = action.payload
    }
  }
})

export const { setCurrentMenuItem, setSubmenuShowState } = menuSlice.actions

export const topmenu = menuSlice.reducer
