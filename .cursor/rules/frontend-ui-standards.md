# Frontend UI Standards (Local Shadcn Style)

## Filosofia
- Usamos una capa UI local editable en `frontend/src/components/ui`.
- Base headless: `@base-ui/react`.
- Estilos: Tailwind CSS + tokens de `frontend/src/index.css`.
- Variantes: `class-variance-authority` (CVA) cuando aplica.
- Regla: evitar librerias UI cerradas o black-box.

## Estructura recomendada
- `frontend/src/components/ui/*` -> componentes base reutilizables.
- `frontend/src/lib/utils.ts` -> helper `cn`.
- `frontend/src/components/*` -> componentes de dominio/pantalla.
- `frontend/src/pages/*` -> composition de UI + logica de pantalla.

## Convenciones
- Todos los componentes UI deben:
  - aceptar `className`,
  - tener tipos TS explicitos,
  - exponer API clara y pequena,
  - incluir estados de foco accesibles (`focus-visible:*`),
  - mantener semantica HTML y `aria-*` cuando aplique.
- Botones y badges deben usar variantes CVA.
- Evitar clases repetidas en paginas: mover al componente UI.

## Do / Don't
- **Do**: crear UI en `components/ui` antes de repetir clases en paginas.
- **Do**: mantener tokens (`--background`, `--primary`, etc.) como fuente de verdad.
- **Do**: usar `cn()` para fusionar clases condicionales.
- **Don't**: meter estilos largos inline en cada pagina si pueden abstraerse.
- **Don't**: acoplar componentes UI a logica de negocio.
- **Don't**: introducir dependencias UI monoliticas cerradas.

## Guia para crear un nuevo componente UI
1. Crear archivo en `frontend/src/components/ui/<name>.tsx`.
2. Definir props tipadas y soporte `className`.
3. Aplicar estilos base con tokens y `cn`.
4. Si hay variantes, usar `cva`.
5. Asegurar foco accesible y disabled states.
6. Migrar 1-2 usos en paginas para validar API.

## Migracion de componentes viejos
- Paso 1: identificar clases repetidas (input/button/card/badge/etc.).
- Paso 2: reemplazar primero en pantallas principales (`auth`, `dashboard`, `ideas/new`).
- Paso 3: validar build/lint.
- Paso 4: migrar resto por lotes pequenos.

## Ejemplos

### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Guardar</Button>
<Button variant="outline">Cancelar</Button>
```

### Input
```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="you@example.com" />
```

### Dialog
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

<Dialog>
  <DialogTrigger render={<Button>Abrir</Button>} />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar accion</DialogTitle>
      <DialogDescription>Esta accion no se puede deshacer.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button variant="destructive">Eliminar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Comandos de verificacion
- Frontend build: `cd frontend && npm run build`
- Frontend dev: `cd frontend && npm run dev`
- Backend build: `cd backend && npm run build`
