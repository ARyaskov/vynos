import * as React from "react"
import { Alert, Divider, Paper, Stack, Text } from "@mantine/core"
import TransactionMeta from "../../../lib/TransactionMeta"

export interface ApproveSignatureProps {
  transaction: TransactionMeta
}

export default function ApproveSignature({ transaction }: ApproveSignatureProps): React.JSX.Element {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Alert color="yellow" variant="light">
          Signing this message can have dangerous side effects. Only sign messages from sites you fully trust.
        </Alert>
        <Text size="sm" c="dimmed">
          Address
        </Text>
        <Text style={{ wordBreak: "break-all" }}>{transaction.from}</Text>
        <Divider />
        <Text size="sm" c="dimmed">
          Message
        </Text>
        <Text style={{ wordBreak: "break-all" }}>{transaction.data}</Text>
      </Stack>
    </Paper>
  )
}
