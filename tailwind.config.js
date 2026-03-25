/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#010409', // 더 깊은 블랙
          card: '#0d1117', // 카드 배경
          neon: '#00f2fe', // 시그니처 네온 블루
          accent: '#4facfe', // 보조 블루
          danger: '#ff4b5c', // 부족 알림
        }
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 242, 254, 0.3)',
        'neon-lg': '0 0 30px rgba(0, 242, 254, 0.5)',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"), // 애니메이션 플러그인
  ],
}