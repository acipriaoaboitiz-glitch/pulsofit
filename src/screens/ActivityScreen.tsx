import { PageHeader } from '../components/bits'
import { WeightCard } from '../components/WeightCard'
import { ActivityPanel } from '../features/ActivityPanel'

export function ActivityScreen() {
  return (
    <div className="px-4 pb-8 lg:px-0">
      <PageHeader title="Progreso" sub="Peso, pasos y cardio" />
      <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <WeightCard />
        </div>
        <div className="lg:col-span-7">
          <ActivityPanel />
        </div>
      </div>
    </div>
  )
}
