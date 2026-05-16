import * as React from "react"
import TransactionStorage from "../../../lib/storage/TransactionMetaStorage"
import { Alert, Button, Container, Group, Stack, Text } from "@mantine/core"
import WorkerProxy from "../../WorkerProxy"
import { connect } from "react-redux"
import { type Dispatch } from "@reduxjs/toolkit"
import { FrameState } from "../../redux/FrameState"
import * as actions from "../../redux/actions"
import TransactionMeta from "../../../lib/TransactionMeta"
import TransactionState from "../../../lib/TransactionState"
import TransactionKind from "../../../lib/TransactionKind"
import ApproveSignature from "./ApproveSignature"
import ApproveTransaction from "./ApproveTransaction"
import ApproveMicropayment from "./ApproveMicropayment"

export interface ApprovePageStateProps {
  workerProxy?: WorkerProxy
  isTransactionPending?: number
}

export interface ApprovePageState {
  transaction?: TransactionMeta
  pendingCount: number
}

export interface ApprovePageDispatchProps {
  setPending?: (state: boolean) => void
}

export type ApprovePageProps = ApprovePageStateProps & ApprovePageDispatchProps

export class ApprovePage extends React.Component<ApprovePageProps, ApprovePageState> {
  storage: TransactionStorage

  constructor(props: ApprovePageProps) {
    super(props)
    this.state = { pendingCount: 0 }
    this.storage = new TransactionStorage()
  }

  componentDidMount() {
    this.update()
  }

  componentDidUpdate(prevProps: ApprovePageProps) {
    if (prevProps.isTransactionPending !== this.props.isTransactionPending) {
      this.update()
    }
  }

  componentWillUnmount() {
    if (this.state.transaction && this.state.transaction.state === TransactionState.PENDING) {
      this.storage.view(this.state.transaction.id).then(() => undefined)
    }
  }

  update() {
    this.storage.pending().then((pending) => {
      const transaction = pending[0]
      if (transaction) {
        this.setState({ transaction, pendingCount: pending.length })
      } else {
        this.props.setPending!(false)
      }
    })
  }

  approve(transaction: TransactionMeta) {
    this.storage.approve(transaction.id).then(() => {
      transaction.state = TransactionState.APPROVED
      this.props.workerProxy!.resolveTransaction()
      this.props.workerProxy!.setApproveById(transaction.id)
      this.update()
    })
  }

  reject(transaction: TransactionMeta) {
    this.storage.reject(transaction.id).then(() => {
      transaction.state = TransactionState.REJECTED
      this.props.workerProxy!.resolveTransaction()
      this.props.workerProxy!.setRejectById(transaction.id)
      this.update()
    })
  }

  render() {
    if (!this.state.transaction) {
      return null
    }

    let transactionData: React.ReactNode
    switch (this.state.transaction.kind) {
      case TransactionKind.SIGN:
        transactionData = <ApproveSignature transaction={this.state.transaction} key={this.state.transaction.id} />
        break
      case TransactionKind.ETHEREUM:
        transactionData = <ApproveTransaction transaction={this.state.transaction} key={this.state.transaction.id} />
        break
      case TransactionKind.MICROPAYMENT:
        transactionData = <ApproveMicropayment transaction={this.state.transaction} key={this.state.transaction.id} />
        break
      default:
        throw new Error("Not Implemented")
    }

    return (
      <Container py="sm">
        <Stack gap="sm">
          {this.state.pendingCount > 1 && <Text size="sm">Pending transactions: {this.state.pendingCount}</Text>}
          {this.state.transaction.kind === TransactionKind.MICROPAYMENT && (
            <Alert color="orange" variant="light">
              Too often or too large a payment
            </Alert>
          )}
          {transactionData}
          <Group grow>
            <Button color="green" onClick={this.approve.bind(this, this.state.transaction)}>
              Approve
            </Button>
            <Button color="red" onClick={this.reject.bind(this, this.state.transaction)}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Container>
    )
  }
}

function mapStateToProps(state: FrameState): ApprovePageStateProps {
  return {
    isTransactionPending: state.shared.isTransactionPending,
    workerProxy: state.temp.workerProxy
  }
}

function mapDispatchToProps(dispatch: Dispatch): ApprovePageDispatchProps {
  return {
    setPending: (state: boolean) => {
      dispatch(actions.setPending(state))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ApprovePage)
