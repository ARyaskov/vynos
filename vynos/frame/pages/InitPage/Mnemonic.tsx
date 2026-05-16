import * as React from "react"
import { useSelector } from "react-redux"
import { Anchor, Box, Button, Container, Divider, Image, Paper, Stack, Tabs, Text, Textarea, Title } from "@mantine/core"
import QRCode from "qrcode"
import Logo from "../../components/Logo"
import type { FrameState } from "../../redux/FrameState"

export interface MnemonicProps {
  mnemonic?: string
  showVerifiable?: () => void
}

export default function Mnemonic({ mnemonic }: MnemonicProps): React.JSX.Element {
  const workerProxy = useSelector((state: FrameState) => state.temp.workerProxy)
  const [qrDataUri, setQrDataUri] = React.useState("")

  React.useEffect(() => {
    const updateQrCode = async () => {
      if (!mnemonic) {
        setQrDataUri("")
        return
      }
      const uri = await QRCode.toDataURL(mnemonic, { margin: 1 })
      setQrDataUri(uri)
    }
    void updateQrCode()
  }, [mnemonic])

  const handleSubmit = React.useCallback(
    (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault()
      workerProxy.didStoreMnemonic()
    },
    [workerProxy]
  )

  const handleSaveToFile = React.useCallback(() => {
    const phrase = mnemonic || ""
    const blob = new Blob([phrase], { type: "text/plain" })
    const filename = "secretSeedPhrase.txt"
    const legacyNavigator = window.navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean
      msSaveBlob?: (blob: Blob, defaultName?: string) => boolean
    }

    if (legacyNavigator.msSaveOrOpenBlob) {
      legacyNavigator.msSaveBlob?.(blob, filename)
      return
    }

    const elem = window.document.createElement("a")
    elem.href = window.URL.createObjectURL(blob)
    elem.download = filename
    document.body.appendChild(elem)
    elem.click()
    document.body.removeChild(elem)
  }, [mnemonic])

  const renderTabsLayout = () => (
    <Container size={520} py="xl">
      <Paper withBorder radius="md" p="lg">
        <Box component="form" onSubmit={handleSubmit}>
          <Tabs defaultValue="words">
            <Tabs.List>
              <Tabs.Tab value="words">Words</Tabs.Tab>
              <Tabs.Tab value="qr">QR</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="words" pt="sm">
              <Stack>
                <Title order={2}>Remember these words</Title>
                <Text>
                  Save them somewhere safe and secret. <br />
                  These restore the wallet.
                </Text>
                <Textarea rows={3} value={mnemonic} readOnly />
                <Anchor component="button" onClick={handleSaveToFile}>
                  Save words to file
                </Anchor>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="qr" pt="sm">
              <Stack>
                <Title order={2}>OR scan this</Title>
                {qrDataUri ? <Image src={qrDataUri} alt="Mnemonic QR" w={220} h={220} mx="auto" /> : null}
              </Stack>
            </Tabs.Panel>
          </Tabs>
          <Divider variant="dashed" my="md" />
          <Button type="submit">Done</Button>
        </Box>
      </Paper>
    </Container>
  )

  const renderOnlySeedPhrase = () => (
    <Container size={520} py="xl">
      <Paper withBorder radius="md" p="lg">
        <Stack>
          <Box ta="center">
            <Logo />
          </Box>
          <Divider variant="dashed" />
          <Title order={2} ta="center">
            Remember these words
          </Title>
          <Text ta="center">
            Save them somewhere safe and secret. <br />
            These restore the wallet.
          </Text>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack>
              <Textarea rows={3} value={mnemonic} readOnly />
              <Button type="submit">Done</Button>
              <Anchor component="button" onClick={handleSaveToFile}>
                Save words to file
              </Anchor>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )

  return process.env.QR_TAB ? renderTabsLayout() : renderOnlySeedPhrase()
}
