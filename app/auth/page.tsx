import { getServerConfig } from '@/lib/serverConfig'
import AuthPageClient from './AuthPageClient'

export const revalidate = 0

export default async function AuthPage() {
  const cfg = await getServerConfig()
  return (
    <AuthPageClient
      marathonStart={cfg.MARATHON_START.toISOString()}
      saisonLabel={cfg.SAISON_LABEL}
      saisonNumero={cfg.SAISON_NUMERO}
    />
  )
}
