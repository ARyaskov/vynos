import * as React from "react"
import { connect } from "react-redux"
import { createPublicClient, formatUnits, getAddress, http } from "viem"
import { Box, Group, Paper, Stack, Text } from "@mantine/core"
import { FrameState } from "../../redux/FrameState"
import Currency from "../../lib/Currency"
import { IconGenerator } from "../IconGenerator"
import SettingStorage from "../../../lib/storage/SettingStorage"
import WorkerProxy from "../../WorkerProxy"

export interface WalletAccountProps {
  onChangeAddress?: (address: string) => void
  onChangeDetailsDisplayed?: (value: boolean) => void
  onChangeBalance?: (balance: number) => void
  displayCurrencyCode?: string
  workerProxy?: WorkerProxy
  lastUpdateDb?: number
}

function WalletAccountView(props: WalletAccountProps) {
  const [isDetailsDisplayed, setIsDetailsDisplayed] = React.useState(false)
  const [address, setAddress] = React.useState("")
  const [displayedBalance, setDisplayedBalance] = React.useState("0")
  const settingStorage = React.useMemo(() => new SettingStorage(), [])

  React.useEffect(() => {
    let cancelled = false

    const readAddress = async () => {
      if (!props.workerProxy) {
        return
      }
      try {
        const accounts = await props.workerProxy.provider.request<string[]>({
          method: "eth_accounts"
        })
        const nextAddress = accounts[0] || ""
        if (!cancelled) {
          setAddress((prev) => (prev === nextAddress ? prev : nextAddress))
          if (nextAddress) {
            props.onChangeAddress?.(nextAddress)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    void readAddress()
    const intervalId = globalThis.setInterval(() => {
      void readAddress()
    }, 30000)

    return () => {
      cancelled = true
      globalThis.clearInterval(intervalId)
    }
  }, [props.workerProxy, props.onChangeAddress, props.lastUpdateDb])

  React.useEffect(() => {
    const updateBalance = async () => {
      if (!address) {
        setDisplayedBalance("0")
        return
      }
      const network = await settingStorage.getNetwork()
      const rpcUrl = network.value
      const client = createPublicClient({ transport: http(rpcUrl) })
      const balanceWei = await client.getBalance({ address: getAddress(address) })
      const ethBalance = Number.parseFloat(formatUnits(balanceWei, 18))

      if (props.onChangeBalance) {
        props.onChangeBalance(ethBalance)
      }

      if (props.displayCurrencyCode === "ETH") {
        setDisplayedBalance(ethBalance.toString())
        return
      }

      const convertedBalance = await Currency.instance().convertCryptoOrCurrencyToCurrency(ethBalance, "ETH", props.displayCurrencyCode || "ETH")
      setDisplayedBalance(convertedBalance.toString())
    }

    void updateBalance().catch(console.error)
    const intervalId = globalThis.setInterval(() => {
      void updateBalance().catch(console.error)
    }, 30000)

    return () => {
      globalThis.clearInterval(intervalId)
    }
  }, [address, props.onChangeBalance, props.displayCurrencyCode, settingStorage, props.lastUpdateDb])

  const toggleDetails = () => {
    const next = !isDetailsDisplayed
    setIsDetailsDisplayed(next)
    props.onChangeDetailsDisplayed?.(next)
  }

  return (
    <Paper withBorder p="sm" radius="md" onClick={toggleDetails} style={{ cursor: "pointer" }}>
      <Group wrap="nowrap" align="center">
        <Box>
          <IconGenerator id="walletAvatar" data={address || ""} size={51} />
        </Box>
        <Stack gap={2}>
          <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
            {address || ""}
          </Text>
          <Text fw={700}>
            {props.displayCurrencyCode === "ETH"
              ? `${displayedBalance} ${props.displayCurrencyCode}`
              : `${Number.parseFloat(displayedBalance || "0").toFixed(2)} ${props.displayCurrencyCode}`}
          </Text>
        </Stack>
      </Group>
    </Paper>
  )
}

function mapStateToProps(state: FrameState, ownProps: WalletAccountProps): WalletAccountProps {
  return {
    onChangeAddress: ownProps.onChangeAddress,
    onChangeDetailsDisplayed: ownProps.onChangeDetailsDisplayed,
    onChangeBalance: ownProps.onChangeBalance,
    displayCurrencyCode: state.shared.preferences ? state.shared.preferences.currency : "ETH",
    workerProxy: state.temp.workerProxy,
    lastUpdateDb: state.shared.lastUpdateDb
  }
}

export default connect(mapStateToProps)(WalletAccountView)
