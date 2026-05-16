import * as React from "react"
import { ActionIcon, Burger, Group, Image, Menu, Paper, ScrollArea, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import WalletMenuItem from "./WalletMenuItem"
import type { FrameState } from "../../redux/FrameState"
import SIGN_IN_LOGO from "../../styles/images/sign-in_logo.svg"

export interface WalletMenuStateProps {
  doLock: () => void
  rememberPath: (path: string) => void
  path: string
  currentName: string
}

export type WalletMenuProps = React.PropsWithChildren<object>

export function nameByPath(path: string): string {
  switch (path) {
    case "/wallet/channels":
      return "Channels"
    case "/wallet/preferences":
      return "Preferences"
    case "/wallet/network":
      return "Network"
    default:
      return "Wallet"
  }
}

export default function WalletMenu({ children }: WalletMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false)
  const workerProxy = useSelector((state: FrameState) => state.temp.workerProxy)
  const currentName = useSelector((state: FrameState) => nameByPath(state.shared.rememberPath))

  const handleChangeItem = React.useCallback(
    (_name: string, href: string) => {
      workerProxy.rememberPage(href)
    },
    [workerProxy]
  )

  return (
    <div className="vynos-wallet-layout">
      <Paper withBorder radius={0} p="xs" className="vynos-topbar">
        <Group justify="space-between" wrap="nowrap">
          <Menu onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)} position="bottom-start" shadow="md">
            <Menu.Target>
              <Burger opened={isOpen} size="sm" aria-label="Wallet menu" />
            </Menu.Target>
            <Menu.Dropdown>
              <WalletMenuItem icon={<span className="vynos-menu-badge">W</span>} name="Wallet" href="/wallet/dashboard" onChange={handleChangeItem} />
              <WalletMenuItem
                icon={<span className="vynos-menu-badge">C</span>}
                name="Channels"
                href="/wallet/channels"
                onChange={handleChangeItem}
              />
              <WalletMenuItem
                icon={<span className="vynos-menu-badge">P</span>}
                name="Preferences"
                href="/wallet/preferences"
                onChange={handleChangeItem}
              />
              <WalletMenuItem icon={<span className="vynos-menu-badge">N</span>} name="Network" href="/wallet/network" onChange={handleChangeItem} />
            </Menu.Dropdown>
          </Menu>
          <Image src={SIGN_IN_LOGO} w={84} />
          <ActionIcon className="vynos-lock-button" variant="subtle" onClick={() => workerProxy.doLock()} aria-label="Lock wallet" size="lg">
            <Text size="md" fw={700}>
              Lock
            </Text>
          </ActionIcon>
        </Group>
        <Text size="sm" c="dimmed" mt={4} className="vynos-section-title">
          {currentName}
        </Text>
      </Paper>
      <ScrollArea.Autosize className="vynos-content-scroll" mah="calc(100vh - 96px)" type="auto" scrollbarSize={8} offsetScrollbars>
        {children}
      </ScrollArea.Autosize>
    </div>
  )
}
