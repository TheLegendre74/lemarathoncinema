import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        s1: 'var(--s1)',
        s2: 'var(--s2)',
        s3: 'var(--s3)',
        line: 'var(--line)',
        'line-2': 'var(--line2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink2)',
        'ink-3': 'var(--ink3)',
        'ink-ghost': 'var(--ink-ghost)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-fg': 'var(--accent-fg)',
        'accent-2': 'var(--accent-2)',
        info: 'var(--info)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        bad: 'var(--bad)',
        'bad-fg': 'var(--bad-fg)',
        adult: 'var(--adult)',
        strange: 'var(--strange)',
        'neon-vc': 'var(--neon-vc)',
      },
      fontFamily: {
        display: 'var(--f-display)',
        body: 'var(--f-body)',
        data: 'var(--f-data)',
        ui: 'var(--f-ui)',
      },
      fontSize: {
        'fs-1': 'var(--fs-1)',
        'fs-2': 'var(--fs-2)',
        'fs-3': 'var(--fs-3)',
        'fs-4': 'var(--fs-4)',
        'fs-5': 'var(--fs-5)',
        'fs-6': 'var(--fs-6)',
        'fs-7': 'var(--fs-7)',
        'fs-8': 'var(--fs-8)',
        'fs-9': 'var(--fs-9)',
        'fs-10': 'var(--fs-10)',
      },
      spacing: {
        'sp-1': 'var(--sp-1)',
        'sp-2': 'var(--sp-2)',
        'sp-3': 'var(--sp-3)',
        'sp-4': 'var(--sp-4)',
        'sp-5': 'var(--sp-5)',
        'sp-6': 'var(--sp-6)',
        'sp-7': 'var(--sp-7)',
        'sp-8': 'var(--sp-8)',
      },
      borderRadius: {
        token: 'var(--radius)',
      },
      transitionTimingFunction: {
        token: 'var(--ease)',
      },
      transitionDuration: {
        token: 'var(--dur)',
      },
      zIndex: {
        decor: 'var(--z-decor)',
        nav: 'var(--z-nav)',
        drawer: 'var(--z-drawer)',
        bottomnav: 'var(--z-bottomnav)',
        fab: 'var(--z-fab)',
        fx: 'var(--z-fx)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
}

export default config
