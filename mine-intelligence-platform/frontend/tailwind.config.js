/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#fbf7f0', 100: '#f4ede1', 200: '#e6dccd', 300: '#d7c7b2',
          400: '#b8a58d', 500: '#8f7d68', 600: '#756554', 700: '#5c4d3d',
          800: '#46392d', 900: '#33281f', 950: '#211a14'
        },
        amber: {
          50: '#fff8e8', 100: '#fdf0c9', 200: '#f5d98f', 300: '#e9bf59',
          400: '#dca43b', 500: '#c8872d', 600: '#ad6d22', 700: '#8d551d',
          800: '#70431b', 900: '#583519', 950: '#3f2815'
        },
        orange: {
          50: '#fff6ea', 100: '#fde7c7', 200: '#f7c992', 300: '#efaa5d',
          400: '#df8b3d', 500: '#c96f2d', 600: '#ad5825', 700: '#8d451f',
          800: '#71381d', 900: '#5b2d19'
        }
      }
    },
  },
  plugins: [],
};
