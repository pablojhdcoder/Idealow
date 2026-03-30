export const sectorColors: Record<string, { bg: string; text: string }> = {
  tech: { bg: '#EEF2FF', text: '#4338CA' },
  health: { bg: '#F0FDF4', text: '#166534' },
  finance: { bg: '#FFFBEB', text: '#92400E' },
  education: { bg: '#F0F9FF', text: '#075985' },
  travel: { bg: '#FDF4FF', text: '#7E22CE' },
  food: { bg: '#FFF7ED', text: '#C2410C' },
  sports: { bg: '#F0FDF4', text: '#065F46' },
  entertainment: { bg: '#FFF1F2', text: '#9F1239' },
  productivity: { bg: '#F8FAFC', text: '#334155' },
  other: { bg: '#F9FAFB', text: '#374151' },
}

export const sectorLabels: Record<string, string> = {
  tech: 'Tecnología',
  health: 'Salud',
  finance: 'Finanzas',
  education: 'Educación',
  travel: 'Viajes',
  food: 'Alimentación',
  sports: 'Deportes',
  entertainment: 'Entretenimiento',
  productivity: 'Productividad',
  other: 'Otros',
}

export function formatSectorLabel(sector: string | null | undefined): string {
  if (!sector) return '—'
  return sectorLabels[sector] ?? sector
}

export function sectorPillStyle(sector: string): { backgroundColor: string; color: string } {
  const s = sectorColors[sector] ?? sectorColors.other
  return { backgroundColor: s.bg, color: s.text }
}
