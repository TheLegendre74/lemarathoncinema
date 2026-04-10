export default function MentionsLegales() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', lineHeight: 1.8 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '2rem' }}>Mentions légales</h1>

      <Section title="Éditeur du site">
        <p>Le présent site <strong>Le Marathon Cinéma</strong> est édité par :</p>
        <p>
          <strong>The Legendre</strong><br />
          Var (83), France<br />
          Email : <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--gold)' }}>LeMarathonCinema@gmail.com</a>
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est hébergé par :<br />
          <strong>Vercel Inc.</strong><br />
          440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
          <a href="https://vercel.com" style={{ color: 'var(--gold)' }}>vercel.com</a>
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble du contenu de ce site (textes, graphismes, logotypes, icônes) est la propriété de
          The Legendre, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation préalable.
        </p>
        <p>
          Les titres de films, affiches et données cinématographiques sont la propriété de leurs détenteurs respectifs.
          Les données sont issues de <strong>TMDB</strong> (The Movie Database) et <strong>OMDB</strong>, utilisées conformément à leurs conditions d'utilisation.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          The Legendre s'efforce de maintenir les informations du site à jour et exactes, mais ne peut garantir
          l'exactitude, la complétude ou l'actualité des contenus. L'utilisation du site se fait sous la seule
          responsabilité de l'utilisateur.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Pour toute question relative au site :<br />
          <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--gold)' }}>LeMarathonCinema@gmail.com</a>
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
