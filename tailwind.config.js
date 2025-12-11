/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Elegant Deep Space Theme
                background: '#030014', // Very deep dark violet-black (almost black)
                surface: '#0f0728', // Deep subtle violet surface
                surfaceHighlight: '#1f1638', // Lighter surface for hover/cards
                primary: '#9333ea', // Purple-600 (Rich Purple)
                primaryHover: '#a855f7', // Purple-500 (Vibrant on hover)
                secondary: '#4f46e5', // Indigo-600
                accent: '#22d3ee', // Cyan-400 (Contrast accent)
                glow: '#a855f7', // For glow effects

                // Neutral scales for text
                textMain: '#f8fafc', // Slate-50
                textMuted: '#94a3b8', // Slate-400
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'], // Try to use Outfit if available, else Inter
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'glow': '0 0 20px rgba(147, 51, 234, 0.3)',
                'glow-lg': '0 0 40px rgba(147, 51, 234, 0.4)',
                'neon': '0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'deep-space': 'linear-gradient(to bottom, #030014, #0f0728)',
                'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        }
    },
    plugins: [],
}
