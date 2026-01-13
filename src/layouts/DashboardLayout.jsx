import { Outlet, useLocation } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardNavbar from '@/components/navbar/DashboardNavbar';
import DashboardSidebar from '@/components/sidebar/DashboardSidebar';

const DashboardLayout = () => {
  const { pathname } = useLocation()

  const hideNavOn = ["/reading-practice", "/reading-result"]
  const isHide = hideNavOn.some((p) => pathname.startsWith(p))

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background-light">
        
        {!isHide && (
          <aside className="sticky top-0 h-screen z-50">
            <DashboardSidebar />
          </aside>
        )}

        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {!isHide && (
            <header className="sticky top-0 z-40 w-full">
              <DashboardNavbar />
            </header>
          )}

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default DashboardLayout