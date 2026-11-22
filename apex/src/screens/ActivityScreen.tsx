import { PageHeader } from '../components/bits'
import { ActivityPanel } from '../features/ActivityPanel'

export function ActivityScreen() {
  return (
    <div className="px-4 pb-8">
      <PageHeader title="Actividad" sub="Pasos 24/7 y cardio" />
      <ActivityPanel />
    </div>
  )
}
