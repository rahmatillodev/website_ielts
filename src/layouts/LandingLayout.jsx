import LandingFooter from '@/components/footer/LandingFooter';
import LandingNavbar from '@/components/navbar/LandingNavbar';
import { Outlet } from 'react-router-dom'

// Public layout for public pages
function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter/>
    </div>
  )
} 

export default LandingLayout;