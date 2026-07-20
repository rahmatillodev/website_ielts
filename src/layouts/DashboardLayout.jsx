import { useLocation, matchPath } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardNavbar from '@/components/navbar/DashboardNavbar';
import DashboardSidebar from '@/components/sidebar/DashboardSidebar';
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import RotationModal, { DISMISS_KEY } from '@/components/modal/RotationModal'
import { useSmallScreen } from '@/hooks/useSmallScreen'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Outlet } from 'react-router-dom'


const DashboardLayout = () => {
  const { pathname, search } = useLocation();
  const isSmallScreen = useSmallScreen();
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // The accessMode writer and the "redirect mock users away from the dashboard"
  // effect that used to live here are gone. Together with the mirrored pair in
  // MockTestLayout they formed the trap this page was reported for: a user with
  // a booking could be bounced off the regular dashboard, and a user without the
  // flag set could be bounced off /mock-tests, with no way to reach the other
  // side. Both dashboards are now reachable; paid content stays gated by
  // subscription_status via isPremiumSubscriber, which never consulted this flag.

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
  const isDetailView = /^\/(dashboard\/)?speaking\/tips\/[^/]+$/.test(pathname)

  const hideNavOn = [
    "/reading-practice",
    "/reading-result",
    "/listening-practice",
    "/listening-result",
    "/equipment-check",
    "/speaking-practice/shadowing",
    "/speaking-practice",
    "/speaking-result",
    "/writing-practice",
    "/own-writing",
    "/mock-test/results",
  ]

  const isHideByPath = hideNavOn.some((pattern) => {
    if (pattern.includes(":")) {
      return matchPath({ path: pattern, end: true }, pathname) != null
    }
    return pathname.startsWith(pattern)
  })

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
        {!isSmallScreen && !isDetailView && (
          <aside className="sticky top-0 h-screen z-50">
            <DashboardSidebar />
          </aside>
        )}
        {isSmallScreen && !isDetailView && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[320px] p-0">
              <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
        <div className="flex w-full flex-1 flex-col overflow-y-auto">
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