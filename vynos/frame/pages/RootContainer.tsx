import * as React from "react"
import { useSelector } from "react-redux"
import { FrameState } from "../redux/FrameState"
import InitPage from "./InitPage"
import UnlockPage from "./UnlockPage"
import WalletPage from "../pages/WalletPage"
import ApprovePage from "../components/WalletPage/ApprovePage"
import VerifiablePage from "../components/Account/Verifiable/index"

export function isUnlockPageExpected(state: FrameState): boolean {
  return !!(state.shared.didInit && state.temp.workerProxy && state.shared.isLocked)
}

export interface RootStateProps {
  isWalletExpected: boolean
  isUnlockExpected: boolean
  isTransactionPending: boolean
  isVerifiable: boolean
}

export interface RootStateState {
  showingVerifiable: boolean
}

export type RootContainerProps = RootStateProps

export function RootContainer(): React.JSX.Element {
  const [showingVerifiable, setShowingVerifiable] = React.useState(false)
  const isUnlockExpected = useSelector((state: FrameState) => state.shared.didInit && state.shared.isLocked)
  const isWalletExpected = useSelector((state: FrameState) => state.shared.didInit && !state.shared.isLocked)
  const isTransactionPending = useSelector((state: FrameState) => state.shared.didInit && state.shared.isTransactionPending !== 0)

  const showVerifiable = React.useCallback(() => {
    setShowingVerifiable(true)
  }, [])

  const hideVerifiable = React.useCallback(() => {
    setShowingVerifiable(false)
  }, [])

  return (
    <div>
      {showingVerifiable ? <VerifiablePage showVerifiable={showVerifiable} hideVerifiable={hideVerifiable} /> : null}
      {isTransactionPending ? (
        <ApprovePage />
      ) : isUnlockExpected ? (
        <UnlockPage showVerifiable={showVerifiable} />
      ) : isWalletExpected ? (
        <WalletPage showVerifiable={showVerifiable} />
      ) : (
        <InitPage showVerifiable={showVerifiable} />
      )}
    </div>
  )
}

export default RootContainer
