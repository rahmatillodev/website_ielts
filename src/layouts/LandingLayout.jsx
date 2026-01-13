import DashboardRoute from '@/components/DashboardRoute';
import LandingFooter from '@/components/footer/LandingFooter';
import LandingNavbar from '@/components/navbar/LandingNavbar';
import { Outlet, useLocation } from 'react-router-dom'

// Public layout for public pages
function LandingLayout() {
  const { pathname } = useLocation()
  const hideNavOn = ["/login", "/signup", "/pricing"]
  const isHide = hideNavOn.some((p) => pathname.startsWith(p))
  return (
    <DashboardRoute>
    <div className="min-h-screen flex flex-col">
      {!isHide && <LandingNavbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      
      <LandingFooter/>
    </div>
    </DashboardRoute>
  )
} 

export default LandingLayout;