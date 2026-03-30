import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, CircleHelp, KeyRound, Loader2, RefreshCcw, Upload, UserCircle } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBackButton } from '@/components/ui/page-back-button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag } from '@/components/ui/tag'
import { getUserAvatarUrl } from '@/lib/avatar'
import { uploadFile } from '@/lib/api/files'
import { ApiError } from '@/lib/api/client'
import { changePassword, patchProfile, type ProfileUserResponse } from '@/lib/api/users'
import { readPrivateIdeasByDefault, writePrivateIdeasByDefault } from '@/lib/ideaVisibilityPreference'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { sectorPillStyle } from '@/lib/sectorColors'
import { cn } from '@/lib/utils'

const GOAL_LABELS: Record<string, string> = {
  HACKATHON: 'Hackatón',
  SIDE_PROJECT: 'Proyecto paralelo',
  STARTUP: 'Empresa emergente',
  LEARNING: 'Aprendizaje',
}

function goalLabel(goal: string) {
  return GOAL_LABELS[goal] ?? goal.replaceAll('_', ' ')
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
}

function userFromProfileResponse(u: ProfileUserResponse) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    avatarUrl: u.avatarUrl ?? undefined,
    sectors: u.sectors,
    goal: u.goal,
  }
}

export default function Profile() {
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [objectPreviewUrl, setObjectPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState('')
  const [saveAvatarError, setSaveAvatarError] = useState('')
  const [saveAvatarSuccess, setSaveAvatarSuccess] = useState('')
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [resettingAvatar, setResettingAvatar] = useState(false)
  const avatarBusy = savingAvatar || resettingAvatar
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const [privateByDefault, setPrivateByDefault] = useState(readPrivateIdeasByDefault)
  const [openResetDialog, setOpenResetDialog] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsernameDraft(user.username)
    setEmailDraft(user.email)
  }, [user?.email, user?.id, user?.username])

  useEffect(() => {
    if (!user) return
    let active = true
    void (async () => {
      const generated = await getUserAvatarUrl({ id: user.id })
      if (active) setGeneratedAvatarUrl(generated ?? '')
    })()
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(
    () => () => {
      if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl)
    },
    [objectPreviewUrl],
  )

  const displayAvatarSrc =
    objectPreviewUrl ?? (user?.avatarUrl?.trim() ? user.avatarUrl : null) ?? generatedAvatarUrl

  const accountDirty = Boolean(
    user &&
      (usernameDraft.trim() !== user.username ||
        emailDraft.trim().toLowerCase() !== user.email.toLowerCase()),
  )

  const handleSaveAccount = async () => {
    if (!user) return
    setAccountError('')
    setAccountSuccess('')
    const u = usernameDraft.trim()
    const em = emailDraft.trim()
    if (u.length < 3 || u.length > 30) {
      setAccountError('El usuario debe tener entre 3 y 30 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setAccountError('Introduce un correo válido.')
      return
    }
    const body: { username?: string; email?: string } = {}
    if (u !== user.username) body.username = u
    if (em.toLowerCase() !== user.email.toLowerCase()) body.email = em
    if (Object.keys(body).length === 0) return
    setSavingAccount(true)
    try {
      const data = await patchProfile(body)
      setUser(userFromProfileResponse(data.user))
      setAccountSuccess('Datos guardados')
    } catch (err) {
      if (err instanceof ApiError) {
        setAccountError(err.message)
      } else {
        setAccountError('No se pudieron guardar los cambios.')
      }
    } finally {
      setSavingAccount(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Contraseña actualizada')
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message)
      } else {
        setPasswordError('No se pudo cambiar la contraseña.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  const clearLocalFileSelection = () => {
    if (objectPreviewUrl) {
      URL.revokeObjectURL(objectPreviewUrl)
      setObjectPreviewUrl(null)
    }
    setPendingFile(null)
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = ''
    }
  }

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setSaveAvatarError('')
    setSaveAvatarSuccess('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSaveAvatarError('Elige un archivo de imagen (JPEG, PNG, WebP o GIF).')
      e.target.value = ''
      return
    }
    if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl)
    setObjectPreviewUrl(URL.createObjectURL(file))
    setPendingFile(file)
  }

  const handleSaveAvatar = async () => {
    if (!user) return
    if (!pendingFile) {
      setSaveAvatarError('Selecciona una imagen desde tu dispositivo.')
      return
    }
    setSaveAvatarError('')
    setSaveAvatarSuccess('')
    setSavingAvatar(true)
    try {
      const { fileId } = await uploadFile(pendingFile)
      const data = await patchProfile({ avatarFileId: fileId })
      setUser(userFromProfileResponse(data.user))
      clearLocalFileSelection()
      setSaveAvatarSuccess('Foto actualizada')
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveAvatarError(err.message)
      } else {
        setSaveAvatarError('No se pudo guardar la imagen.')
      }
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleResetAvatar = async () => {
    if (!user) return
    setSaveAvatarError('')
    setSaveAvatarSuccess('')
    clearLocalFileSelection()
    setResettingAvatar(true)
    try {
      const data = await patchProfile({ avatarUrl: '' })
      setUser(userFromProfileResponse(data.user))
      setSaveAvatarSuccess('Avatar por defecto')
    } catch {
      setSaveAvatarError('No se pudo restablecer el avatar.')
    } finally {
      setResettingAvatar(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppShellHeader />
        <main className={appPageMainClassName('py-8')}>
          <div className="space-y-4">
            <Skeleton className="h-10 w-56 rounded-xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className={appPageMainClassName('py-8 pb-16')}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <PageBackButton label="Volver al dashboard" to="/dashboard" />
        </motion.div>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'mt-5',
            'relative overflow-hidden rounded-3xl border border-primary/15',
            'bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06]',
            'px-5 py-7 shadow-sm sm:px-8 sm:py-9',
          )}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <UserCircle className="size-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Cuenta</p>
                <h1 className="mt-1 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">Tu perfil</h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Foto, datos de acceso y preferencias. Todo en un solo lugar.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_min(100%,380px)] lg:items-start lg:gap-10 sm:mt-7">
          <div className="space-y-8">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.06 }}
            >
              <Card className="overflow-hidden rounded-3xl border-border/80 bg-card shadow-sm">
                <CardContent className="p-0">
                  <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-amber-500/[0.04] px-6 py-8 sm:px-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 justify-center sm:justify-start">
                        {displayAvatarSrc ? (
                          <motion.img
                            layout
                            src={displayAvatarSrc}
                            alt={`Avatar de ${user.username}`}
                            className="size-24 rounded-full object-cover shadow-lg shadow-primary/10 ring-4 ring-background sm:size-28"
                          />
                        ) : (
                          <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner ring-4 ring-background sm:size-28">
                            <UserCircle className="size-12 sm:size-14" strokeWidth={1.25} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="font-serif text-2xl text-foreground sm:text-3xl">@{user.username}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-background/80 px-3 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"
                          >
                            {goalLabel(user.goal)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-7 sm:px-8">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Foto de perfil</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPEG, PNG, WebP o GIF. Se mostrará en la app y en enlaces públicos si compartes ideas.
                      </p>
                      <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4">
                        <input
                          ref={avatarFileInputRef}
                          id="avatarFile"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={handleAvatarFileChange}
                          disabled={avatarBusy}
                          aria-label="Seleccionar imagen para el avatar"
                        />
                        <div className="flex min-w-0 items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 shrink-0 gap-2 rounded-full border-border/80"
                            disabled={avatarBusy}
                            onClick={() => avatarFileInputRef.current?.click()}
                          >
                            <Upload className="size-4 shrink-0" />
                            Elegir imagen
                          </Button>
                          <p
                            className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground"
                            title={
                              pendingFile?.name ??
                              (user.avatarUrl?.trim() ? 'Imagen guardada' : undefined)
                            }
                          >
                            {pendingFile?.name ??
                              (user.avatarUrl?.trim() ? 'Imagen guardada en el servidor' : 'Ningún archivo nuevo')}
                          </p>
                        </div>
                        {(saveAvatarError || saveAvatarSuccess) && (
                          <p
                            className={cn(
                              'mt-3 text-xs',
                              saveAvatarError ? 'text-destructive' : 'text-primary',
                            )}
                          >
                            {saveAvatarError || saveAvatarSuccess}
                          </p>
                        )}
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            type="button"
                            className="rounded-full"
                            onClick={() => void handleSaveAvatar()}
                            disabled={avatarBusy || !pendingFile}
                          >
                            {savingAvatar ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Guardando…
                              </>
                            ) : (
                              'Guardar foto'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            disabled={avatarBusy}
                            onClick={() => void handleResetAvatar()}
                          >
                            {resettingAvatar ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Restableciendo…
                              </>
                            ) : (
                              'Usar avatar por defecto'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border/60" />

                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Usuario y correo</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Son únicos en Idealow. Si cambias el correo, usa el nuevo para iniciar sesión.
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
                            Nombre de usuario
                          </Label>
                          <Input
                            id="username"
                            autoComplete="username"
                            value={usernameDraft}
                            onChange={e => {
                              setUsernameDraft(e.target.value)
                              setAccountError('')
                              setAccountSuccess('')
                            }}
                            className="h-11 rounded-xl border-border/80 bg-background text-foreground"
                            maxLength={30}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                            Correo
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={emailDraft}
                            onChange={e => {
                              setEmailDraft(e.target.value)
                              setAccountError('')
                              setAccountSuccess('')
                            }}
                            className="h-11 rounded-xl border-border/80 bg-background text-foreground"
                          />
                        </div>
                      </div>
                      {(accountError || accountSuccess) && (
                        <p
                          className={cn(
                            'mt-3 text-xs',
                            accountError ? 'text-destructive' : 'text-primary',
                          )}
                        >
                          {accountError || accountSuccess}
                        </p>
                      )}
                      <Button
                        type="button"
                        className="mt-4 rounded-full"
                        disabled={savingAccount || !accountDirty}
                        onClick={() => void handleSaveAccount()}
                      >
                        {savingAccount ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          'Guardar usuario y correo'
                        )}
                      </Button>
                    </div>

                    <Separator className="bg-border/60" />

                    <div>
                      <div className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary" aria-hidden />
                        <h2 className="text-sm font-semibold text-foreground">Contraseña</h2>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Necesitamos tu contraseña actual para establecer una nueva.
                      </p>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-xs font-medium text-muted-foreground">
                            Contraseña actual
                          </Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={e => {
                              setCurrentPassword(e.target.value)
                              setPasswordError('')
                              setPasswordSuccess('')
                            }}
                            className="h-11 rounded-xl border-border/80 bg-background"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground">
                              Nueva contraseña
                            </Label>
                            <Input
                              id="newPassword"
                              type="password"
                              autoComplete="new-password"
                              value={newPassword}
                              onChange={e => {
                                setNewPassword(e.target.value)
                                setPasswordError('')
                                setPasswordSuccess('')
                              }}
                              className="h-11 rounded-xl border-border/80 bg-background"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
                              Repetir nueva contraseña
                            </Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={e => {
                                setConfirmPassword(e.target.value)
                                setPasswordError('')
                                setPasswordSuccess('')
                              }}
                              className="h-11 rounded-xl border-border/80 bg-background"
                            />
                          </div>
                        </div>
                      </div>
                      {(passwordError || passwordSuccess) && (
                        <p
                          className={cn(
                            'mt-3 text-xs',
                            passwordError ? 'text-destructive' : 'text-primary',
                          )}
                        >
                          {passwordError || passwordSuccess}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 rounded-full border-border/80"
                        disabled={
                          savingPassword ||
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword
                        }
                        onClick={() => void handleChangePassword()}
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Actualizando…
                          </>
                        ) : (
                          'Cambiar contraseña'
                        )}
                      </Button>
                    </div>

                    <Separator className="bg-border/60" />

                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">Intereses</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sectores y objetivo que usamos para personalizar sugerencias.
                          </p>
                        </div>
                        <Link
                          to="/onboarding"
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'h-10 shrink-0 gap-1.5 rounded-full border-border/80',
                          )}
                        >
                          Ajustar en onboarding
                          <ArrowUpRight className="size-3.5 opacity-70" />
                        </Link>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {user.sectors.length > 0 ? (
                          user.sectors.map(sector => (
                            <Tag
                              key={sector}
                              size="md"
                              className="capitalize font-medium"
                              style={sectorPillStyle(sector)}
                            >
                              {sector}
                            </Tag>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Aún no elegiste sectores.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.aside {...fadeUp} transition={{ duration: 0.4, delay: 0.12 }} className="space-y-4">
            <Card className="rounded-3xl border-border/80 shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl text-foreground">Preferencias</h2>
                  <TooltipProvider delay={200}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            aria-label="Ayuda sobre preferencias"
                          />
                        }
                      >
                        <CircleHelp className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs rounded-xl text-xs leading-relaxed">
                        Las ideas nuevas están pensadas para la comunidad tras validar. «Modo privado» solo afecta al
                        interruptor por defecto al crear una idea.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Ajustes locales de privacidad.</p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Privado por defecto al crear</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Al abrir «Nueva idea», la opción de no publicar vendrá marcada. Puedes cambiarla en cada idea.
                      </p>
                    </div>
                    <Switch
                      checked={privateByDefault}
                      onCheckedChange={v => {
                        setPrivateByDefault(v)
                        writePrivateIdeasByDefault(v)
                      }}
                      className="shrink-0 data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <Separator className="my-6 bg-border/60" />

                <Dialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" className="w-full rounded-full border-border/80 gap-2">
                        <RefreshCcw className="size-4" />
                        Restablecer preferencias
                      </Button>
                    }
                  />
                  <DialogContent className="rounded-3xl border-border/80 sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl">Restablecer preferencias</DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                        Volverás a la opción recomendada: publicación comunitaria sugerida al crear
                        ideas.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setOpenResetDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="rounded-full"
                        onClick={() => {
                          setPrivateByDefault(false)
                          writePrivateIdeasByDefault(false)
                          setOpenResetDialog(false)
                        }}
                      >
                        Confirmar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </main>
    </div>
  )
}
