import type Payload from "./Payload"
import type { ResponsePayload } from "./Payload"

export interface VynosProvider {
  request: <T>(args: { method: string; params?: unknown[] }) => Promise<T>
  sendAsync?: <A extends Payload, B extends ResponsePayload>(payload: A, callback: (error: Error | null, response?: B) => void) => void
}
