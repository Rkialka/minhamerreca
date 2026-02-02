/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                brand: {
                    primary: '#2ECC71',
                    secondary: '#F1C40F',
                    danger: '#E74C3C',
                    background: '#F8F9FA',
                    text: '#2C3E50',
                    card: '#FFFFFF',
                }
            }
        },
    },
    plugins: [],
}
