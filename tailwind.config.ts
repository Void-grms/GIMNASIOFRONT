import type { Config } from 'tailwindcss';

/**
 * Misma escala de antes, con mas pasos de profundidad y la tipografia real.
 * Los nombres viejos (fondo, superficie, borde, acento, vigente...) se
 * mantienen para no tocar ninguna pantalla.
 */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#09090A',
        superficie: '#121215',
        elevado: '#17171B',
        borde: 'rgba(255,255,255,0.08)',
        bordeFuerte: 'rgba(255,255,255,0.16)',
        acento: '#FAD234',
        acentoClaro: '#FFE477',
        acentoFuerte: '#E0B81C',
        vigente: '#22c55e',
        porvencer: '#FB923C',
        vencido: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--fuente-archivo)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1.125rem',
        '3xl': '1.375rem',
      },
      boxShadow: {
        acento: '0 14px 34px -14px rgba(250,210,52,0.6)',
        acentoFuerte: '0 20px 46px -14px rgba(250,210,52,0.8)',
        tarjeta: '0 8px 24px -14px rgba(0,0,0,0.8)',
      },
      transitionTimingFunction: {
        suave: 'cubic-bezier(0.22, 1, 0.36, 1)',
        rebote: 'cubic-bezier(0.34, 1.42, 0.5, 1)',
      },
      keyframes: {
        subir: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'none' },
        },
        entrar: {
          '0%': { opacity: '0', transform: 'scale(.965) translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        latir: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.3', transform: 'scale(.72)' },
        },
        aura: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,.35)' },
          '50%': { boxShadow: '0 0 0 10px rgba(34,197,94,0)' },
        },
        crecer: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        vuelta: { to: { strokeDashoffset: '0' } },
      },
      animation: {
        subir: 'subir .7s cubic-bezier(.22,1,.36,1) both',
        entrar: 'entrar .45s cubic-bezier(.34,1.42,.5,1) both',
        latir: 'latir 1.6s ease-in-out infinite',
        aura: 'aura 1.8s ease-out infinite',
        crecer: 'crecer .8s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
