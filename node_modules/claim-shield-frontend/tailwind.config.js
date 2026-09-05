/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        navy: {
          800: '#0F172A',
          900: '#0B0F19',
        },
        ready: {
          light: '#ECFDF5',
          text: '#047857',
          border: '#A7F3D0',
          solid: '#10B981',
        },
        review: {
          light: '#FFFBEB',
          text: '#B45309',
          border: '#FDE68A',
          solid: '#F59E0B',
        },
        blocked: {
          light: '#FEF2F2',
          text: '#B91C1C',
          border: '#FCA5A5',
          solid: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
