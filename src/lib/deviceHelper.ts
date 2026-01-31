/**
 * Get or create a unique device ID for this device.
 * The ID is stored in localStorage and persists across sessions.
 */
export const getDeviceId = (): string => {
  let storedId = localStorage.getItem('chorequest-device-id')
  if (!storedId) {
    storedId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('chorequest-device-id', storedId)
  }
  return storedId
}
