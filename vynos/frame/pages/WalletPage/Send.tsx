import * as React from "react"
import { connect } from "react-redux"
import { isAddress, parseEther } from "viem"
import { useConnection, useSendTransaction } from "wagmi"
import { Box, Button, Divider, Group, Paper, Stack, Text, TextInput } from "@mantine/core"
import WalletAccount from "../../components/WalletPage/WalletAccount"

export interface SendProps {
  hideSend(): void
}

export interface SendState {
  step: number
  toError: string
  balanceError: string
  amountError: string
  step1Valid: boolean
  step2Valid: boolean
}

function SendView(props: SendProps) {
  const connection = useConnection()
  const { sendTransactionAsync } = useSendTransaction()

  const [state, setState] = React.useState<SendState>({
    step: 1,
    step1Valid: false,
    step2Valid: false,
    toError: "",
    amountError: "",
    balanceError: ""
  })

  const [to, setTo] = React.useState("")
  const [amount, setAmount] = React.useState("")

  const validate = React.useCallback((toValue: string, amountValue: string) => {
    let toError = ""
    let amountError = ""
    let valid = true

    if (!toValue || !isAddress(toValue)) {
      valid = false
      toError = "Incorrect address"
    }

    const numericAmount = Number.parseFloat(amountValue)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      valid = false
      amountError = "Incorrect amount"
    }

    setState((current) => ({ ...current, step1Valid: valid, toError, amountError }))
  }, [])

  const onChangeTo = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value
    setTo(value)
    validate(value, amount)
  }

  const onChangeAmount = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value
    setAmount(value)
    validate(to, value)
  }

  const sendTransaction = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    try {
      if (!connection.address) {
        setState((current) => ({ ...current, balanceError: "No wallet account available" }))
        return
      }
      const hash = await sendTransactionAsync({
        account: connection.address,
        to: to as `0x${string}`,
        value: parseEther(amount)
      })
      console.log("Transaction hash :", hash)
      props.hideSend()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setState((current) => ({ ...current, step2Valid: false, balanceError: message }))
    }
  }

  if (state.step !== 1) {
    return <div />
  }

  return (
    <Stack gap="sm" py="sm">
      <Button variant="subtle" onClick={() => props.hideSend()}>
        ⬅️ Send
      </Button>
      <WalletAccount />
      <Paper withBorder p="md" radius="md">
        <Box component="form" onSubmit={sendTransaction}>
          <Stack gap="sm">
            <TextInput type="text" placeholder="To" onChange={onChangeTo} error={state.toError || undefined} />
            <Group gap="xs" wrap="nowrap">
              <TextInput type="text" placeholder="Amount" onChange={onChangeAmount} error={state.amountError || undefined} style={{ flex: 1 }} />
              <Text size="sm" c="dimmed">
                Ether
              </Text>
            </Group>
            {state.balanceError && (
              <Text c="red" size="sm">
                {state.balanceError}
              </Text>
            )}
            <Divider my="xs" />
            <Button type="submit" disabled={!state.step1Valid}>
              Send
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  )
}

function mapStateToProps(_state: unknown, ownProps: SendProps): SendProps {
  return {
    hideSend: ownProps.hideSend
  }
}

export default connect(mapStateToProps)(SendView)
