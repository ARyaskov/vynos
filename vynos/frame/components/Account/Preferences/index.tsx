import * as React from "react"
import { Anchor, Button, Container, Group, Paper, Select, Stack, Text, TextInput } from "@mantine/core"
import { FrameState } from "../../../redux/FrameState"
import { connect } from "react-redux"
import { type Dispatch } from "@reduxjs/toolkit"
import WorkerProxy from "../../../WorkerProxy"
import { Preferences as PreferencesType } from "../../../../worker/WorkerState"
import * as actions from "../../../redux/actions"
import Currency from "../../../lib/Currency"
import { disableBiometricUnlock, enrollBiometricUnlock, isBiometricUnlockConfigured, isBiometricUnlockSupported } from "../../../lib/biometricUnlock"

export interface PreferencesStateProps {
  preferences: PreferencesType
  throttlingTimeFormatted: string
  currencies: Array<DropdownCurrencyData>
  currentCurrency: string
  currentTheme: PreferencesType["theme"]
  forgetConfirmation: boolean
  forgetButtonText: string
  biometricSupported: boolean
  biometricConfigured: boolean
  biometricSetupOpened: boolean
  biometricPassword: string
  biometricLoading: boolean
  biometricMessage: string | null
}

export interface OwnPreferencesProps {
  showVerifiable?: () => void
}

export interface DispatchPreferencesProps {
  clearTempState?: () => void
}

export interface PreferencesProps {
  workerProxy?: WorkerProxy
  preferences?: PreferencesType
}

export interface DropdownCurrencyData {
  key?: string
  value?: string
  text?: string
}

export class Preferences extends React.Component<PreferencesProps & OwnPreferencesProps & DispatchPreferencesProps, PreferencesStateProps> {
  privateKeyHex: string
  readonly inputStyles

  constructor(props: PreferencesProps & OwnPreferencesProps) {
    super(props)
    this.state = {
      preferences: props.preferences!,
      throttlingTimeFormatted: props.preferences?.micropaymentThrottlingHumanReadable ?? "-1ms",
      currencies: [],
      currentCurrency: props.preferences!.currency,
      currentTheme: props.preferences!.theme,
      forgetConfirmation: false,
      forgetButtonText: "Forget account",
      biometricSupported: isBiometricUnlockSupported(),
      biometricConfigured: false,
      biometricSetupOpened: false,
      biometricPassword: "",
      biometricLoading: false,
      biometricMessage: null
    }
    this.privateKeyHex = ""
    this.inputStyles = {
      input: {
        borderRadius: 10,
        border: "1.5px solid var(--vynos-input-border)",
        background: "var(--vynos-surface)",
        color: "var(--vynos-text)",
        minHeight: 42,
        boxShadow: "0 0 0 1px var(--vynos-input-outline)"
      },
      dropdown: {
        borderRadius: 10,
        border: "1.5px solid var(--vynos-input-border)",
        background: "var(--vynos-surface)"
      }
    }
  }

  async componentDidMount() {
    this.privateKeyHex = await this.props.workerProxy!.getPrivateKeyHex()
    const listOfCurrencies: Array<DropdownCurrencyData> = []
    for (const key of Currency.instance().currencies.keys()) {
      listOfCurrencies.push({ value: key, text: `${key} ${Currency.instance().currencies.get(key)}` })
    }
    const biometricConfigured = await isBiometricUnlockConfigured()
    this.setState({ currencies: listOfCurrencies, biometricConfigured })
  }

