import * as React from "react"
import { useSelector } from "react-redux"
import { Group, Image, Paper, Stack, Text } from "@mantine/core"
import TransactionStorage from "../../../lib/storage/TransactionMetaStorage"
import Transaction from "../../../lib/TransactionMeta"
import TransactionState from "../../../lib/TransactionState"
import TransactionKind from "../../../lib/TransactionKind"
import { formatAmount, formatDate } from "../../../lib/formatting"
import type { FrameState } from "../../redux/FrameState"
import { resource } from "../../../lib/helpers"

const TransactionsScrollbarStyle = {
  width: "330px",
  height: "315px"
}

const KNOWN_TRANSACTION_ICONS = new Set([
  "close_channel-approved",
  "close_channel-pending",
  "ethereum-approved",
  "ethereum-pending",
  "ethereum-rejected",
  "ethereum-viewed",
  "incoming-approved",
  "micropayment-approved",
  "micropayment-rejected",
  "micropayment-viewed",
  "open_channel-approved",
  "open_channel-pending",
  "sign-approved",
  "sign-pending",
  "sign-rejected",
  "sign-viewed"
])

function transactionIconPath(transaction: Transaction): string {
  const kind = transaction.kind.toLowerCase()
  const txState = transaction.state.toLowerCase()
  const key = `${kind}-${txState}`
  if (KNOWN_TRANSACTION_ICONS.has(key)) {
    return resource(`/frame/styles/images/${key}.png`)
  }
  const approvedKey = `${kind}-approved`
  if (KNOWN_TRANSACTION_ICONS.has(approvedKey)) {
    return resource(`/frame/styles/images/${approvedKey}.png`)
  }
  return resource("/frame/styles/images/channel.png")
}

function transactionDescription(transaction: Transaction): string | undefined {
  if (transaction.kind === TransactionKind.MICROPAYMENT) {
    return transaction.description
  }
  if (transaction.kind === TransactionKind.ETHEREUM && transaction.to) {
    return "Send to " + transaction.to.slice(0, 8) + ".." + transaction.to.slice(-2)
  }
  if (transaction.kind === TransactionKind.SIGN && transaction.data) {
    return transaction.data.slice(0, 8) + ".." + transaction.data.slice(-2)
  }
  if (transaction.kind === TransactionKind.CLOSE_CHANNEL && transaction.description) {
    const parsedDescription = JSON.parse(transaction.description)
    return parsedDescription.channelId.slice(0, 8) + ".." + parsedDescription.channelId.slice(-2)
  }
  if (transaction.kind === TransactionKind.OPEN_CHANNEL && transaction.description !== undefined) {
    const parsedDescription = JSON.parse(transaction.description)
    if (parsedDescription.channelId !== undefined) {
      return parsedDescription.channelId.slice(0, 8) + ".." + parsedDescription.channelId.slice(-2)
    }
  }
  if (transaction.kind === TransactionKind.INCOMING && transaction.from) {
    return "Incoming from " + transaction.from.slice(0, 8) + ".." + transaction.from.slice(-2)
  }
}

export default function TransactionsSubpage(): React.JSX.Element {
  const lastUpdateDb = useSelector((state: FrameState) => state.shared.lastUpdateDb)
  const [transactions, setTransactions] = React.useState<Array<Transaction>>([])
  const transactionStorage = React.useMemo(() => new TransactionStorage(), [])

  const updateTransactions = React.useCallback(() => {
    transactionStorage.all().then((items) => {
      setTransactions(items.reverse())
    })
  }, [transactionStorage])

  React.useEffect(() => {
    updateTransactions()
  }, [updateTransactions])

  React.useEffect(() => {
    updateTransactions()
  }, [lastUpdateDb, updateTransactions])

  if (!transactions.length) {
    return <p />
  }

  return (
    <div style={{ ...TransactionsScrollbarStyle, overflow: "auto" }}>
      <Stack gap="xs">
        {transactions.map((transaction) => {
          const iconSrc = transactionIconPath(transaction)
          const { value, denomination } = formatAmount(transaction.amount)
          const date = formatDate(transaction.time)
          const fee = formatAmount(transaction.fee ? transaction.fee : 0)
          let transactionTitle: string | undefined
          let opacity = 1
          if (transaction.state === TransactionState.REJECTED || transaction.state === TransactionState.VIEWED) {
            transactionTitle = "Transaction was rejected by user"
            opacity = 0.6
          }

          return (
            <Paper key={transaction.id} title={transactionTitle} withBorder p="sm" radius="sm" style={{ opacity }}>
              <Group justify="space-between" align="start" wrap="nowrap">
                <Group align="start" wrap="nowrap">
                  <Image src={iconSrc} w={24} h={24} fallbackSrc={resource("/frame/styles/images/channel.png")} />
                  <div>
                    <Text fw={600}>
                      {transaction.title}{" "}
                      <Text span size="xs" c="dimmed">
                        {date}
                      </Text>
                    </Text>
                    <Text size="sm" c="dimmed">
                      {transactionDescription(transaction)}
                    </Text>
                  </div>
                </Group>
                {transaction.kind !== TransactionKind.SIGN && (
                  <div>
                    <Text fw={600}>
                      {value} {denomination}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Fee {fee.value} {fee.denomination}
                    </Text>
                  </div>
                )}
              </Group>
            </Paper>
          )
        })}
      </Stack>
    </div>
  )
}
