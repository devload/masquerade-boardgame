/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Masquerade palette · watercolor + soft pastel + Venetian carnival
        parch: {
          cream: '#f5efe3',
          light: '#fdf7ec',
          warm: '#ecdfc9',
        },
        gold: {
          soft: '#e8d5b7',    // my cards + Royalty
          DEFAULT: '#c48b6e',
          bright: '#f0c8a8',
        },
        silver: {
          DEFAULT: '#c0c0c0', // opponent cards
          soft: '#d8d8d8',
        },
        rose: {
          deep: '#8b3a4a',    // duel · exile · Thief
          light: '#c48b95',
        },
        lavender: {
          DEFAULT: '#a68ba8', // mask · Mystic
          deep:    '#3d1f4a',
        },
        canal: {
          blue: '#7ba3c8',    // water · Scholar
          soft: '#a5bec8',
        },
        sage: {
          DEFAULT: '#88a065', // Hunter
          light:   '#a5bd80',
        },
        cocoa: {
          DEFAULT: '#5b4636', // primary text
          light:   '#8b6f47',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        serif:   ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono:    ['"Space Mono"', 'monospace'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'parchment': '0 8px 24px rgba(91,70,54,0.15), inset 0 0 0 1px rgba(255,255,255,0.5)',
        'card-lift': '0 4px 12px rgba(91,70,54,0.1)',
        'gold-glow': '0 0 8px rgba(232,213,183,0.5)',
        'silver-glow': '0 0 8px rgba(192,192,192,0.5)',
        'rose-glow': '0 0 8px rgba(139,58,74,0.5)',
      },
      backgroundImage: {
        'candle-radial': 'radial-gradient(circle at 50% 0%, rgba(232,213,183,0.15) 0, transparent 60%), radial-gradient(circle at 80% 90%, rgba(166,139,168,0.08) 0, transparent 55%), #f5efe3',
      },
    },
  },
  plugins: [],
}
