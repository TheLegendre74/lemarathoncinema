import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { getServerConfig } from '@/lib/serverConfig'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // Vercel injecte automatiquement Authorization: Bearer {CRON_SECRET}
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = await getServerConfig()
  const now = new Date()
  const diff = cfg.MARATHON_START.getTime() - now.getTime()
  const daysUntil = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (daysUntil !== 3) {
    return NextResponse.json({ message: `J-${daysUntil}, aucun envoi aujourd'hui` })
  }

  const supabase = createAdminClient()

  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('id, pseudo')
    .eq('notify_marathon', true)
    .eq('marathon_reminder_sent', false)

  if (!profiles?.length) {
    return NextResponse.json({ message: 'Aucun utilisateur à notifier' })
  }

  // Récupère les emails via auth admin
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(users.map((u: any) => [u.id, u.email as string | undefined]))

  const dateLabel = cfg.MARATHON_START.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cinema-marathon.vercel.app'
  const fromEmail = process.env.FROM_EMAIL ?? 'Ciné Marathon <noreply@cinema-marathon.vercel.app>'

  let sent = 0
  for (const profile of profiles) {
    const email = emailMap.get(profile.id)
    if (!email) continue
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: '🎬 Le Marathon démarre dans 3 jours !',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0e0e14;color:#e8e8e8;border-radius:12px;">
            <div style="font-size:1.6rem;font-weight:bold;margin-bottom:.5rem;">🎬 Ciné Marathon — J-3</div>
            <p style="color:#aaa;margin-bottom:1.5rem;">Bonjour <strong style="color:#e8c46a">${profile.pseudo}</strong>,</p>
            <p>Le marathon cinématographique démarre dans <strong>3 jours</strong> — le <strong>${dateLabel}</strong>.</p>
            <p style="color:#aaa;font-size:.9rem;margin-top:1rem;">
              Prépare ta liste de films, affûte tes critiques et prépare-toi à marquer des points. 🍿
            </p>
            <a href="${siteUrl}"
               style="display:inline-block;background:#e8c46a;color:#0e0e14;padding:.7rem 1.6rem;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:1.5rem;">
              Voir le programme →
            </a>
            <p style="font-size:.72rem;color:#555;margin-top:2rem;">
              Tu reçois ce mail parce que tu as activé les rappels sur Ciné Marathon.<br/>
              Pour te désabonner, décoche l'option sur la page d'accueil.
            </p>
          </div>
        `,
      })
      sent++
    } catch { /* continue pour les autres */ }
  }

  // Marquer comme envoyé
  const ids = profiles.map((p: any) => p.id)
  await (supabase as any).from('profiles').update({ marathon_reminder_sent: true }).in('id', ids)

  return NextResponse.json({ sent, total: profiles.length })
}
