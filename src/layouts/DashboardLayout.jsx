import { useLocation, useNavigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardNavbar from '@/components/navbar/DashboardNavbar';
import DashboardSidebar from '@/components/sidebar/DashboardSidebar';
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import RotationModal, { DISMISS_KEY } from '@/components/modal/RotationModal'
import { useSmallScreen } from '@/hooks/useSmallScreen'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Outlet } from 'react-router-dom'

const FEEDBACK_MODAL_SHOWN_KEY = "feedback_modal_shown"

const DashboardLayout = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isSmallScreen = useSmallScreen();
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Set access mode to regular when accessing dashboard routes
  useEffect(() => {
    // Only set to regular if not accessing practice pages (practice pages can be from either mode)
    const isPracticePage = pathname.includes('/reading-practice') || 
                          pathname.includes('/listening-practice') || 
                          pathname.includes('/writing-practice') ||
                          pathname.includes('/speaking-practice') ||
                          pathname.includes('/reading-result') ||
                          pathname.includes('/listening-result') ||
                          pathname.includes('/speaking-result');
    
    if (!isPracticePage) {
      sessionStorage.setItem('accessMode', 'regular');
    }
  }, [pathname])

  // Redirect users away from dashboard routes if they're in mock test mode
  useEffect(() => {
    const accessMode = sessionStorage.getItem('accessMode');
    // Only redirect if they're trying to access dashboard routes (not practice pages)
    const isDashboardRoute = pathname === '/dashboard' || 
                             pathname === '/reading' || 
                             pathname === '/listening' || 
                             pathname === '/writing' || 
                             pathname === '/speaking' || 
                             pathname === '/analytics';
    
    if (accessMode === 'mockTest' && isDashboardRoute) {
      navigate('/mock-tests', { replace: true });
    }
  }, [pathname, navigate])
  
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

  // Check for mock test in both search params and URL (handles history.replaceState case)
  const params = new URLSearchParams(search)
  const urlParams = new URLSearchParams(window.location.search)
  const isMockTest = params.get("mockTest") === "true" || urlParams.get("mockTest") === "true"

  const hideNavOn = [
    "/reading-practice",
    "/reading-result",
    "/listening-practice",
    "/listening-result",
    "/speaking-practice",
    "/speaking-result",
    "/pricing",
    "/writing-practice",
    "/own-writing",
    "/mock-test/results"
  ]

  const isHideByPath = hideNavOn.some((p) => pathname.startsWith(p))

  // 🔥 final logic - hide nav/sidebar if it's a practice page OR mock test
  const isHide = isHideByPath || isMockTest



  const handleDismiss = () => {
    setShowModal(false)
  }

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  // Practice/result pages: no sidebar and no navbar in the tree at all (not just hidden)
  if (isHide) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col h-screen overflow-hidden bg-background-light">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
        <RotationModal isOpen={showModal} onDismiss={handleDismiss} />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background-light">
        {!isSmallScreen && (
          <aside className="sticky top-0 h-screen z-50">
            <DashboardSidebar />
          </aside>
        )}
        {isSmallScreen && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[320px] p-0">
              <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
        <div className="flex flex-col flex-1 overflow-y-auto">
          <header className="sticky top-0 z-40 w-full">
            <DashboardNavbar onMenuClick={handleMenuClick} />
          </header>
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