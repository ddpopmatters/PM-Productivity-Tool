/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean blues (primary)
        ocean: {
          50: '#e6f3f8',
          100: '#cce7f1',
          200: '#99cfe3',
          300: '#66b7d5',
          400: '#339fc7',
          500: '#0087b9',
          600: '#006c94',
          700: '#00516f',
          800: '#00364a',
          900: '#11607d',
        },
        // Aqua/Teal accents
        aqua: {
          50: '#e6faf9',
          100: '#ccf5f3',
          200: '#99ebe7',
          300: '#66e1db',
          400: '#33d7cf',
          500: '#00cdc3',
          600: '#00a49c',
          700: '#007b75',
          800: '#00524e',
          900: '#002927',
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
        'heading': ['Impact', 'Arial Black', 'Arial', 'sans-serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
