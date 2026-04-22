import { useCallback } from 'react'
import { registerSW } from 'virtual:pwa-register/react'

export function usePWAUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = registerSW({
    onNeedRefresh() {},
    onOfflineReady() {},
  })

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true)
  }, [updateServiceWorker])

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: handleUpdate,
  }
}