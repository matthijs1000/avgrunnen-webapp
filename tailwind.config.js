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
			border: "hsl(var(--border))",
			input: "hsl(var(--input))",
			ring: "hsl(var(--ring))",
			background: "hsl(var(--background))",
			foreground: "hsl(var(--foreground))",
			primary: {
			  DEFAULT: "hsl(var(--primary))",
			  foreground: "hsl(var(--primary-foreground))",
			},
			secondary: {
			  DEFAULT: "hsl(var(--secondary))",
			  foreground: "hsl(var(--secondary-foreground))",
			},
			destructive: {
			  DEFAULT: "hsl(var(--destructive))",
			  foreground: "hsl(var(--destructive-foreground))",
			},
			muted: {
			  DEFAULT: "hsl(var(--muted))",
			  foreground: "hsl(var(--muted-foreground))",
			},
			accent: {
			  DEFAULT: "hsl(var(--accent))",
			  foreground: "hsl(var(--accent-foreground))",
			},
			popover: {
			  DEFAULT: "hsl(var(--popover))",
			  foreground: "hsl(var(--popover-foreground))",
			},
			card: {
			  DEFAULT: "hsl(var(--card))",
			  foreground: "hsl(var(--card-foreground))",
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
		},
		borderRadius: {
		  lg: "var(--radius)",
		  md: "calc(var(--radius) - 2px)",
		  sm: "calc(var(--radius) - 4px)",
		},
	  },
	},
	plugins: [],
	safelist: [
	  'border-l-4',
	  'border-pink-400', 'bg-pink-50',
	  'border-yellow-400', 'bg-yellow-50',
	  'border-purple-400', 'bg-purple-50',
	  'border-green-400', 'bg-green-50',
	  'border-indigo-400', 'bg-indigo-50',
	  'border-orange-400', 'bg-orange-50',
	  'border-gray-300', 'bg-gray-50',
	],
  }
  