import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleHelp, Loader2, RefreshCcw, Upload, UserCircle } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserAvatarUrl } from '@/lib/avatar'
import { uploadFile } from '@/lib/api/files'
import { ApiError } from '@/lib/api/client'
import { readPrivateIdeasByDefault, writePrivateIdeasByDefault } from '@/lib/ideaVisibilityPreference'

export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [bio, setBio] = useState('')
  const [objectPreviewUrl, setObjectPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState('')
  const [saveAvatarError, setSaveAvatarError] = useState('')
  const [saveAvatarSuccess, setSaveAvatarSuccess] = useState('')
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [resettingAvatar, setResettingAvatar] = useState(false)
  const avatarBusy = savingAvatar || resettingAvatar
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [privateByDefault, setPrivateByDefault] = useState(readPrivateIdeasByDefault)
  const [openResetDialog, setOpenResetDialog] = useState(false)

  const completion = useMemo(() => {
    if (!user) return 0
    let score = 0
    if (user.sectors.length > 0) score += 50
    if (user.goal) score += 50
    return score
  }, [user])

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
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatarFileId: fileId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setSaveAvatarError(body?.error ?? 'No se pudo guardar la imagen de perfil.')
        return
      }
      const data = (await res.json()) as {
        user: {
          id: string
          email: string
          username: string
          avatarUrl?: string | null
          sectors: string[]
          goal: string
        }
      }
      setUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        avatarUrl: data.user.avatarUrl ?? undefined,
        sectors: data.user.sectors,
        goal: data.user.goal,
      })
      clearLocalFileSelection()
      setSaveAvatarSuccess('¡Foto nueva en el perfil!')
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveAvatarError(err.message)
      } else {
        setSaveAvatarError('No se pudo guardar la imagen de perfil.')
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
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatarUrl: '' }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setSaveAvatarError(body?.error ?? 'No se pudo restablecer el avatar.')
        return
      }
      const data = (await res.json()) as {
        user: {
          id: string
          email: string
          username: string
          avatarUrl?: string | null
          sectors: string[]
          goal: string
        }
      }
      setUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        avatarUrl: data.user.avatarUrl ?? undefined,
        sectors: data.user.sectors,
        goal: data.user.goal,
      })
      setSaveAvatarSuccess('Reestablecido el avatar automático')
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
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-foreground">Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura tu cuenta manteniendo el estilo y comportamiento de la app.
          </p>
        </div>

        <Card className="mb-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Estado del perfil</CardTitle>
            <CardDescription>Completa onboarding para mejores sugerencias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={completion} />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Completado</p>
              <Badge>{completion}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Cuenta</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Datos de cuenta</CardTitle>
                <CardDescription>Información básica de tu usuario.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Imagen de perfil</h3>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 justify-center sm:justify-start">
                        {displayAvatarSrc ? (
                          <img
                            src={displayAvatarSrc}
                            alt={`Avatar de ${user.username}`}
                            className="size-16 rounded-full object-cover ring-2 ring-border"
                          />
                        ) : (
                          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-border">
                            <UserCircle className="size-7" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                        <input
                          ref={avatarFileInputRef}
                          id="avatarFile"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={handleAvatarFileChange}
                          disabled={avatarBusy}
                          aria-label="Seleccionar archivo de imagen para el avatar"
                        />
                        <div className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-card px-2 py-1.5">
                          <div className="flex min-h-9 items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs"
                              disabled={avatarBusy}
                              onClick={() => avatarFileInputRef.current?.click()}
                            >
                              <Upload className="size-3.5" />
                              Cambiar imagen
                            </Button>
                            <span
                              className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground"
                              title={
                                pendingFile?.name ??
                                (user.avatarUrl?.trim() ? 'Imagen guardada en el servidor' : undefined)
                              }
                            >
                              {pendingFile?.name ??
                                (user.avatarUrl?.trim()
                                  ? 'Imagen guardada'
                                  : 'Ningún archivo seleccionado')}
                            </span>
                          </div>
                          {saveAvatarError || saveAvatarSuccess ? (
                            <p
                              className={`line-clamp-1 pl-0 text-[11px] leading-tight ${
                                saveAvatarError ? 'text-destructive' : 'text-primary'
                              }`}
                              title={saveAvatarError || saveAvatarSuccess}
                            >
                              {saveAvatarError || saveAvatarSuccess}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => void handleSaveAvatar()}
                            disabled={avatarBusy || !pendingFile}
                          >
                            {savingAvatar ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              'Guardar imagen'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={avatarBusy}
                            onClick={() => void handleResetAvatar()}
                          >
                            {resettingAvatar ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Restableciendo...
                              </>
                            ) : (
                              'Restablecer imagen'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={user.username} readOnly />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} readOnly />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Cuéntanos en qué ideas estás trabajando..."
                  />
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Sectores</p>
                  <div className="flex flex-wrap gap-2">
                    {user.sectors.length > 0 ? (
                      user.sectors.map(sector => (
                        <Badge key={sector} className="capitalize">
                          {sector}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Sin sectores</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate('/onboarding')}>Editar onboarding</Button>
                  <Button variant="outline">Guardar cambios</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Preferencias</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<button type="button" className="text-muted-foreground hover:text-foreground" />}>
                        <CircleHelp className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Las ideas nuevas están pensadas para publicarse en la comunidad tras validar. La preferencia se
                        guarda en este dispositivo y se aplica al abrir «Nueva idea».
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <CardDescription>Ajustes personales para notificaciones y privacidad.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificaciones email</p>
                    <p className="text-xs text-muted-foreground">Recibe alertas de validación y sugerencias.</p>
                  </div>
                  <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sugerir modo privado al crear ideas</p>
                    <p className="text-xs text-muted-foreground">
                      Si lo activas, en «Nueva idea» verás marcada la opción de no publicar en la comunidad. Idealow
                      recomienda compartir tras validar para recibir votos y comentarios.
                    </p>
                  </div>
                  <Switch
                    checked={privateByDefault}
                    onCheckedChange={v => {
                      setPrivateByDefault(v)
                      writePrivateIdeasByDefault(v)
                    }}
                  />
                </div>

                <Separator />

                <Dialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
                  <DialogTrigger render={<Button variant="outline"><RefreshCcw className="size-4" /> Restablecer preferencias</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Restablecer preferencias</DialogTitle>
                      <DialogDescription>Esta acción restaurará los valores recomendados.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenResetDialog(false)}>Cancelar</Button>
                      <Button
                        onClick={() => {
                          setNotifyEmail(true)
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
