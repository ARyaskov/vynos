import localforage from "localforage"
import { default as SettingStorage } from "./SettingStorage"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "./dbConfig"

export interface ChannelMeta {
  channelId: string
  title: string
  host: string
  icon?: string
  openingTime?: number
  closingTime?: number
}

type ChannelMap = Record<string, ChannelMeta>

const channelsStore = localforage.createInstance({
  name: VYNOS_DB_NAME,
  version: VYNOS_DB_VERSION,
  storeName: "channels"
})

const settingStorage = new SettingStorage()

export default class ChannelMetaStorage {
  private networkName: string = ""

  private async ensureNetworkName(): Promise<string> {
    if (this.networkName) {
      return this.networkName
    }
    const network = await settingStorage.getNetwork()
    this.networkName = network.name
    return this.networkName
  }

  private async storageKey(): Promise<string> {
    const networkName = await this.ensureNetworkName()
    return `channels_${networkName}`
  }

  private async loadMap(): Promise<ChannelMap> {
    const key = await this.storageKey()
    return (await channelsStore.getItem<ChannelMap>(key)) || {}
  }

  private async saveMap(value: ChannelMap): Promise<void> {
    const key = await this.storageKey()
    await channelsStore.setItem(key, value)
  }

  async save(meta: ChannelMeta): Promise<void> {
    const channels = await this.loadMap()
    channels[meta.channelId] = meta
    await this.saveMap(channels)
  }

  async setClosingTime(channelId: string, time: number): Promise<void> {
    const channels = await this.loadMap()
    const channel = channels[channelId]
    if (channel) {
      channels[channelId] = { ...channel, closingTime: time }
      await this.saveMap(channels)
    }
  }

  async insertIfNotExists(meta: ChannelMeta): Promise<void> {
    const found = await this.firstById(meta.channelId)
    if (!found) {
      await this.save(meta)
    }
  }

  async firstById(channelId: string): Promise<ChannelMeta | null> {
    const channels = await this.loadMap()
    return channels[channelId] || null
  }

  async findByIds(ids: Array<string>): Promise<Array<ChannelMeta>> {
    const channels = await this.loadMap()
    return ids
      .map((id) => channels[id])
      .filter((meta): meta is ChannelMeta => !!meta)
      .sort((left, right) => {
        const leftClosing = left.closingTime ?? -1
        const rightClosing = right.closingTime ?? -1
        if (leftClosing !== rightClosing) {
          return rightClosing - leftClosing
        }
        const leftOpening = left.openingTime ?? -1
        const rightOpening = right.openingTime ?? -1
        return rightOpening - leftOpening
      })
  }

  clear(cb: () => void) {
    this.saveMap({})
      .then(() => cb())
      .catch((error) => {
        console.error("Error while deleting channels local database")
        console.error(error)
        cb()
      })
  }

  async changeNetwork(): Promise<void> {
    const network = await settingStorage.getNetwork()
    this.networkName = network.name
  }
}
