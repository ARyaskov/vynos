import * as React from "react"
import { useSelector } from "react-redux"
import { Anchor, Box, Button, Container, Divider, Paper, PasswordInput, Stack, Text } from "@mantine/core"
import Logo from "../components/Logo"
import { FrameState } from "../redux/FrameState"
import RestorePage from "./RestorePage"
import { getPasswordByBiometric, isBiometricUnlockConfigured, isBiometricUnlockSupported } from "../lib/biometricUnlock"

export interface OwnUnlockProps {
  showVerifiable: () => void
}

export type UnlockPageState = {
  password: string
  passwordError: string | null
  loading: boolean
  displayRestore: boolean
  biometricConfigured: boolean
  biometricLoading: boolean
  biometricError: string | null
}

export default function UnlockPage({ showVerifiable }: OwnUnlockProps): React.JSX.Element {
  const workerProxy = useSelector((state: FrameState) => state.temp.workerProxy)
  const biometricAutoAttemptedRef = React.useRef(false)
  const [state, setState] = React.useState<UnlockPageState>({
    password: "",
    passwordError: null,
    loading: false,
    displayRestore: false,
    biometricConfigured: false,
    biometricLoading: false,
    biometricError: null
  })

  React.useEffect(() => {
    const load = async () => {
      if (!isBiometricUnlockSupported()) {
        return
      }
      const configured = await isBiometricUnlockConfigured()
      setState((prev) => ({ ...prev, biometricConfigured: configured }))
    }
    void load()
  }, [])

  const handleSubmit = React.useCallback(
    (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault()
      setState((prev) => ({ ...prev, loading: true }))
      const password = (state.password || "").toString()
      workerProxy
        .doUnlock(password)
        .then((errorReason) => {
          if (errorReason) {
            setState((prev) => ({ ...prev, passwordError: errorReason }))
          }
        })
        .finally(() => {
          setState((prev) => ({ ...prev, loading: false }))
        })
    },
    [state.password, workerProxy]
  )

  const handleBiometricUnlock = React.useCallback(async () => {
    setState((prev) => ({ ...prev, biometricLoading: true, biometricError: null, passwordError: null }))
    try {
      const password = await getPasswordByBiometric()
      const errorReason = await workerProxy.doUnlock(password)
      if (errorReason) {
        setState((prev) => ({ ...prev, biometricError: errorReason }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Biometric unlock failed"
      setState((prev) => ({ ...prev, biometricError: message }))
    } finally {
      setState((prev) => ({ ...prev, biometricLoading: false }))
    }
  }, [workerProxy])

  React.useEffect(() => {
    if (!state.biometricConfigured) {
      return
    }
    if (biometricAutoAttemptedRef.current) {
      return
    }
    if (state.loading || state.biometricLoading || state.displayRestore || state.password) {
      return
    }
    biometricAutoAttemptedRef.current = true
    void handleBiometricUnlock()
  }, [handleBiometricUnlock, state.biometricConfigured, state.loading, state.biometricLoading, state.displayRestore, state.password])

  if (state.displayRestore) {
    return <RestorePage goBack={() => setState((prev) => ({ ...prev, displayRestore: false }))} showVerifiable={showVerifiable} />
  }

  return (
    <Container size={420} py="xl">
      <Paper withBorder radius="md" p="lg">
        <Stack gap="sm" align="stretch">
          <Box ta="center">
            <Logo />
          </Box>
          <Divider variant="dashed" />
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <PasswordInput
                placeholder="Password"
                onChange={(event) => setState((prev) => ({ ...prev, password: event.target.value, passwordError: null }))}
                autoComplete="wallet-password"
                error={state.passwordError ?? undefined}
              />
              {!state.passwordError && <Text size="sm">&nbsp;</Text>}
              <Button type="submit" loading={state.loading}>
                Unlock
              </Button>
              {state.biometricConfigured && (
                <Button variant="light" onClick={handleBiometricUnlock} loading={state.biometricLoading}>
                  Unlock with fingerprint
                </Button>
              )}
              {state.biometricError && (
                <Text size="sm" c="red">
                  {state.biometricError}
                </Text>
              )}
              <Anchor component="button" onClick={() => setState((prev) => ({ ...prev, displayRestore: true }))}>
                Restore wallet
              </Anchor>
            </Stack>
          </form>
        </Stack>
      </Paper>
      <Box ta="right" mt="xs">
        <Anchor component="button" onClick={showVerifiable}>
          Verify Vynos
        </Anchor>
      </Box>
    </Container>
  )
}
