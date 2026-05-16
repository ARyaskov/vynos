import * as React from "react"
import { Menu } from "@mantine/core"

export interface WalletMenuItemProps {
  href: string
  name: string
  icon?: React.ReactNode
  onChange: (name: string, href: string) => void
}

export default function WalletMenuItem({ href, name, icon, onChange }: WalletMenuItemProps): React.JSX.Element {
  return (
    <Menu.Item leftSection={icon} onClick={() => onChange(name, href)}>
      {name}
    </Menu.Item>
  )
}
