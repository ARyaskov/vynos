import * as React from 'react'
import TransactionStorage from '../../../lib/storage/TransactionMetaStorage'
import Transaction from "../../../lib/TransactionMeta";
import {List, Image} from 'semantic-ui-react'
import {formatAmount, formatDate} from "../../../lib/formatting";
import BlockieComponent from "../../components/BlockieComponent";

const style = require('../../styles/ynos.css')

export interface TransactionsSubpageProps {}

export interface TransactionsSubpageState {
  transactions: Array<Transaction>
}

export default class TransactionsSubpage extends React.Component<TransactionsSubpageProps, TransactionsSubpageState> {
  transactionStorage: TransactionStorage

  constructor(props: TransactionsSubpageProps) {
    super(props)
    this.state = {
      transactions: []
    }
    this.transactionStorage = new TransactionStorage()
  }

  componentDidMount () {
    this.transactionStorage.all().then(transactions => {
      this.setState({
        transactions: transactions.reverse()
      })
    })
  }

  transactionIcon (transaction: Transaction) {
    if (transaction.icon) {
      return <Image avatar src={transaction.icon} size="mini" />
    } else {
      return <BlockieComponent classDiv={"ui mini avatar image " + style.listItemAvatar} classCanvas={"ui mini avatar image"} size={35} scale={2} seed={transaction.id} />
    }
  }

  renderTransaction (transaction: Transaction) {
    let icon = this.transactionIcon(transaction)
    let { value, denomination } = formatAmount(transaction.amount)
    let date = formatDate(transaction.time)

    return <List.Item className={style.listItem} key={transaction.id}>
      <List.Content floated='right'>
        <span className={style.channelBalance}>{value} {denomination}</span>
      </List.Content>
      {icon}
      <List.Content className={style.listContent}>
        <List.Header className={style.listHeader}>{transaction.title} <span className={style.lifetimeDate}>{date}</span></List.Header>
        <List.Description className={style.listDesc}>{transaction.description}</List.Description>
      </List.Content>
    </List.Item>
  }

  render () {
    let rows = this.state.transactions.map((t: Transaction) => this.renderTransaction(t))
    let className = style.listWrap + ' ' + style.scrollbarContainer

    if (rows.length) {
      return <List className={className} divided verticalAlign='middle'>
        {rows}
      </List>
    } else {
      return <p></p>
    }
  }
}