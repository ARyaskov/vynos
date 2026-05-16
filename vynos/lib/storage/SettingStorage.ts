import localforage from "localforage"
import networks from "../../../data/networks.json"
import { VYNOS_DB_NAME, VYNOS_DB_VERSION } from "./dbConfig"
const DEFAULT_NETWORK = "Sepolia"
const NETWORKS: Record<string, string> = networks as Record<string, string>
const LEGACY_NETWORK_ALIASES: Record<string, string> = {
  Ropsten: "Sepolia",
  Rinkeby: "Sepolia"
}

export interface Setting {
  name: string
  value: string
}

export interface NetworkSetting {
  name: string
  value: string
}

const settingsStore = localforage.createInstance({
  name: VYNOS_DB_NAME,
  version: VYNOS_DB_VERSION,
  storeName: "settings"
})

export default class SettingStorage {
  async save(name: string, value: string): Promise<void> {
    await settingsStore.setItem(name, value)
  }

  async get(name: string): Promise<Setting | null> {
    const value = await settingsStore.getItem<string>(name)
    if (value === null || value === undefined) {
      return null
    }
    return { name, value }
  }

  async getNetwork(): Promise<NetworkSetting> {
    const networkSetting = await this.get("network")
    const rawNetworkName = networkSetting?.value || DEFAULT_NETWORK
    const networkName = LEGACY_NETWORK_ALIASES[rawNetworkName] || rawNetworkName
    const networkValue = NETWORKS[networkName] || networkName

    return {
      name: networkName,
      value: networkValue
    }
  }
}
