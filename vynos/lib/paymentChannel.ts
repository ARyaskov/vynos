export interface PaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: bigint
  spent: bigint
  state: number
  tokenContract?: string
  settlementPeriod?: bigint
  settlingUntil?: bigint
}

export interface SerializedPaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: string
  spent: string
  state: number
  tokenContract?: string
  settlementPeriod?: string | number | bigint
  settlingUntil?: string | number | bigint
}

export const PaymentChannelSerde = {
  serialize(channel: PaymentChannel): SerializedPaymentChannel {
    return {
      sender: channel.sender,
      receiver: channel.receiver,
      channelId: channel.channelId,
      value: channel.value.toString(),
      spent: channel.spent.toString(),
      state: channel.state,
      tokenContract: channel.tokenContract,
      settlementPeriod: channel.settlementPeriod ? channel.settlementPeriod.toString() : undefined,
      settlingUntil: channel.settlingUntil ? channel.settlingUntil.toString() : undefined
    }
  },
  deserialize(channel: SerializedPaymentChannel): PaymentChannel {
    return {
      sender: channel.sender,
      receiver: channel.receiver,
      channelId: channel.channelId,
      value: BigInt(channel.value),
      spent: BigInt(channel.spent),
      state: Number(channel.state),
      tokenContract: channel.tokenContract,
      settlementPeriod: channel.settlementPeriod !== undefined ? BigInt(channel.settlementPeriod) : undefined,
      settlingUntil: channel.settlingUntil !== undefined ? BigInt(channel.settlingUntil) : undefined
    }
  }
}
