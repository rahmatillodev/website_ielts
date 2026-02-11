import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Ensure app locale is English so native audio/video ⋮ menu (Download, Playback speed) follows app language
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.setAttribute('lang', 'en')
}

// Wrap app with BrowserRouter for routing
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// run this project with development environment variable npm run dev
// run this project with production environment variable npm run build   npm run preview
