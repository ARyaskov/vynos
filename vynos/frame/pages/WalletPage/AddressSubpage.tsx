import * as React from "react"
import { Button, Divider, Stack, Text, Anchor, Image, Group, Box } from "@mantine/core"
import QRCode from "qrcode"

export interface AddressSubpageProps {
  address: string
  network: string
  showSend(): void
}

export interface AddressSubpageState {
  qrDataUri: string
  refillCopied: boolean
}

export default class AddressSubpage extends React.Component<AddressSubpageProps, AddressSubpageState> {
  constructor(props: AddressSubpageProps) {
    super(props)
    this.state = {
      qrDataUri: "",
      refillCopied: false
    }

    this.onRefill = this.onRefill.bind(this)
  }

  async componentDidMount() {
    await this.updateQrCode(this.props.address)
  }

  async componentDidUpdate(prevProps: AddressSubpageProps) {
    if (prevProps.address !== this.props.address) {
      await this.updateQrCode(this.props.address)
    }
  }

  async updateQrCode(value: string) {
    if (!value) {
      this.setState({ qrDataUri: "" })
      return
    }
    const qrDataUri = await QRCode.toDataURL(value, { margin: 1 })
    this.setState({ qrDataUri })
  }

  etherscanLink(): string {
    switch (this.props.network) {
      case "Sepolia":
        return `https://sepolia.etherscan.io/address/${this.props.address}`
      case "Ropsten":
        return `https://sepolia.etherscan.io/address/${this.props.address}`
      case "Rinkeby":
        return `https://sepolia.etherscan.io/address/${this.props.address}`
      case "Main":
        return `https://etherscan.io/address/${this.props.address}`
      default:
        return "about:blank"
    }
  }

  renderQR() {
    if (!this.state.qrDataUri) {
      return null
    }
    return <Image src={this.state.qrDataUri} alt="Wallet QR code" w={190} h={190} mx="auto" />
  }

  renderLink() {
    if (this.props.network) {
      return (
        <Anchor href={this.etherscanLink()} target="_blank" rel="noreferrer">
          View on Etherscan
        </Anchor>
      )
    }
    return <Text c="dimmed">No explorer link</Text>
  }

  render() {
    return (
      <Stack gap="sm" py="sm">
        <Group grow>
          <Button type="button" variant="light" onClick={this.onRefill} disabled={!this.props.address}>
            {this.state.refillCopied ? "Address copied" : "Refill"}
          </Button>
          <Button type="button" onClick={this.props.showSend}>
            Send
          </Button>
        </Group>
        <Divider variant="dashed" />
        <Text ta="center" fw={500} style={{ wordBreak: "break-all" }}>
          {this.props.address}
        </Text>
        <Box ta="center">{this.renderLink()}</Box>
        <Divider variant="dashed" />
        <Box ta="center">{this.renderQR()}</Box>
      </Stack>
    )
  }

  async onRefill(): Promise<void> {
    if (!this.props.address) {
      return
    }
    try {
      await navigator.clipboard.writeText(this.props.address)
      this.setState({ refillCopied: true })
      globalThis.setTimeout(() => this.setState({ refillCopied: false }), 1800)
    } catch (error) {
      console.error(error)
    }
    globalThis.open(this.etherscanLink(), "_blank", "noopener,noreferrer")
  }
}
