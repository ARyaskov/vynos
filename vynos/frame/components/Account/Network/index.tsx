import * as React from "react"
import { Button, Container, Group, Paper, Radio, Stack, Text, TextInput, UnstyledButton } from "@mantine/core"
import SettingStorage, { type NetworkSetting } from "../../../../lib/storage/SettingStorage"
import { useSelector } from "react-redux"
import type { FrameState } from "../../../redux/FrameState"
import networks from "../../../../../data/networks.json"

export interface NetworkProps {
  changeNetwork: () => void
}

export interface NetworkState {
  value: string
  customNetwork: string
  savedCustomNetwork: string
}

export default function Network(): React.JSX.Element {
  const changeNetwork = useSelector((state: FrameState) => () => state.temp.workerProxy.changeNetwork())
  const settingStorage = React.useMemo(() => new SettingStorage(), [])
  const networkNames = React.useMemo(() => Object.keys(networks), [])
  const [state, setState] = React.useState<NetworkState>({ value: "0", customNetwork: "", savedCustomNetwork: "" })

  const saveNetwork = React.useCallback(
    (nextState: NetworkState) => {
      const network = nextState.value === "Other" ? nextState.customNetwork : nextState.value
      settingStorage.save("network", network).then(changeNetwork).catch(console.error)
      setState((prev) => ({ ...prev, savedCustomNetwork: nextState.customNetwork }))
    },
    [changeNetwork, settingStorage]
  )

  React.useEffect(() => {
    const hydrate = async () => {
      const resultNetwork: NetworkSetting = await settingStorage.getNetwork()
      if (networkNames.includes(resultNetwork.name)) {
        setState((prev) => ({ ...prev, value: resultNetwork.name }))
      } else {
        setState((prev) => ({
          ...prev,
          value: "Other",
          customNetwork: resultNetwork.value,
          savedCustomNetwork: resultNetwork.value
        }))
      }
    }
    void hydrate()
  }, [networkNames, settingStorage])

  const showSaveButton = state.customNetwork !== state.savedCustomNetwork
  const options = React.useMemo(() => [...networkNames, "Other"], [networkNames])

  const selectNetwork = React.useCallback(
    (value: string) => {
      const nextState = { ...state, value }
      setState(nextState)
      saveNetwork(nextState)
    },
    [saveNetwork, state]
  )

  return (
    <Container p={0}>
      <Paper withBorder p="md" radius="md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            saveNetwork(state)
          }}
        >
          <Stack gap="xs">
            {options.map((network) => {
              const checked = state.value === network
              return (
                <UnstyledButton
                  key={network}
                  onClick={() => selectNetwork(network)}
                  style={{
                    border: `1px solid ${checked ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-3)"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: checked ? "var(--mantine-color-blue-0)" : "white"
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={checked ? 600 : 500}>{network}</Text>
                    <Radio.Indicator checked={checked} />
                  </Group>
                </UnstyledButton>
              )
            })}
            {state.value === "Other" && (
              <>
                <TextInput
                  mt="xs"
                  type="text"
                  placeholder="http://127.0.0.1:8545"
                  onChange={(event) => setState((prev) => ({ ...prev, customNetwork: event.target.value }))}
                  value={state.customNetwork}
                  id="customNetwork"
                />
                <Button type="submit" disabled={!state.customNetwork} style={{ display: showSaveButton ? "inline-block" : "none" }}>
                  Save network
                </Button>
              </>
            )}
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
