import * as React from "react"
import { useDispatch, useSelector } from "react-redux"
import { Anchor, Box, Button, Container, Divider, Paper, PasswordInput, Stack, Text, Title } from "@mantine/core"
import { MINIMUM_PASSWORD_LENGTH, PASSWORD_CONFIRMATION_HINT_TEXT, PASSWORD_HINT_TEXT } from "../../constants"
import RestorePage from "../RestorePage"
import Logo from "../../components/Logo"
import * as actions from "../../redux/actions"
import type { FrameState } from "../../redux/FrameState"

export interface PasswordState {
  password: string
  passwordConfirmation: string
  passwordError: null | string
  passwordConfirmationError: null | string
  submitError: null | string
  submitting: boolean
  displayRestore: boolean
}

export interface OwnPasswordProps {
  showVerifiable: () => void
}

export default function Password({ showVerifiable }: OwnPasswordProps): React.JSX.Element {
  const workerProxy = useSelector((state: FrameState) => state.temp.workerProxy)
  const dispatch = useDispatch()
  const [state, setState] = React.useState<PasswordState>({
    password: "",
    passwordConfirmation: "",
    passwordError: null,
    passwordConfirmationError: null,
    submitError: null,
    submitting: false,
    displayRestore: false
  })

  const validate = React.useCallback((current: PasswordState): boolean => {
    let passwordError = current.passwordError
    if (current.password.length < MINIMUM_PASSWORD_LENGTH) {
      passwordError = PASSWORD_HINT_TEXT
    }

    let passwordConfirmationError = current.passwordConfirmationError
    if (current.passwordConfirmation !== current.password && current.password) {
      passwordConfirmationError = PASSWORD_CONFIRMATION_HINT_TEXT
    }

    setState((prev) => ({ ...prev, passwordError, passwordConfirmationError }))
    return !(passwordError || passwordConfirmationError)
  }, [])

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!validate(state) || !state.password) {
        return
      }

      setState((prev) => ({ ...prev, submitting: true, submitError: null }))
      workerProxy
        .genKeyring(state.password)
        .then((mnemonic) => {
          dispatch(actions.didReceiveMnemonic(mnemonic))
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unable to create wallet"
          setState((prev) => ({ ...prev, submitError: message }))
        })
        .finally(() => {
          setState((prev) => ({ ...prev, submitting: false }))
        })
    },
    [dispatch, state, validate, workerProxy]
  )

  if (state.displayRestore) {
    return <RestorePage goBack={() => setState((prev) => ({ ...prev, displayRestore: false }))} />
  }

  return (
    <Container size={460} py="xl">
      <Paper withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Box ta="center">
            <Logo />
          </Box>
          <Divider variant="dashed" />
          <Title order={2} ta="center">
            Encrypt your new wallet
          </Title>
          <form onSubmit={handleSubmit}>
            <Stack gap="xs">
              <PasswordInput
                placeholder="Password"
                onChange={(ev) => setState((prev) => ({ ...prev, password: ev.target.value, passwordError: null, passwordConfirmationError: null }))}
                autoComplete="new-password"
                error={state.passwordError ?? undefined}
              />
              {!state.passwordError && (
                <Text size="sm" c="dimmed">
                  At least {MINIMUM_PASSWORD_LENGTH} characters
                </Text>
              )}
              <PasswordInput
                placeholder="Password Confirmation"
                onChange={(ev) =>
                  setState((prev) => ({ ...prev, passwordConfirmation: ev.target.value, passwordError: null, passwordConfirmationError: null }))
                }
                autoComplete="new-password"
                error={state.passwordConfirmationError ?? undefined}
              />
              {!state.passwordConfirmationError && <Text size="sm">&nbsp;</Text>}
              {state.submitError && (
                <Text c="red" size="sm">
                  {state.submitError}
                </Text>
              )}
              <Button type="submit" loading={state.submitting}>
                Create wallet
              </Button>
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
