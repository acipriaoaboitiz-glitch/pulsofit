import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline shell + installability (production only, so dev HMR is never cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update()
        })
        let reloaded = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return
          reloaded = true
          window.location.reload() // a new deployment took control: load it right away
        })
      })
      .catch(() => {
        /* ignore: PWA still installs without offline cache */
      })
  })
}

// Cursor spotlight on glass cards (mouse only; costs nothing on touch)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let raf = 0
  document.addEventListener('pointermove', (e) => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  })
}

// Global touch feedback: a light 15 ms vibration on every button / tab / option tap
document.addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType === 'mouse') return
    const el = (e.target as Element | null)?.closest?.('button, a, [role="tab"], [role="radio"], [role="menuitem"]') as HTMLButtonElement | null
    if (el && !el.disabled) navigator.vibrate?.(15)
  },
  { passive: true },
)
