/** @type {import('tailwindcss').Config} */
export default {
  // Enable class-based dark mode (add 'dark' class to html/body)
  darkMode: 'class',
  
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "!./src/components/pdf/**/*"
  ],
  
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      // Custom color palette - Primary colors
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#1990e6',
          dark: '#ffff',
          foreground: '#fafafa', // Light text on primary
        },
        
        // Background colors
        background: {
          DEFAULT: '#ffffff',
          light: '#ff33333',
          dark: '#f6f7f8',
        },
        
        // Surface colors
        surface: {
          light: '#ffffff',
          dark: '#1a2632',
        },
        
        // Text colors
        text: {
          light: '#111518',
          dark: '#ffffff',
          'secondary-light': '#637888',
          'secondary-dark': '#9ca3af',
        },
        
        // Border colors
        border: {
          DEFAULT: '#dce1e5',
          light: '#dce1e5',
          dark: '#2d3b45',
        },
        
        // Blue color scale
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        
        // Indigo color scale
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        
        // Green color scale
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        
        // Amber color scale
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        
        // Yellow color scale
        yellow: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        
        // Gray color scale (extended)
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        
        // Orange color
        orange: {
          500: '#f97316',
        },
        
        // Red color scale (for destructive actions)
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      
      // Border radius values
      borderRadius: {
        'sm': 'calc(0.625rem - 4px)',   // 6px
        'md': 'calc(0.625rem - 2px)',   // 8px
        'lg': '0.625rem',                // 10px
        'xl': 'calc(0.625rem + 4px)',   // 14px
      },
      
      // Animation keyframes
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '0.45' },
        },
      },
      
      // Animation utilities
      animation: {
        shimmer: 'shimmer 2s infinite',
        'soft-pulse': 'softPulse 2s ease-in-out infinite',
      },
    },
  },
  
  plugins: [],
}

