import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Lightbulb, LogOut, UserCircle, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  avatarUrl: string
  displayName: string
  email: string | null
}

export function AppUserMenu({ avatarUrl, displayName, email }: Props) {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const [, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="relative" ref={rootRef}>
      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger
          type="button"
          className="rounded-full outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Menú de cuenta"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de ${displayName}`}
              className="size-9 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-border">
              <UserCircle className="size-5" />
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-[14rem] rounded-2xl p-1.5 shadow-lg">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {email ? <p className="truncate text-xs font-normal text-muted-foreground">{email}</p> : null}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer rounded-xl"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="size-4" />
            Panel
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-xl"
            onClick={() => navigate('/ideas')}
          >
            <Lightbulb className="size-4" />
            Mis ideas
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-xl"
            onClick={() => navigate('/feed')}
          >
            <Users className="size-4" />
            Comunidad
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-xl"
            onClick={() => navigate('/profile')}
          >
            <UserCircle className="size-4" />
            Editar perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer rounded-xl"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
