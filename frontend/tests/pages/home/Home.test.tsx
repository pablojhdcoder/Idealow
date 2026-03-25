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
    expect(h1).toHaveTextContent(/Capture ideas in any format/i)
    expect(screen.getAllByRole('link', { name: /^sign in$/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/register')
  })

  it('incluye regiones semánticas banner, main y contentinfo', () => {
    renderHome()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('lista las cuatro capacidades del producto', () => {
    renderHome()
    expect(screen.getByText('Any input')).toBeInTheDocument()
    expect(screen.getByText('Guided refinement')).toBeInTheDocument()
    expect(screen.getByText('Reality check')).toBeInTheDocument()
    expect(screen.getByText('Flashcard-ready')).toBeInTheDocument()
  })
})
