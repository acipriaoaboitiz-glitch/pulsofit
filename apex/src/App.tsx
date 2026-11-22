import { useEffect, useRef } from 'react'
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
import { SideNav } from './components/SideNav'
import { QuickMenu } from './features/QuickMenu'
import { ScannerSheet } from './features/ScannerSheet'
import { PhotoSheet } from './features/PhotoSheet'
import { ProductSheet } from './features/ProductSheet'
import { CustomSheet, SearchSheet } from './features/SearchSheet'
import { ProfileSheet } from './features/ProfileSheet'
import { ActiveWorkout } from './features/ActiveWorkout'
import { AddExerciseSheet, QuickActivitySheet, StepSyncer } from './features/GlobalSheets'

function Shell() {
  const { state } = useStore()
  const { tab } = useUI()
  const scroller = useRef<HTMLElement>(null)

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
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
      <QuickActivitySheet />
      <StepSyncer />
      <ProfileSheet />
      <SummarySheet />
      <ActiveWorkout />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <UIProvider>
          <Shell />
        </UIProvider>
      </AuthProvider>
    </StoreProvider>
  )
}