  render() {
    return (
      <Container py="md">
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Stack gap="xs">
              <Text fw={600}>Micropayments (threshold in wei)</Text>
              <TextInput
                size="md"
                placeholder="Maximum micropayment"
                value={String(this.state.preferences.micropaymentThreshold)}
                onChange={this.handleChangeMicropaymentThreshold.bind(this)}
                styles={this.inputStyles}
              />
              <Text size="sm">Throttling (ms/s/m/h/d/w, empty for none)</Text>
              <TextInput
                size="md"
                value={this.state.throttlingTimeFormatted}
                onChange={this.handleChangeMicropaymentThrottling.bind(this)}
                styles={this.inputStyles}
              />
            </Stack>

            <div className="vynos-subtle-divider" />

            <Stack gap="xs">
              <Text fw={600}>Security</Text>
              <Anchor
                component="button"
                onClick={() => {
                  this.handleSavePrivateKeyToFile()
                }}
              >
                Save private key to file
              </Anchor>
              <Anchor component="button" onClick={this.props.showVerifiable}>
                Verify authenticity Vynos
              </Anchor>
              {this.state.biometricSupported && (
                <>
                  {!this.state.biometricConfigured && !this.state.biometricSetupOpened && (
                    <Button
                      variant="light"
                      loading={this.state.biometricLoading}
                      onClick={() => {
                        this.handleOpenBiometricSetup()
                      }}
                    >
                      Enable Fingerprint Unlock
                    </Button>
                  )}
                  {!this.state.biometricConfigured && this.state.biometricSetupOpened && (
                    <>
                      <Text size="sm" c="dimmed">
                        Enter wallet password to connect fingerprint unlock on this device.
                      </Text>
                      <TextInput
                        size="md"
                        type="password"
                        placeholder="Wallet password"
                        value={this.state.biometricPassword}
                        onChange={(event) => this.setState({ biometricPassword: event.target.value, biometricMessage: null })}
                        styles={this.inputStyles}
                      />
                      <Group>
                        <Button
                          variant="light"
                          loading={this.state.biometricLoading}
                          onClick={() => {
                            this.handleEnableBiometricUnlock()
                          }}
                        >
                          Enable Fingerprint Unlock
                        </Button>
                        <Button
                          variant="subtle"
                          onClick={() => {
                            this.handleCloseBiometricSetup()
                          }}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </>
                  )}
                  {this.state.biometricConfigured && (
                    <Button
                      variant="light"
                      color="red"
                      loading={this.state.biometricLoading}
                      onClick={() => {
                        this.handleDisableBiometricUnlock()
                      }}
                    >
                      Disable Fingerprint Unlock
                    </Button>
                  )}
                  {this.state.biometricMessage && (
                    <Text size="sm" c="dimmed">
                      {this.state.biometricMessage}
                    </Text>
                  )}
                </>
              )}
            </Stack>

            <div className="vynos-subtle-divider" />

            <Stack gap="xs">
              <Text fw={600}>Display balance currency</Text>
              <Select
                size="md"
                value={this.state.currentCurrency}
                onChange={(value) => {
                  if (value) this.handleChangeCurrency(value)
                }}
                data={this.state.currencies.map((currency) => ({ value: currency.value || "", label: currency.text || "" }))}
                comboboxProps={{ withinPortal: false }}
                styles={this.inputStyles}
              />
            </Stack>

            <div className="vynos-subtle-divider" />

            <Stack gap="xs">
              <Text fw={600}>Theme</Text>
              <Select
                size="md"
                value={this.state.currentTheme}
                onChange={(value) => {
                  if (value) this.handleChangeTheme(value as PreferencesType["theme"])
                }}
                data={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "Theme like in OS" }
                ]}
                comboboxProps={{ withinPortal: false }}
                styles={this.inputStyles}
              />
            </Stack>

