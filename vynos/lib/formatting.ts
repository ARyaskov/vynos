import { formatUnits } from "viem"

const DENOMINATIONS = ["kwei", "mwei", "gwei", "szabo", "finney", "ether", "kether", "mether", "gether", "tether"]
const DENOMINATION_DECIMALS: Record<string, number> = {
  wei: 0,
  kwei: 3,
  mwei: 6,
  gwei: 9,
  szabo: 12,
  finney: 15,
  ether: 18,
  kether: 21,
  mether: 24,
  gether: 27,
  tether: 30
}

export interface Amount {
  value: string
  denomination: string
}

export function formatAmount(wei: number | string | bigint): Amount {
  if (wei) {
    const normalizedWei = typeof wei === "bigint" ? wei : BigInt(String(wei))
    let shortestDenomination: string = ""
    let _min: number
    DENOMINATIONS.forEach((d) => {
      const decimals = DENOMINATION_DECIMALS[d]
      const candidate = formatUnits(normalizedWei, decimals).length
      if (!_min || candidate < _min) {
        _min = candidate
        shortestDenomination = d
      }
    })
    let denomination = shortestDenomination || "wei"
    const value = formatUnits(normalizedWei, DENOMINATION_DECIMALS[shortestDenomination || "wei"])
    return { value, denomination }
  } else {
    return { value: "0", denomination: "wei" }
  }
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const sameYear = date.getFullYear() === now.getFullYear()

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })

  if (sameDay) {
    return `just ${timeFmt.format(date)}`
  }

  if (sameYear) {
    const dateFmt = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short"
    })
    return `${dateFmt.format(date)}, ${timeFmt.format(date)}`
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "2-digit"
  })
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`
}
