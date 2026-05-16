export const JSONRPC: string = "2.0"

export interface Payload {
  id: number | string
  jsonrpc: string
  method?: string
  params?: unknown
}

export default Payload

export interface RequestPayload extends Payload {
  method: string
  params: unknown
}

export interface ResponsePayload extends Payload {
  result: unknown
  error?: string
}

const EXTRA_DIGITS = 3
export function randomId() {
  const datePart = new Date().getTime() * Math.pow(10, EXTRA_DIGITS)
  // 3 random digits
  const extraPart = Math.floor(Math.random() * Math.pow(10, EXTRA_DIGITS))
  // 16 digits
  return datePart + extraPart
}
