import * as React from "react"
import { Divider, Paper, Stack, Text } from "@mantine/core"
import TransactionMeta from "../../../lib/TransactionMeta"
import { formatAmount } from "../../../lib/formatting"

export interface ApproveTransactionProps {
  transaction: TransactionMeta
}

export interface ApproveTransactionState {
  formatedAmount: string
}

export default class ApprovePage extends React.Component<ApproveTransactionProps, ApproveTransactionState> {
  constructor(props: ApproveTransactionProps) {
    super(props)
    const { value, denomination } = formatAmount(this.props.transaction.amount)
    const delimitedOutput = this.props.transaction.amount.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
    const formatedAmount = `${value} ${denomination} (${delimitedOutput} wei)`
    this.state = { formatedAmount }
  }

  render() {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Site
          </Text>
          <Text>{this.props.transaction.origin}</Text>
          <Divider />
          <Text size="sm" c="dimmed">
            Description
          </Text>
          <Text>{this.props.transaction.description}</Text>
          <Divider />
          <Text size="sm" c="dimmed">
            Amount
          </Text>
          <Text>{this.state.formatedAmount}</Text>
        </Stack>
      </Paper>
    )
  }
}
