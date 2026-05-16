import * as React from "react"
import { Divider, Paper, Stack, Text } from "@mantine/core"
import { formatUnits } from "viem"
import TransactionMeta from "../../../lib/TransactionMeta"

export interface ApproveTransactionProps {
  transaction: TransactionMeta
}

export interface ApproveTransactionState {
  to: string
  formattedAmount: string
  formattedTotal: string
  formattedFee: string
}

export default class ApprovePage extends React.Component<ApproveTransactionProps, ApproveTransactionState> {
  constructor(props: ApproveTransactionProps) {
    super(props)
    this.state = this.buildStateFromProps(props)
  }

  componentDidUpdate(prevProps: ApproveTransactionProps) {
    if (prevProps.transaction.id !== this.props.transaction.id) {
      this.setState(this.buildStateFromProps(this.props))
    }
  }

  private buildStateFromProps(props: ApproveTransactionProps): ApproveTransactionState {
    const to = props.transaction.to || ""
    const amountWei = typeof props.transaction.amount === "bigint" ? props.transaction.amount : BigInt(String(props.transaction.amount || 0))
    const feeWei = typeof props.transaction.fee === "bigint" ? props.transaction.fee : BigInt(String(props.transaction.fee || 0))
    const formattedAmount = formatUnits(amountWei, 18)
    const formattedFee = formatUnits(feeWei, 18)
    const amount = parseFloat(formattedAmount)
    const fee = parseFloat(formattedFee)
    return {
      to,
      formattedAmount,
      formattedFee,
      formattedTotal: (amount + fee).toFixed(6)
    }
  }

  render() {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            To
          </Text>
          <Text style={{ wordBreak: "break-all" }}>{this.state.to}</Text>
          <Divider />
          <Text size="sm" c="dimmed">
            Amount
          </Text>
          <Text>{this.state.formattedAmount}</Text>
          <Divider />
          <Text size="sm" c="dimmed">
            Fee
          </Text>
          <Text>{this.state.formattedFee}</Text>
          <Divider />
          <Text size="sm" c="dimmed">
            Total
          </Text>
          <Text fw={600}>{this.state.formattedTotal}</Text>
        </Stack>
      </Paper>
    )
  }
}