            <Group>
              <Button
                color={this.state.forgetConfirmation ? "red" : "blue"}
                onClick={() => {
                  this.handleForgetAccount()
                }}
              >
                {this.state.forgetButtonText}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    )
  }

  handleChangeCurrency(newCurrency: string) {
    this.setState((prevState) => {
      const preferences = { ...prevState.preferences, currency: newCurrency }
      void this.props.workerProxy!.setPreferences(preferences)
      return { ...prevState, currentCurrency: newCurrency, preferences }
    })
  }

  handleChangeTheme(theme: PreferencesType["theme"]) {
    this.setState((prevState) => {
      const preferences = { ...prevState.preferences, theme }
      void this.props.workerProxy!.setPreferences(preferences)
      return { ...prevState, currentTheme: theme, preferences }
    })
  }

  handleChangeMicropaymentThrottling(event: React.ChangeEvent<HTMLInputElement>) {
    const throttlingTimeFormatted = event.target.value
    this.setState((prevState) => {
      const preferences = {
        ...prevState.preferences,
        micropaymentThrottlingHumanReadable: throttlingTimeFormatted
      }
      void this.props.workerProxy!.setPreferences(preferences)
      return { ...prevState, throttlingTimeFormatted, preferences }
    })
  }

  handleChangeMicropaymentThreshold(event: React.ChangeEvent<HTMLInputElement>) {
    const newValueAsString = event.target.value
    let newValue = newValueAsString && newValueAsString.length > 0 ? parseInt(newValueAsString, 10) : 0
    if (newValue < 0 || Number.isNaN(newValue)) {
      newValue = 0
    }
    this.setState((prevState) => {
      const preferences = { ...prevState.preferences, micropaymentThreshold: newValue }
      void this.props.workerProxy!.setPreferences(preferences)
      return { ...prevState, preferences }
    })
  }

  handleForgetAccount() {
    if (this.state.forgetConfirmation !== true) {
      this.setState({ ...this.state, forgetConfirmation: true, forgetButtonText: "Click again to forget account" })
      setTimeout(() => {
        this.setState({ ...this.state, forgetConfirmation: false, forgetButtonText: "Forget account" })
      }, 4000)
    } else {
      this.props.workerProxy!.clearReduxPersistentStorage()
      this.props.clearTempState!()
      this.props.workerProxy!.clearAccountInfo()
    }
  }

  handleSavePrivateKeyToFile() {
    const blob = new Blob([this.privateKeyHex], { type: "text/plain" })
    const filename = "secretPrivateKey.txt"
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob?.(blob, filename)
    } else {
      const elem = window.document.createElement("a")
      elem.href = window.URL.createObjectURL(blob)
      elem.download = filename
      document.body.appendChild(elem)
      elem.click()
      document.body.removeChild(elem)
    }
  }

  async handleEnableBiometricUnlock() {
    if (!this.state.biometricPassword) {
      this.setState({ biometricMessage: "Enter wallet password first" })
      return
    }

    this.setState({ biometricLoading: true, biometricMessage: "Waiting for fingerprint confirmation…" })
    try {
      const accounts = await this.props.workerProxy!.provider.request<string[]>({
        method: "eth_accounts"
      })
      const activeAccount = accounts[0] || ""
      // Start WebAuthn immediately in click context to preserve user activation.
      const enrollPromise = enrollBiometricUnlock(this.state.biometricPassword, { userLabel: activeAccount })
      const unlockPromise = this.props.workerProxy!.doUnlock(this.state.biometricPassword)
      const [unlockError] = await Promise.all([unlockPromise, enrollPromise])
      if (unlockError) {
        await disableBiometricUnlock()
        this.setState({ biometricMessage: unlockError, biometricSetupOpened: false, biometricPassword: "" })
        return
      }
      this.setState({
        biometricConfigured: true,
        biometricSetupOpened: false,
        biometricPassword: "",
        biometricMessage: "Fingerprint unlock enabled"
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Fingerprint setup was cancelled"
            : error.message
          : "Could not enable fingerprint unlock"
      this.setState({
        biometricSetupOpened: false,
        biometricPassword: "",
        biometricMessage: message
      })
    } finally {
      this.setState({ biometricLoading: false })
    }
  }

  handleOpenBiometricSetup() {
    this.setState({
      biometricSetupOpened: true,
      biometricPassword: "",
      biometricMessage: null
    })
  }

  handleCloseBiometricSetup() {
    this.setState({
      biometricSetupOpened: false,
      biometricPassword: "",
      biometricMessage: null
    })
  }

  async handleDisableBiometricUnlock() {
    this.setState({ biometricLoading: true, biometricMessage: null })
    try {
      await disableBiometricUnlock()
      this.setState({
        biometricConfigured: false,
        biometricSetupOpened: false,
        biometricPassword: "",
        biometricMessage: "Fingerprint unlock disabled"
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not disable fingerprint unlock"
      this.setState({ biometricMessage: message })
    } finally {
      this.setState({ biometricLoading: false })
    }
  }
}

function mapStateToProps(state: FrameState, props: OwnPreferencesProps): PreferencesProps & OwnPreferencesProps {
  const workerProxy = state.temp.workerProxy
  return {
    workerProxy,
    showVerifiable: props.showVerifiable,
    preferences: state.shared.preferences
      ? state.shared.preferences
      : {
          micropaymentThreshold: 1000000,
          micropaymentThrottlingHumanReadable: "-1ms",
          currency: "ETH",
          theme: "light"
        }
  }
}

function mapDispatchToProps(dispatch: Dispatch): DispatchPreferencesProps {
  return {
    clearTempState: () => {
      dispatch(actions.clearTempState(true))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Preferences)
