import { useSyncExternalStore } from 'react'

/** Reactive `matchMedia` (updates when the window is resized or the device rotates). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** ≥ 1024 px: the widescreen layout (sidebar + dialogs). */
export const useDesktop = (): boolean => useMedia('(min-width: 1024px)')
