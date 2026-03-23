import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleHelp, RefreshCcw } from 'lucide-react'
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

export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [bio, setBio] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [privateByDefault, setPrivateByDefault] = useState(true)
  const [openResetDialog, setOpenResetDialog] = useState(false)

  const completion = useMemo(() => {
    if (!user) return 0
    let score = 0
    if (user.sectors.length > 0) score += 50
    if (user.goal) score += 50
    return score
  }, [user])

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
                      <TooltipContent>Mantiene la regla de privacidad por defecto de la app.</TooltipContent>
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
                    <p className="text-sm font-medium text-foreground">Ideas privadas por defecto</p>
                    <p className="text-xs text-muted-foreground">Recomendado para mantener control total.</p>
                  </div>
                  <Switch checked={privateByDefault} onCheckedChange={setPrivateByDefault} />
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
                          setPrivateByDefault(true)
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
