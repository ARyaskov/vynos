import * as React from "react"
import { connect } from "react-redux"
import { FrameState } from "../../../redux/FrameState"
import { Anchor, Button, Container, Paper, Stack, Text, Title } from "@mantine/core"

export interface VerifiablePageProps {
  showVerifiable: () => void
  hideVerifiable: () => void
}

export interface VerifiablePageState {
  randNumber: number
}

export class VerifiablePage extends React.Component<VerifiablePageProps, VerifiablePageState> {
  win: Window | null

  constructor(props: VerifiablePageProps) {
    super(props)
    const randNumber = VerifiablePage.getRandomNumber(1000, 9999)
    localStorage.setItem("randNumber", randNumber.toString())
    this.state = { randNumber }
    this.win = null
  }

  static getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min)
  }

  show() {
    this.win = window.open("/check.html", "", "width=300,height=200")
    if (this.win) {
      this.win.onbeforeunload = () => {
        this.props.hideVerifiable()
      }
    }
  }

  componentWillUnmount() {
    if (this.win && !this.win.closed) {
      this.win.close()
    }
    localStorage.removeItem("randNumber")
  }

  render() {
    return (
      <Container size={520} py="xl">
        <Button variant="subtle" onClick={this.props.hideVerifiable} mb="sm">
          {"<-"} Verify Vynos
        </Button>
        <Paper withBorder p="lg" radius="md">
          <Stack align="center" gap="sm">
            <Title order={3}>Authenticity Check</Title>
            <Text ta="center">Please click the link below and compare numbers, they must be equal.</Text>
            <Text fw={800} size="xl">
              {this.state.randNumber}
            </Text>
            <Anchor component="button" onClick={this.show.bind(this)}>
              Verify authenticity Vynos
            </Anchor>
          </Stack>
        </Paper>
      </Container>
    )
  }
}

function mapStateToProps(_state: FrameState, props: VerifiablePageProps): VerifiablePageProps {
  return {
    showVerifiable: props.showVerifiable,
    hideVerifiable: props.hideVerifiable
  }
}

export default connect(mapStateToProps)(VerifiablePage)
