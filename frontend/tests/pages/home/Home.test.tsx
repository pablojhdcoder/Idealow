import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '@/pages/home/Home'

function renderHome(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('muestra el héroe y acciones principales', () => {
    renderHome()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/Captura ideas en cualquier formato/i)
    expect(screen.getAllByRole('link', { name: /iniciar sesión/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: 'Empezar' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Empezar gratis' })).toHaveAttribute('href', '/register')
  })

  it('incluye regiones semánticas banner, main y contentinfo', () => {
    renderHome()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lista las cuatro capacidades del producto', () => {
    renderHome()
    expect(screen.getByText('Cualquier entrada')).toBeInTheDocument()
    expect(screen.getAllByText('Refinamiento guiado').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Contraste con la realidad')).toBeInTheDocument()
    expect(screen.getByText('Listo para ficha')).toBeInTheDocument()
  })
})
