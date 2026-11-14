import { v4 as uuidv4 } from 'uuid'

const KEY = 'neet_ai_client_id'

// Anonymous end-user identity (no login flow for regular users). Generated
// once per browser and sent as x-client-id on every public API request.
export function getClientId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = uuidv4()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}
