import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onze d'Or",
    short_name: "Onze d'Or",
    description: 'Compose ton onze de rêve de Ligue 1 & Ligue 2 et simule ta saison.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    icons: [],
  }
}
