import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StoreProvider, useStore } from './lib/store'
import { AuthProvider } from './lib/auth'
import { UIProvider, useUI } from './lib/ui'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { Nutrition } from './screens/Nutrition'
import { Gym, StartSheet, SummarySheet } from './screens/Gym'
import { ActivityScreen } from './screens/ActivityScreen'
import { TabBar } from './components/TabBar'
import { Intro } from './components/Intro'
import { SideNav } from './components/SideNav'
import { QuickMenu } from './features/QuickMenu'
import { ScannerSheet } from './features/ScannerSheet'
import { PhotoSheet } from './features/PhotoSheet'
import { ProductSheet } from './features/ProductSheet'
import { CustomSheet, SearchSheet } from './features/SearchSheet'
import { ProfileSheet } from './features/ProfileSheet'
import { ActiveWorkout } from './features/ActiveWorkout'
import { AddExerciseSheet, MagicSheet, QuickActivitySheet, StepSyncer } from './features/GlobalSheets'

const TAB_ORDER = ['hoy', 'nutricion', 'gimnasio', 'actividad'] as const

function Shell({ ready }: { ready: boolean }) {
  const { state } = useStore()
  const { tab } = useUI()
  const scroller = useRef<HTMLElement>(null)
  const prev = useRef<number>(0)
  const idx = TAB_ORDER.indexOf(tab)
  // slide direction follows the position of the tab in the dock
  const dir = idx >= prev.current ? 1 : -1
  useEffect(() => {
    prev.current = idx
  }, [idx])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab])

  if (!state.profile) {
    return (
      <div className="mx-auto h-full max-w-[520px] overflow-y-auto lg:max-w-[560px]">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="page-bg h-full">
      <SideNav />
      <div className="mx-auto h-full max-w-[520px] lg:max-w-none lg:pl-[248px]">
      <main ref={scroller} className="h-full overflow-y-auto overscroll-contain pb-[calc(120px+var(--safe-bottom))] lg:pb-10">
        <div className="mx-auto w-full lg:max-w-[1120px] lg:px-8 xl:px-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className={ready ? 'rise' : undefined}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'hoy' && <Today />}
            {tab === 'nutricion' && <Nutrition />}
            {tab === 'gimnasio' && <Gym />}
            {tab === 'actividad' && <ActivityScreen />}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>
      </div>

      <TabBar />
      <QuickMenu />
      <ScannerSheet />
      <PhotoSheet />
      <SearchSheet />
      <ProductSheet />
      <CustomSheet />
      <StartSheet />
      <AddExerciseSheet />
      <MagicSheet />
      <QuickActivitySheet />
      <StepSyncer />
      <ProfileSheet />
      <SummarySheet />
      <ActiveWorkout />
    </div>
  )
}

export default function App() {
  // the cinematic plays once per visit (session)
  const [introDone, setIntroDone] = useState(() => {
    try {
      return sessionStorage.getItem('apex.intro') === '1'
    } catch {
      return false
    }
  })
  return (
    <StoreProvider>
      <AuthProvider>
        <UIProvider>
          <div aria-hidden className="aurora">
            <i className="a1" />
            <i className="a2" />
            <i className="a3" />
          </div>
          <Shell ready={introDone} />
          {!introDone && (
            <Intro
              onDone={() => {
                try {
                  sessionStorage.setItem('apex.intro', '1')
                } catch {
                  /* ignore */
                }
                setIntroDone(true)
              }}
            />
          )}
        </UIProvider>
      </AuthProvider>
    </StoreProvider>
  )
}
