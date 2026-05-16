import localforage from "localforage"
import { default as SettingStorage } from "./storage/SettingStorage"
import { default as bus } from "./bus"
import { CHANGE_NETWORK } from "./constants"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "./storage/dbConfig"

const settingStorage = new SettingStorage()
type LocalForageInstance = ReturnType<typeof localforage.createInstance>

export default class Storage {
  datastore: LocalForageInstance | undefined
  name: string

  constructor(name: string) {
    this.name = name
    this.datastore = undefined
    this.load().catch(console.error)
    bus.on(CHANGE_NETWORK, async () => {
      await this.load()
    })
  }

  async load(): Promise<void> {
    const network = await settingStorage.getNetwork()
    this.datastore = localforage.createInstance({
      name: VYNOS_DB_NAME,
      version: VYNOS_DB_VERSION,
      storeName: `${this.name}_${network.name}`
    })
  }

  async ready(): Promise<LocalForageInstance> {
    if (this.datastore) {
      return this.datastore
    }

    await this.load()
    if (!this.datastore) {
      throw new Error("Storage is not initialized")
    }
    return this.datastore
  }
}
