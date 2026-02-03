/**
 * Check if push notifications are supported in the current browser
 */
export const isPushNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}
