import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { AppLogo } from '@/components/layout/AppLogo'
import { AppUserMenu } from '@/components/layout/AppUserMenu'
import { getUserAvatarUrl } from '@/lib/avatar'
import { appPageMainClassName } from '@/lib/appPageLayout'

type Props = {
  title?: string
}

export default function AppShellHeader({ title = 'Idealow' }: Props) {
  const user = useAuthStore(s => s.user)
  const [avatarUrl, setAvatarUrl] = useState('')
  const displayName = user?.username || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email ?? null

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUrl(user.avatarUrl)
      return
    }
    let active = true
    void (async () => {
      const url = await getUserAvatarUrl(user ? { id: user.id } : null)
      if (active) setAvatarUrl(url ?? '')
    })()
    return () => {
      active = false
    }
  }, [user?.avatarUrl, user?.id, user?.email, user?.username])

  return (
    <header className="border-b border-border bg-card py-4">
      <div className={appPageMainClassName('flex items-center justify-between gap-4')}>
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Link
            to="/dashboard"
            className="flex min-w-0 shrink-0 items-center gap-2 font-serif text-2xl tracking-tight text-foreground transition-colors hover:text-primary"
          >
            <AppLogo size="sm" decorative alignWithWordmark className="max-h-8 shrink-0" />
            <span className="truncate">{title}</span>
          </Link>
        </div>
        <AppUserMenu avatarUrl={avatarUrl} displayName={displayName} email={email} />
      </div>
    </header>
  )
}
