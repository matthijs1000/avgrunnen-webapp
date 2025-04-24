/** @type {import('tailwindcss').Config} */
export default {
	content: [
	  "./index.html",
	  "./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
	  extend: {
		fontFamily: {
			cinzel: ['Cinzel', 'serif'],
		  },
		  colors: {
			abyss: {
			  900: '#0e0e0e',
			  800: '#1c1c1c',
			},
		},
		keyframes: {
		  'slide-in': {
			'0%': { transform: 'translateX(100%)', opacity: '0' },
			'100%': { transform: 'translateX(0)', opacity: '1' }
		  }
		},
		animation: {
		  'slide-in': 'slide-in 0.3s ease-out'
		}
	  },
	},
	plugins: [],
  }
  