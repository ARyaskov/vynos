import * as React from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import Channels from "../components/Account/Channels"
import Preferences from "../components/Account/Preferences"
import Network from "../components/Account/Network"
import Wallet from "../pages/WalletPage"
import ApprovePage from "../components/WalletPage/ApprovePage"

const AppRoutes: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/approve" element={<ApprovePage />} />
        <Route path="/wallet" element={<Wallet showVerifiable={() => undefined} />} />
        <Route path="/wallet/channels" element={<Channels />} />
        <Route path="/wallet/preferences" element={<Preferences />} />
        <Route path="/wallet/network" element={<Network />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRoutes
