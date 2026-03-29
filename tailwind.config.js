/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean blues (primary) — Content Hub palette
        ocean: {
          50: '#e6f7fb',
          100: '#bfecf6',
          200: '#80d9ed',
          300: '#40c5e3',
          400: '#1fb1c7',
          500: '#11607d',
          600: '#0e4d63',
          700: '#0c3d4e',
          800: '#072833',
          900: '#03161d',
        },
        // Aqua/Teal accents — Content Hub palette
        aqua: {
          50: '#e6ffff',
          100: '#ccffff',
          200: '#99ffff',
          300: '#66ffff',
          400: '#33ffff',
          500: '#00ffff',
          600: '#00cccc',
          700: '#009999',
          800: '#006666',
          900: '#003333',
        },
        // Graystone (neutrals)
        graystone: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        'sans': ['Neue Haas Grotesk Display', 'Neue Haas Grotesk', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
