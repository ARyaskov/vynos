import * as React from "react"
import WalletMenu, { nameByPath } from "./WalletMenu"
import { FrameState } from "../../redux/FrameState"
import { useSelector } from "react-redux"
import DashboardSubpage from "./DashboardSubpage"
import Channels from "../../components/Account/Channels/index"
import Network from "../../components/Account/Network/index"
import Preferences from "../../components/Account/Preferences/index"

export interface WalletPageStateProps {
  path?: string
  name?: string
  showVerifiable: () => void
}

export interface WalletPageState {
  sendShown: boolean
}

export function WalletPage({ showVerifiable }: WalletPageStateProps): React.JSX.Element {
  const name = useSelector((state: FrameState) => nameByPath(state.shared.rememberPath))

  let content: React.JSX.Element
  switch (name) {
    case "Channels":
      content = <Channels />
      break
    case "Preferences":
      content = <Preferences showVerifiable={showVerifiable} />
      break
    case "Network":
      content = <Network />
      break
    default:
      content = <DashboardSubpage />
      break
  }

  return <WalletMenu>{content}</WalletMenu>
}

export default WalletPage
