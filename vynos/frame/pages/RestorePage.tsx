import * as React from "react"
import { Anchor, Box, Button, Container, Group, Paper, PasswordInput, Stack, Text, Textarea } from "@mantine/core"
import { useSelector } from "react-redux"
import { isHex } from "viem"
import * as bip39 from "bip39"
import { MINIMUM_PASSWORD_LENGTH, PASSWORD_CONFIRMATION_HINT_TEXT, PASSWORD_HINT_TEXT } from "../constants"
import WorkerProxy from "../WorkerProxy"
import { FrameState } from "../redux/FrameState"

const MAX_FILE_SIZE = 1048576 // 1mb

export interface RestorePageProps {
  showVerifiable?: () => void
  goBack: () => void
}

export interface RestorePageState {
  seed?: string
  seedError?: string
  password?: string
  passwordConfirmation?: string
  passwordError?: string
  passwordConfirmationError?: string
  fileError?: string
  fileIsHex?: boolean
  fileIsJSON?: boolean
  fileValue?: string
  incorrectKeyFile?: boolean
}

function clickInpFile() {
  document.getElementById("inpFilePrivKey")?.click()
}

export default function RestorePage({ goBack, showVerifiable }: RestorePageProps): React.JSX.Element {
  const workerProxy = useSelector((state: FrameState) => state.temp.workerProxy)
  const [state, setState] = React.useState<RestorePageState>({ incorrectKeyFile: false })

  const setValue = React.useCallback((value: Partial<RestorePageState>) => {
    setState((prev) => ({
      ...prev,
      passwordError: undefined,
      passwordConfirmationError: undefined,
      seedError: undefined,
      ...value
    }))
  }, [])

  const checkFile = React.useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setState((prev) => ({ ...prev, fileError: "File too large", fileIsHex: false, fileIsJSON: false }))
      return
    }

    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const fileData = event.target?.result
      if (typeof fileData !== "string") {
        setState((prev) => ({ ...prev, fileError: "Unable to read file", fileIsHex: false, fileIsJSON: false }))
        return
      }

      if (isHex(fileData)) {
        setState((prev) => ({ ...prev, fileIsHex: true, fileIsJSON: false, fileValue: fileData, fileError: "" }))
      } else {
        try {
          JSON.parse(fileData)
          setState((prev) => ({ ...prev, fileIsHex: false, fileIsJSON: true, fileValue: fileData, fileError: "" }))
        } catch {
          setState((prev) => ({ ...prev, fileIsHex: false, fileIsJSON: false, fileError: "Unsupported key file format" }))
        }
      }
    }
    reader.readAsText(file)
  }, [])

  React.useEffect(() => {
    const onDrag = (event: DragEvent) => {
      if (!event.dataTransfer) return
      event.stopPropagation()
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }

    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer) return
      event.stopPropagation()
      event.preventDefault()
      const files = event.dataTransfer.files
      if (files && files.length) {
        checkFile(files[0])
      } else {
        setState((prev) => ({ ...prev, fileError: "", fileIsHex: false, fileIsJSON: false, incorrectKeyFile: false }))
      }
    }

    document.addEventListener("dragover", onDrag, false)
    document.addEventListener("drop", onDrop, false)
    return () => {
      document.removeEventListener("dragover", onDrag, false)
      document.removeEventListener("drop", onDrop, false)
    }
  }, [checkFile])

  const isValid = React.useCallback((current: RestorePageState): boolean => {
    let passwordError = current.passwordError
    if (current.password && current.password.length < MINIMUM_PASSWORD_LENGTH) {
      passwordError = PASSWORD_HINT_TEXT
    }

    let passwordConfirmationError = current.passwordConfirmationError
    if (current.passwordConfirmation !== current.password && current.passwordConfirmation) {
      passwordConfirmationError = PASSWORD_CONFIRMATION_HINT_TEXT
    }

    let seedError = current.seedError
    if (current.seed && !bip39.validateMnemonic(current.seed)) {
      seedError = "Probably mistyped seed phrase"
    }

    setState((prev) => ({
      ...prev,
      passwordError,
      passwordConfirmationError,
      seedError
    }))

    return !(passwordError || passwordConfirmationError || seedError)
  }, [])

  const clearIndexedDB = React.useCallback(() => {
    workerProxy.clearAccountInfo()
  }, [workerProxy])

  const handleSubmit = React.useCallback(
    async (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault()
      setState((prev) => ({ ...prev, incorrectKeyFile: false }))

      const current = state
      if (!current.password || !isValid(current)) {
        return
      }

      if (current.fileIsHex && current.fileValue) {
        const ok = await workerProxy.restoreWallet(current.password, "hex", current.fileValue)
        if (ok === "true") {
          clearIndexedDB()
          goBack()
        } else {
          setState((prev) => ({ ...prev, incorrectKeyFile: true }))
        }
        return
      }

      if (current.fileIsJSON && current.fileValue) {
        const ok = await workerProxy.restoreWallet(current.password, "json", current.fileValue)
        if (ok === "true") {
          clearIndexedDB()
          goBack()
        } else {
          setState((prev) => ({ ...prev, incorrectKeyFile: true }))
        }
        return
      }

      if (current.seed) {
        await workerProxy.restoreWallet(current.password, "seed", current.seed)
        clearIndexedDB()
        goBack()
      }
    },
    [clearIndexedDB, goBack, isValid, state, workerProxy]
  )

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length) {
        checkFile(files[0])
        return
      }
      setState((prev) => ({ ...prev, fileError: "", fileIsHex: false, fileIsJSON: false, incorrectKeyFile: false }))
    },
    [checkFile]
  )

  return (
    <Box>
      <Button variant="subtle" onClick={goBack} mb="sm">
        {"<-"} Restore a Wallet
      </Button>
      <Container size={520}>
        <Paper withBorder p="md" radius="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              {state.incorrectKeyFile ? <Text c="red">Incorrect key file</Text> : null}
              <Stack gap={4}>
                {state.fileIsHex || state.fileIsJSON ? null : (
                  <Textarea placeholder="Seed Phrase" rows={3} error={state.seedError} onChange={(ev) => setValue({ seed: ev.target.value })} />
                )}
                {state.fileIsHex || state.fileIsJSON ? null : state.seedError ? (
                  <Text c="red" size="sm">
                    {state.seedError}
                  </Text>
                ) : (
                  <Text c="dimmed" size="sm">
                    Enter a valid BIP39 seed phrase
                  </Text>
                )}
                <Group justify="flex-end">
                  {state.fileIsHex ? (
                    <Text c="dimmed" size="sm">
                      And now set the password
                    </Text>
                  ) : state.fileIsJSON ? (
                    <Text c="dimmed" size="sm">
                      And now set the password for unlocking
                    </Text>
                  ) : (
                    <Anchor onClick={clickInpFile}>Select private key file</Anchor>
                  )}
                </Group>
              </Stack>
              {state.fileError ? (
                <Text c="red" size="sm">
                  {state.fileError}
                </Text>
              ) : null}
              <input type="file" id="inpFilePrivKey" style={{ display: "none" }} onChange={handleFileChange} />
              <Stack gap={4}>
                <PasswordInput
                  placeholder="Password"
                  autoComplete="new-password"
                  error={state.passwordError}
                  onChange={(ev) => setValue({ password: ev.target.value })}
                />
                {state.passwordError ? (
                  <Text c="red" size="sm">
                    {state.passwordError}
                  </Text>
                ) : (
                  <Text c="dimmed" size="sm">
                    At least {MINIMUM_PASSWORD_LENGTH} characters
                  </Text>
                )}
              </Stack>
              <Stack gap={4}>
                <PasswordInput
                  placeholder="Password Confirmation"
                  autoComplete="new-password"
                  error={state.passwordConfirmationError}
                  onChange={(ev) => setValue({ passwordConfirmation: ev.target.value })}
                />
                {state.passwordConfirmationError ? (
                  <Text c="red" size="sm">
                    {state.passwordConfirmationError}
                  </Text>
                ) : (
                  <Text size="sm">&nbsp;</Text>
                )}
              </Stack>
              <Button type="submit">Restore</Button>
            </Stack>
          </form>
        </Paper>
      </Container>
      {showVerifiable ? (
        <Button variant="light" size="xs" onClick={showVerifiable} style={{ position: "fixed", right: 12, bottom: 12 }}>
          Security
        </Button>
      ) : null}
    </Box>
  )
}
