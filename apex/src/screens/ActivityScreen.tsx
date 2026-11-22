import { PageHeader } from '../components/bits'
import { WeightCard } from '../components/WeightCard'
import { ActivityPanel } from '../features/ActivityPanel'

export function ActivityScreen() {
  return (
    <div className="px-4 pb-8 lg:px-0">
      <PageHeader title="Progreso" sub="Peso, pasos y cardio" />
      <div className="space-y-4">
        <div className="lg:max-w-[560px]">
          <WeightCard />
        </div>
        <ActivityPanel />
      </div>
    </div>
  )
}
