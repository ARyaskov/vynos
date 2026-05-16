export default class Currency {
  private static _instance: Currency

  currencies: Map<string, string>
  _cacheTime: number
  _toCacheArray: Map<string, number>
  _fromCacheArray: Map<string, number>

  private _timer!: ReturnType<typeof setInterval>

  constructor(cacheTime?: number) {
    this.currencies = new Map<string, string>()
    this.currencies.set("ETH", "Ethereum")
    this.currencies.set("BTC", "Bitcoin")
    this.currencies.set("LTC", "Litecoin")
    this.currencies.set("AUD", "Australian Dollar")
    this.currencies.set("BRL", "Brazilian Real")
    this.currencies.set("CAD", "Canadian Dollar")
    this.currencies.set("GBP", "British Pound")
    this.currencies.set("JPY", "Japanese Yen")
    this.currencies.set("PLN", "Polish Zloty")
    this.currencies.set("RUB", "Russian Ruble")
    this.currencies.set("USD", "US Dollar")
    let cacheTimeInMs: number = 30000
    if (cacheTime !== undefined) {
      if (cacheTime < 1) {
        cacheTime = 1
      }
      cacheTimeInMs = cacheTime * 1000
    }
    this._cacheTime = cacheTimeInMs
    this._toCacheArray = new Map<string, number>()
    this._fromCacheArray = new Map<string, number>()
    this.runInterval(cacheTimeInMs)
  }

  static instance(): Currency {
    // tslint:disable-next-line:strict-type-predicates
    if (Currency._instance === undefined) {
      Currency._instance = new Currency()
    }
    return Currency._instance
  }

  async runInterval(interval: number) {
    this._timer = setInterval(async () => {
      this._toCacheArray.forEach(async (_, key) => {
        this._toCacheArray.set(key, await this.fetchRate("USD", key))
      })

      this._fromCacheArray.forEach(async (_, key) => {
        this._fromCacheArray.set(key, await this.fetchRate(key, "USD"))
      })
    }, interval)

    return this._timer
  }

  async convertCryptoOrCurrencyToCurrency(amount: number, fromCurrencyCode: string, toCurrencyCode: string): Promise<number> {
    let result = 0
    if (!this._fromCacheArray.has(fromCurrencyCode)) {
      this._fromCacheArray.set(fromCurrencyCode, await this.fetchRate(fromCurrencyCode, "USD"))
    }
    if (!this._toCacheArray.has(toCurrencyCode)) {
      this._toCacheArray.set(toCurrencyCode, await this.fetchRate("USD", toCurrencyCode))
    }
    try {
      const toCurrencyRate = toCurrencyCode === "USD" ? 1 : this._toCacheArray.get(toCurrencyCode) || 0
      const fromCurrencyToUSDRate = this._fromCacheArray.get(fromCurrencyCode) || 0
      result = amount * toCurrencyRate * fromCurrencyToUSDRate
    } catch (e) {
      console.error(e)
    }
    return new Promise<number>((resolve) => {
      resolve(result)
    })
  }

  fetchRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const api = "https://min-api.cryptocompare.com/data/price" + "?fsym=" + fromCurrency + "&tsyms=" + toCurrency
    return new Promise<number>((done, err) => {
      fetch(api)
        .then((response) => {
          if (response.status === 200) {
            return response.json()
          } else {
            err(`Error while getting rate. Response status: ` + response.status)
          }
        })
        .then((json) => done(json[toCurrency]))
        .catch((error) => console.error(`Error while getting rate. Error: ` + error))
    })
  }
}
