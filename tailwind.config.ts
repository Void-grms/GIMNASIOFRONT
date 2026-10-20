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
        fondo: 'rgb(var(--color-fondo) / <alpha-value>)',
        superficie: 'rgb(var(--color-superficie) / <alpha-value>)',
        elevado: 'rgb(var(--color-elevado) / <alpha-value>)',
        borde: 'rgb(var(--color-borde) / <alpha-value>)',
        bordeFuerte: 'rgb(var(--color-borde-fuerte) / <alpha-value>)',
        tinta: 'rgb(var(--color-tinta) / <alpha-value>)',
        secundario: 'rgb(var(--color-secundario) / <alpha-value>)',
        tenue: 'rgb(var(--color-tenue) / <alpha-value>)',
        neutral: 'rgb(var(--color-neutral) / <alpha-value>)',
        acentoTexto: 'rgb(var(--color-acento-texto) / <alpha-value>)',
        acento: '#FAD234',
        acentoClaro: '#FFE477',
        acentoFuerte: '#E0B81C',
        vigente: 'rgb(var(--color-vigente) / <alpha-value>)',
        porvencer: 'rgb(var(--color-porvencer) / <alpha-value>)',
        vencido: 'rgb(var(--color-vencido) / <alpha-value>)',
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
        tarjeta: 'var(--sombra-tarjeta)',
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
