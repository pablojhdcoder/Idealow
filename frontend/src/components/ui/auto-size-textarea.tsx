import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = React.ComponentProps<'textarea'> & {
  /** Altura mínima aproximada en líneas de texto (solo guía visual). */
  minHeightLines?: number
}

/**
 * Textarea que crece con el contenido sin mostrar barra de desplazamiento interna.
 */
export const AutoSizeTextarea = React.forwardRef<HTMLTextAreaElement, Props>(function AutoSizeTextarea(
  { className, value, onChange, minHeightLines = 2, style, ...props },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
      }
    },
    [forwardedRef],
  )

  const adjustHeight = React.useCallback(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  React.useLayoutEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  React.useEffect(() => {
    window.addEventListener('resize', adjustHeight)
    return () => window.removeEventListener('resize', adjustHeight)
  }, [adjustHeight])

  const minHRem = `${Math.max(1, minHeightLines) * 1.5 + 1.25}rem`

  return (
    <textarea
      ref={setRefs}
      rows={1}
      value={value}
      onChange={onChange}
      className={cn(
        'w-full resize-none overflow-hidden rounded-2xl border border-input bg-card px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ minHeight: minHRem, ...style }}
      {...props}
    />
  )
})
