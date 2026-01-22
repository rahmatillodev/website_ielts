import { useLocation } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardNavbar from '@/components/navbar/DashboardNavbar';
import DashboardSidebar from '@/components/sidebar/DashboardSidebar';
import React, { useState, useEffect } from 'react'
import RotationModal, { DISMISS_KEY } from '@/components/modal/RotationModal'
import { useSmallScreen } from '@/hooks/useSmallScreen'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Outlet } from 'react-router-dom'

const DashboardLayout = () => {
  const { pathname } = useLocation()
  const isSmallScreen = useSmallScreen()
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Check if modal was previously dismissed
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "true"
    
    // Show modal only if:
    // 1. Screen is small (mobile)
    // 2. Modal hasn't been dismissed before
    if (isSmallScreen && !wasDismissed) {
      setShowModal(true)
    }
  }, [isSmallScreen])

  const hideNavOn = ["/reading-practice", "/reading-result", "/listening-practice", "/listening-result", "/pricing", "/writing-practice"]
  const isHide = hideNavOn.some((p) => pathname.startsWith(p))

  const handleDismiss = () => {
    setShowModal(false)
  }

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background-light">
        
        {/* Desktop Sidebar */}
        {!isHide && !isSmallScreen && (
          <aside className="sticky top-0 h-screen z-50">
            <DashboardSidebar />
          </aside>
        )}

        {/* Mobile Sidebar Sheet */}
        {!isHide && isSmallScreen && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[320px] p-0">
              <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {!isHide && (
            <header className="sticky top-0 z-40 w-full">
              <DashboardNavbar onMenuClick={handleMenuClick} />
            </header>
          )}

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <RotationModal isOpen={showModal} onDismiss={handleDismiss} />
    </ProtectedRoute>
  )
}

export default DashboardLayout