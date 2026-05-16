import * as React from "react"
import { Anchor, Group, Image, Paper, Stack, Text } from "@mantine/core"
import ChannelMetaStorage, { type ChannelMeta } from "../../../../lib/storage/ChannelMetaStorage"
import { connect } from "react-redux"
import { FrameState } from "../../../redux/FrameState"
import WorkerProxy from "../../../WorkerProxy"
import { type PaymentChannel } from "../../../../lib/paymentChannel"
import { resource } from "../../../../lib/helpers"

export interface ChannelsSubpageProps {
  lastUpdateDb?: number
  workerProxy?: WorkerProxy
}

export interface ChannelsSubpageState {
  channels: ChannelListItem[]
  activeChannel: string
}

type ChannelListItem = ChannelMeta & {
  balance?: bigint
  state: number
  canClose: boolean
  desc?: string
}

export class ChannelsSubpage extends React.Component<ChannelsSubpageProps, ChannelsSubpageState> {
  channelMetaStorage: ChannelMetaStorage
  localLastUpdateDb: number

  constructor(props?: ChannelsSubpageProps | undefined) {
    super(props!)
    this.state = {
      channels: [],
      activeChannel: ""
    }
    this.channelMetaStorage = new ChannelMetaStorage()
    this.localLastUpdateDb = props?.lastUpdateDb ?? 0
  }

  componentDidMount() {
    this.updateListChannels({})
  }

  shouldComponentUpdate(nextProps: ChannelsSubpageProps) {
    const nextUpdateDb = nextProps.lastUpdateDb ?? 0
    if (this.localLastUpdateDb < nextUpdateDb) {
      this.localLastUpdateDb = nextUpdateDb
      this.updateListChannels({})
      return false
    }
    return true
  }

  closeChannelId(channel: ChannelListItem) {
    this.props.workerProxy!.closeChannel(channel.channelId).then(() => {
      this.channelMetaStorage.setClosingTime(channel.channelId, Date.now()).then(() => {
        const change: Record<string, Partial<ChannelListItem>> = {}
        change[channel.channelId] = {
          state: channel.state === 0 ? 1 : 2
        }
        this.setActiveChannel(channel.channelId)
        this.updateListChannels(change)
      })
    })
  }

  updateListChannels(change: Record<string, Partial<ChannelListItem>>) {
    this.props
      .workerProxy!.listChannels()
      .then((channels) => {
        const balanceByChannelId: Record<string, bigint> = {}
        const stateByChannelId: Record<string, number> = {}
        const channelIds = channels.map((channel: PaymentChannel) => {
          balanceByChannelId[channel.channelId.toString()] = channel.value - channel.spent
          stateByChannelId[channel.channelId.toString()] = channel.state
          return channel.channelId.toString()
        })
        this.channelMetaStorage.findByIds(channelIds).then((metaChannels) => {
          const preparedChannels = metaChannels.map((channel): ChannelListItem => {
            const preparedChannel: ChannelListItem = {
              ...channel,
              state: 0,
              canClose: false
            }
            if (balanceByChannelId[channel.channelId] !== undefined) {
              preparedChannel.balance = balanceByChannelId[channel.channelId]
            }
            if (stateByChannelId[channel.channelId] !== undefined) {
              preparedChannel.state = stateByChannelId[channel.channelId]
            }
            if (change[channel.channelId]) {
              Object.assign(preparedChannel, change[channel.channelId])
            }
            preparedChannel.canClose = preparedChannel.state === 0
            return preparedChannel
          })
          this.setState({ channels: preparedChannels })
        })
      })
      .catch((_error: unknown) => {
        this.setState({ channels: [] })
      })
  }

  setActiveChannel(channelId: string) {
    const activeChannel = channelId === this.state.activeChannel ? "" : channelId
    this.setState({ activeChannel })
  }

  render() {
    return (
      <Stack gap="xs">
        {this.state.channels.map((channel) => {
          const isActiveChannel = channel.channelId === this.state.activeChannel && channel.state === 0
          const clickable = channel.state !== 1 && !isActiveChannel
          const clickItem = clickable ? this.setActiveChannel.bind(this, channel.channelId) : undefined

          if (channel.state > 1) {
            return null
          }

          return (
            <Paper
              key={channel.channelId}
              withBorder
              p="sm"
              radius="sm"
              onClick={clickItem}
              style={{ cursor: clickable ? "pointer" : "default", opacity: channel.state === 1 ? 0.6 : 1 }}
            >
              <Group justify="space-between" align="start" wrap="nowrap">
                <Group align="start" wrap="nowrap">
                  <Image
                    src={channel.icon || resource("/frame/styles/images/channel.png")}
                    fallbackSrc={resource("/frame/styles/images/channel.png")}
                    w={24}
                    h={24}
                    radius="xl"
                  />
                  <div>
                    <Text
                      fw={600}
                      onClick={isActiveChannel ? this.setActiveChannel.bind(this, channel.channelId) : undefined}
                      style={{ cursor: channel.state === 0 ? "pointer" : "default" }}
                    >
                      {channel.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {channel.desc}
                    </Text>
                    {(isActiveChannel || (channel.state === 1 && channel.canClose)) && (
                      <Anchor c="red" size="sm" onClick={this.closeChannelId.bind(this, channel)}>
                        CLOSE
                      </Anchor>
                    )}
                  </div>
                </Group>
                <Text fw={600}>{channel.balance?.toString() ?? "0"}</Text>
              </Group>
            </Paper>
          )
        })}
      </Stack>
    )
  }
}

function mapStateToProps(state: FrameState): ChannelsSubpageProps {
  return {
    lastUpdateDb: state.shared.lastUpdateDb,
    workerProxy: state.temp.workerProxy
  }
}

export default connect(mapStateToProps)(ChannelsSubpage)
