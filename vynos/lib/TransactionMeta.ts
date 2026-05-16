import TransactionKind from "./TransactionKind"

export default interface TransactionMeta {
  id: string
  origin?: string
  title: string
  description?: string
  meta?: string
  icon?: string
  time: number
  amount: number | string | bigint
  fee?: number | string | bigint
  kind: TransactionKind
  state: string
  data?: string
  from?: string
  to?: string
  tokenContract?: string
}
