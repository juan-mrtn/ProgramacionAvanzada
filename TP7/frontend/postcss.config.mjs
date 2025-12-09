/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
      // Use the new PostCSS adapter for Tailwind
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  };
  
  export default config;