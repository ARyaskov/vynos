import * as React from "react"
import { useDispatch } from "react-redux"
import { Anchor, Button, Container, Divider, Paper, Stack, Text } from "@mantine/core"
import * as actions from "../../redux/actions"
import TermsTextPage from "../TermsTextPage"
import RestorePage from "../RestorePage"
import Logo from "../../components/Logo"

export interface TermsSubpageProps {
  showVerifiable: () => void
}

export interface TermsState {
  displayTermsText: boolean
  displayRestore: boolean
}

export default function Terms({ showVerifiable }: TermsSubpageProps): React.JSX.Element {
  const dispatch = useDispatch()
  const [state, setState] = React.useState<TermsState>({
    displayTermsText: false,
    displayRestore: false
  })

  if (state.displayTermsText) {
    return <TermsTextPage goBack={() => setState((prev) => ({ ...prev, displayTermsText: false }))} />
  }

  if (state.displayRestore) {
    return <RestorePage goBack={() => setState((prev) => ({ ...prev, displayRestore: false }))} showVerifiable={showVerifiable} />
  }

  return (
    <Container size={460} py="xl">
      <Paper withBorder radius="md" p="lg">
        <Stack align="center" gap="sm">
          <Logo />
          <Divider variant="dashed" w="100%" />
          <Text ta="center">
            Ready to unlock a true value
            <br />
            of quality content
            <br />
            through <em>real</em> micropayments?
          </Text>
          <Anchor component="button" onClick={() => setState((prev) => ({ ...prev, displayTermsText: true }))}>
            Read terms
          </Anchor>
          <Button onClick={() => dispatch(actions.didAcceptTerms(true))}>Accept</Button>
          <Anchor component="button" onClick={() => setState((prev) => ({ ...prev, displayRestore: true }))}>
            Restore wallet
          </Anchor>
        </Stack>
      </Paper>
    </Container>
  )
}
