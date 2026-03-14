import { useAuthStore } from '@/store/auth'

export function HomePage() {
  const { profile } = useAuthStore()
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col gap-[4px]">
      <h2 className="font-heading text-[28px] font-medium leading-[1.3] tracking-[-0.2px] text-forest-950">
        Willkommen zurück{firstName ? `, ${firstName}` : ''}
      </h2>
      <p className="font-body text-[16px] leading-[1.5] text-neutral-500">
        Hier ist deine Team-Übersicht auf einen Blick.
      </p>
    </div>
  )
}
