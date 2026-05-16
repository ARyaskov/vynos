import * as React from "react"
import { Stack } from "@mantine/core"

import AddressSubpage from "./AddressSubpage"
import TransactionsSubpage from "./TransactionsSubpage"
import WalletAccount from "../../components/WalletPage/WalletAccount"
import Send from "./Send"
import SettingStorage from "../../../lib/storage/SettingStorage"

const settingStorage = new SettingStorage()

export interface DashboardSubpageProps {
  //
}

export interface DashboardSubpageState {
  isDetailsDisplayed: boolean
  address: string
  sendShown: boolean
  network: string
}

export class DashboardSubpage extends React.Component<DashboardSubpageProps, DashboardSubpageState> {
  constructor(props: DashboardSubpageProps) {
    super(props)
    this.state = {
      isDetailsDisplayed: false,
      address: "",
      sendShown: false,
      network: "Sepolia"
    }

    this.onChangeAddress = this.onChangeAddress.bind(this)
    this.onChangeDetailsDisplayed = this.onChangeDetailsDisplayed.bind(this)
    this.showSend = this.showSend.bind(this)
    this.hideSend = this.hideSend.bind(this)
    this.renderChildren = this.renderChildren.bind(this)
  }

  renderChildren() {
    if (this.state.isDetailsDisplayed && this.state.address) {
      return <AddressSubpage address={this.state.address} showSend={this.showSend} network={this.state.network} />
    }
    return <TransactionsSubpage />
  }

  onChangeAddress(address: string) {
    this.setState((prev) => (prev.address === address ? null : { address }))
  }

  onChangeDetailsDisplayed(value: boolean) {
    this.setState((prev) => (prev.isDetailsDisplayed === value ? null : { isDetailsDisplayed: value }))
  }

  showSend() {
    this.setState({ sendShown: true })
  }

  hideSend() {
    this.setState({ sendShown: false })
  }

  componentDidMount() {
    settingStorage.getNetwork().then((networkSettings) => this.setState({ network: networkSettings.name }))
  }

  render() {
    if (this.state.sendShown) {
      return <Send hideSend={this.hideSend} />
    }

    return (
      <Stack gap="sm">
        <WalletAccount onChangeAddress={this.onChangeAddress} onChangeDetailsDisplayed={this.onChangeDetailsDisplayed} />
        {this.renderChildren()}
      </Stack>
    )
  }
}

export default DashboardSubpage
