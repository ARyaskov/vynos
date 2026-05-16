import * as React from "react"
import { Box, Button, Container, Paper, Stack, Text, Title } from "@mantine/core"

export interface TermsTextPageProps {
  goBack: () => void
}

export default function TermsTextPage({ goBack }: TermsTextPageProps): React.JSX.Element {
  return (
    <Container size={800} py="lg">
      <Button variant="subtle" onClick={goBack} mb="sm">
        {"<-"} Terms of Use
      </Button>
      <Paper withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Title order={2}>Terms of Use</Title>
          <Box style={{ maxHeight: "65vh", overflow: "auto" }}>
            <Text mt="sm">
              Vynos Service is currently offered as a private beta. While we will make efforts to ensure that Vynos is stable and provided in an
              error-free fashion, certain technical issues may appear from time to time. File security and access cannot be guaranteed. If you
              experience an issue with Vynos, or find any bugs you would like to help us fix, please contact us.
            </Text>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}
