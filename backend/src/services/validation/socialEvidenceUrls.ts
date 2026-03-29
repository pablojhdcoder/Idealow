export type SocialEvidencePlatform = 'x' | 'instagram' | 'tiktok' | 'youtube'

/** URLs de búsqueda en la propia red (el usuario ve resultados reales al abrir). */
export function buildSocialEvidenceUrl(platform: SocialEvidencePlatform, query: string): string {
  const q = query.trim().slice(0, 200)
  if (!q) {
    if (platform === 'x') return 'https://x.com/explore'
    if (platform === 'tiktok') return 'https://www.tiktok.com/'
    if (platform === 'youtube') return 'https://www.youtube.com/'
    return 'https://www.instagram.com/explore/'
  }
  const enc = encodeURIComponent(q)
  switch (platform) {
    case 'x':
      return `https://x.com/search?q=${enc}&src=typed_query`
    case 'tiktok':
      return `https://www.tiktok.com/search?q=${enc}`
    case 'instagram':
      return `https://www.instagram.com/explore/search/keyword/?q=${enc}`
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${enc}`
    default:
      return `https://www.google.com/search?q=${enc}`
  }
}
