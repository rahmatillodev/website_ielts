import { useLocation, useNavigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardNavbar from '@/components/navbar/DashboardNavbar';
import React, { useState, useEffect } from 'react'
import RotationModal, { DISMISS_KEY } from '@/components/modal/RotationModal'
import { useSmallScreen } from '@/hooks/useSmallScreen'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const MockTestLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSmallScreen = useSmallScreen();
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const authUser = useAuthStore((state) => state.authUser)

  // Set access mode to mock test when accessing mock test routes
  useEffect(() => {
    // Profile page is accessible from both platforms - preserve current accessMode
    if (pathname === '/profile') {
      return;
    }
    sessionStorage.setItem('accessMode', 'mockTest');
  }, [pathname])
  
  // Redirect regular users away from mock test layout
  useEffect(() => {
    if (authUser) {
      const accessMode = sessionStorage.getItem('accessMode');
      // Profile page is accessible from both platforms - don't redirect
      if (pathname === '/profile') {
        return;
      }
      
      if (accessMode === 'regular') {
        console.log('[MockTestLayout] Regular user detected in mock test layout, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [pathname, authUser, navigate])
  
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

  const hideNavOn = [
    "/reading-practice",
    "/reading-result",
    "/listening-practice",
    "/listening-result",
    "/writing-practice",
    "/mock-test/flow",
    "/mock-test/results"
  ]

  const isHideByPath = hideNavOn.some((p) => pathname.startsWith(p))

  const handleDismiss = () => {
    setShowModal(false)
  }

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background-light">
      
        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {!isHideByPath && (
            <header className="sticky top-0 z-40 w-full">
              <DashboardNavbar onMenuClick={handleMenuClick} flow="mockTest" />
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

export default MockTestLayout

