export default function Confidentialite() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', lineHeight: 1.8 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '2rem' }}>Politique de confidentialité</h1>

      <Section title="Qui sommes-nous ?">
        <p>
          Le Marathon Cinéma est un site de suivi collaboratif de marathon cinématographique,
          édité par <strong>The Legendre</strong>, Var (83), France.<br />
          Contact : <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--gold)' }}>LeMarathonCinema@gmail.com</a>
        </p>
      </Section>

      <Section title="Données collectées">
        <p>Lors de la création d'un compte, nous collectons :</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          <li><strong>Adresse e-mail</strong> — pour l'authentification et les notifications optionnelles</li>
          <li><strong>Pseudo</strong> — affiché publiquement sur le classement</li>
        </ul>
        <p style={{ marginTop: '.8rem' }}>Lors de l'utilisation du site, nous enregistrons :</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          <li>Les films marqués comme vus</li>
          <li>Les votes aux duels</li>
          <li>Les notes et commentaires</li>
          <li>Les points d'expérience (EXP) accumulés</li>
        </ul>
      </Section>

      <Section title="Finalité des données">
        <p>Vos données sont utilisées uniquement pour :</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          <li>Faire fonctionner votre compte et votre progression</li>
          <li>Afficher le classement des joueurs</li>
          <li>Vous envoyer un rappel par e-mail avant le début du marathon, <strong>uniquement si vous l'avez demandé</strong></li>
        </ul>
        <p style={{ marginTop: '.8rem' }}>
          Vos données ne sont jamais vendues, ni partagées avec des tiers à des fins commerciales.
        </p>
      </Section>

      <Section title="E-mails de notification">
        <p>
          Si vous activez l'option "Me prévenir par e-mail" sur la page d'accueil, vous recevrez
          un e-mail de rappel 3 jours avant le lancement du marathon. Vous pouvez désactiver
          cette option à tout moment depuis la page d'accueil.
        </p>
        <p style={{ marginTop: '.6rem' }}>
          Les e-mails sont envoyés via <strong>Resend</strong> (resend.com) depuis l'adresse
          <code style={{ background: 'var(--bg2)', padding: '0 .4rem', borderRadius: 4, margin: '0 .3rem' }}>
            noreply@le-marathon-cinema.fr
          </code>.
        </p>
      </Section>

      <Section title="Cookies et sessions">
        <p>
          Le site utilise des cookies de session strictement nécessaires au fonctionnement de
          l'authentification (Supabase Auth). Ces cookies ne servent pas au suivi publicitaire.
          Aucun cookie tiers à des fins marketing n'est utilisé.
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez demander
          la suppression de votre compte et de toutes vos données à tout moment en contactant :
          <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--gold)', marginLeft: '.3rem' }}>
            LeMarathonCinema@gmail.com
          </a>
        </p>
      </Section>

      <Section title="Vos droits (RGPD)">
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
        <ul style={{ paddingLeft: '1.2rem' }}>
          <li><strong>Droit d'accès</strong> — obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> — corriger vos données</li>
          <li><strong>Droit à l'effacement</strong> — supprimer votre compte et vos données</li>
          <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements</li>
        </ul>
        <p style={{ marginTop: '.8rem' }}>
          Pour exercer ces droits, contactez-nous à :
          <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--gold)', marginLeft: '.3rem' }}>
            LeMarathonCinema@gmail.com
          </a>
        </p>
        <p style={{ marginTop: '.6rem' }}>
          En cas de litige, vous pouvez saisir la <strong>CNIL</strong> (cnil.fr).
        </p>
      </Section>

      <Section title="Hébergement des données">
        <p>
          Les données sont hébergées par <strong>Supabase</strong> (bases de données) et
          <strong> Vercel</strong> (serveurs applicatifs), tous deux conformes au RGPD.
        </p>
      </Section>

      <p style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '3rem' }}>
        Dernière mise à jour : avril 2026
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {title}
      </h2>
      <div style={{ color: 'var(--text2)', fontSize: '.88rem' }}>{children}</div>
    </div>
  )
}
