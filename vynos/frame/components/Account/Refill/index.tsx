import * as React from "react"
import { Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core"

const Refill: React.FC = () => {
  return (
    <Container py="md">
      <Paper withBorder p="md" radius="md">
        <Stack>
          <Title order={4}>Using US dollars</Title>
          <Text size="sm" c="dimmed">
            For US citizens only
          </Text>
          <Group>
            <Button variant="light">Via Coinbase</Button>
          </Group>
          <Title order={4}>Using cryptocurrency</Title>
          <Group>
            <Button variant="light">Via Changelly</Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  )
}

export default Refill
