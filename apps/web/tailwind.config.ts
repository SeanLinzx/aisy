import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ff7a59',
          light: '#ffd6c2',
          dark: '#c44a2c',
          50: '#fff4ef',
          100: '#ffe2d4',
          200: '#ffc4ab',
          300: '#ffa07a',
          400: '#ff7a59',
          500: '#f85f3c',
          600: '#dd4523',
          700: '#b1361b',
        },
        candy: {
          pink: '#ff8fb1',
          rose: '#ff6b9a',
          peach: '#ffb088',
          orange: '#ff9a3c',
          yellow: '#ffd56b',
          lemon: '#fff07c',
          mint: '#7be3c0',
          green: '#7ed957',
          sky: '#7cc2ff',
          blue: '#4aa8ff',
          lilac: '#c5a8ff',
          purple: '#a76bff',
          cocoa: '#8b5e3c',
        },
        ink: {
          DEFAULT: '#2d1b3d',
          soft: '#4a3556',
        },
      },
      fontFamily: {
        sans: ['"Quicksand"', '"Baloo 2"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Baloo 2"', '"Quicksand"', '"PingFang SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        blob: '40% 60% 60% 40% / 60% 40% 60% 40%',
      },
      boxShadow: {
        soft: '0 12px 40px -12px rgba(15, 23, 42, 0.12)',
        pop: '0 10px 0 -2px rgba(0, 0, 0, 0.08), 0 18px 32px -16px rgba(15, 23, 42, 0.25)',
        'pop-sm': '0 6px 0 -2px rgba(0, 0, 0, 0.08), 0 12px 20px -12px rgba(15, 23, 42, 0.2)',
        'pop-brand': '0 8px 0 -2px #c44a2c, 0 18px 28px -12px rgba(196, 74, 44, 0.45)',
        'pop-sky': '0 8px 0 -2px #1f7ad1, 0 18px 28px -12px rgba(31, 122, 209, 0.45)',
        'pop-pink': '0 8px 0 -2px #d04774, 0 18px 28px -12px rgba(208, 71, 116, 0.4)',
        'pop-mint': '0 8px 0 -2px #2da37b, 0 18px 28px -12px rgba(45, 163, 123, 0.4)',
        'pop-purple': '0 8px 0 -2px #6a3dc1, 0 18px 28px -12px rgba(106, 61, 193, 0.4)',
        'pop-yellow': '0 8px 0 -2px #c79a1e, 0 18px 28px -12px rgba(199, 154, 30, 0.45)',
        glow: '0 0 0 6px rgba(255, 122, 89, 0.18)',
        'inner-soft': 'inset 0 2px 6px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'rainbow': 'linear-gradient(120deg, #ff8fb1 0%, #ffb088 25%, #ffd56b 50%, #7be3c0 75%, #7cc2ff 100%)',
        'sunny': 'linear-gradient(135deg, #fff7ed 0%, #ffe2d4 50%, #ffd6c2 100%)',
        'sky': 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 60%, #ede9fe 100%)',
        'meadow': 'linear-gradient(180deg, #fff7ed 0%, #fef3c7 40%, #ecfeff 100%)',
        'dots': 'radial-gradient(circle at 1px 1px, rgba(255,122,89,0.18) 1px, transparent 0)',
        'stars': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='%23ffd56b' opacity='0.35'><polygon points='10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8'/></g><g fill='%23ff8fb1' opacity='0.3'><circle cx='44' cy='14' r='2.5'/></g><g fill='%237cc2ff' opacity='0.3'><circle cx='30' cy='44' r='2.5'/></g><g fill='%237be3c0' opacity='0.3'><circle cx='52' cy='48' r='2'/></g></svg>\")",
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(4deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        rainbow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        scoreFloat: {
          '0%': { opacity: '0', transform: 'translate(-50%, 8px) scale(0.8)' },
          '20%': { opacity: '1', transform: 'translate(-50%, 0) scale(1.1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -28px) scale(1)' },
        },
        scoreBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.12) rotate(-3deg)' },
          '50%': { transform: 'scale(1.08) rotate(3deg)' },
          '75%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        pop: 'pop 0.35s cubic-bezier(.18,.89,.32,1.28)',
        bounceSoft: 'bounceSoft 2s ease-in-out infinite',
        rainbow: 'rainbow 6s ease infinite',
        sparkle: 'sparkle 2.4s ease-in-out infinite',
        'score-float': 'scoreFloat 1.8s ease-out forwards',
        'score-bounce': 'scoreBounce 0.6s ease-in-out 3',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
