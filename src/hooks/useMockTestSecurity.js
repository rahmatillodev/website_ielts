import { useEffect, useRef, useCallback } from 'react';
import { monitorFullscreen } from '@/utils/mockTestFullscreen';

/**
 * Hook to enforce security measures during mock test
 * - Disables fullscreen
 * - Blocks keyboard shortcuts
 * - Disables copy/paste
 * - Prevents tab switching
 */
export const useMockTestSecurity = (onExitAttempt, isActive = true) => {
  const developerBypassRef = useRef(false);
  const originalFullscreenMethodsRef = useRef({
    requestFullscreen: null,
    webkitRequestFullscreen: null,
    mozRequestFullScreen: null,
    msRequestFullscreen: null,
  });
  const initializedRef = useRef(false);

  // Allow fullscreen API (needed for InstructionalVideo) but block F11 key
  // Security is maintained by monitoring fullscreen exit and showing modal
  useEffect(() => {
    if (!isActive) {
      initializedRef.current = false;
      return;
    }

    // Initialize immediately on mount/refresh
    if (!initializedRef.current) {
      // Store original methods in ref for use in forceFullscreen
      originalFullscreenMethodsRef.current = {
        requestFullscreen: Element.prototype.requestFullscreen,
        webkitRequestFullscreen: Element.prototype.webkitRequestFullscreen,
        mozRequestFullScreen: Element.prototype.mozRequestFullScreen,
        msRequestFullscreen: Element.prototype.msRequestFullscreen,
      };
      initializedRef.current = true;
    }
    // Block F11 key (user-initiated fullscreen)
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive]);

  // Block keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X, Ctrl+S, etc.)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      // Block common shortcuts
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ['c', 'v', 'a', 'x', 's', 'p', 'f', 'u', 'i', 'j'];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Block F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Developer Tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const blockedDevKeys = ['i', 'j', 'c'];
        if (blockedDevKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Block right-click context menu shortcuts
      if (e.key === 'ContextMenu') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive]);

  // Disable copy/paste via clipboard API
  useEffect(() => {
    if (!isActive) return;

    const handleCopy = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [isActive]);

  // Disable right-click context menu
  useEffect(() => {
    if (!isActive) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isActive]);

  // Prevent tab switching and browser close
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e) => {
      // Modern browsers ignore custom messages, but we still prevent default
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      return ''; // Required for some browsers
    };

    const handleVisibilityChange = () => {
      // Show modal when user switches tabs or minimizes window
      if (document.hidden) {
        onExitAttempt();
      }
    };

    const handleBlur = () => {
      // Show modal when window loses focus
      onExitAttempt();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, onExitAttempt]);

  // Function to reset exit modal flag (kept for backward compatibility, but no longer needed)
  const resetExitModal = useCallback(() => {
    // No-op: exit modal functionality removed
  }, []);

  // === ESC KEY INTERCEPT (PREVENT FULLSCREEN EXIT) ===
  useEffect(() => {
    if (!isActive) return;

    const handleEsc = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Show modal when user tries to exit fullscreen with ESC
        onExitAttempt();
        return false;
      }
    };

    // capture phase = true (eng oldin ushlaydi)
    document.addEventListener('keydown', handleEsc, true);

    return () => {
      document.removeEventListener('keydown', handleEsc, true);
    };
  }, [isActive, onExitAttempt]);


  // === DEVELOPER HOTKEY: Shift + 1 + 2 to bypass security and navigate back ===
  // === DEVELOPER HOTKEY: Shift + Digit1 + Digit2 ===
  useEffect(() => {
    if (!isActive) return;

    let sequence = [];
    let timeout = null;
    const TIMEOUT = 1000;

    const handleKeyDown = (e) => {
      // Step 1: Shift + Digit1
      if (e.shiftKey && e.code === 'Digit1') {
        sequence = ['1'];

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          sequence = [];
        }, TIMEOUT);

        console.log('DEV STEP 1 OK');
        return;
      }

      // Step 2: Digit2
      if (sequence.length === 1 && sequence[0] === '1' && e.code === 'Digit2') {
        if (timeout) clearTimeout(timeout);

        console.warn('🔥 DEV BYPASS ACTIVATED');

        developerBypassRef.current = true;

        // navigate back
        // window.history.back();
        window.location.href = '/mock-test';

        setTimeout(() => {
          developerBypassRef.current = false;
        }, 200);

        sequence = [];

        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // reset if wrong key
      if (sequence.length > 0 && e.code !== 'Digit1' && e.code !== 'Digit2') {
        sequence = [];
        if (timeout) clearTimeout(timeout);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (timeout) clearTimeout(timeout);
    };
  }, [isActive]);


  // === ADD THIS EFFECT ===

  // Prevent browser back / swipe back / history navigation
  useEffect(() => {
    if (!isActive) return;

    // Push fake history state to prevent back navigation
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e) => {
      // Allow navigation if developer bypass is active
      if (developerBypassRef.current) {
        return; // Let the navigation proceed
      }

      // Prevent the default back navigation
      e.preventDefault();

      // Show modal when user tries to navigate back
      onExitAttempt();

      // Push again to block back navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Handle touch gestures for swipe back (mobile)
    let touchStartX = 0;
    let touchStartY = 0;
    const touchThreshold = 50; // Minimum swipe distance

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Detect right swipe (swipe from left edge) - common gesture for back navigation
      // Only trigger if swipe is mostly horizontal and from the left edge
      if (
        touchStartX < 20 && // Started near left edge
        Math.abs(deltaX) > touchThreshold &&
        Math.abs(deltaX) > Math.abs(deltaY) && // More horizontal than vertical
        deltaX > 0 // Swiping right
      ) {
        // Prevent swipe back navigation, no modal
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
    };

    // Handle mouse wheel + horizontal scroll (some browsers use this for navigation)
    const handleWheel = (e) => {
      // Detect horizontal scroll that might trigger navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX < 0) {
        // Scrolling left (backward) - might be trying to navigate back
        // Only trigger if at the left edge of scrollable content
        if (window.scrollX === 0 || document.documentElement.scrollLeft === 0) {
          // Prevent navigation, no modal
          e.preventDefault();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isActive, onExitAttempt]);


  // === FULLSCREEN EXIT DETECTION ===
  // Use the utility function to monitor fullscreen changes
  // This ensures we don't show the exit modal on initial entry
  useEffect(() => {
    if (!isActive) return;

    const cleanup = monitorFullscreen(
      () => {
        // User tried to exit fullscreen - show exit modal
        onExitAttempt();
      },
      false // Don't auto re-enter, let modal handle it
    );

    return cleanup;
  }, [isActive, onExitAttempt]);


  // === Helper function to force fullscreen again ===
  const forceFullscreen = useCallback(() => {
    const el = document.documentElement;
    const originals = originalFullscreenMethodsRef.current;

    // Use the original methods (stored before we overrode them) to bypass our restrictions
    if (originals.requestFullscreen) {
      originals.requestFullscreen.call(el).catch(err => {
        console.warn('[MockTestSecurity] Failed to enter fullscreen:', err);
      });
    } else if (originals.webkitRequestFullscreen) {
      originals.webkitRequestFullscreen.call(el);
    } else if (originals.mozRequestFullScreen) {
      originals.mozRequestFullScreen.call(el);
    } else if (originals.msRequestFullscreen) {
      originals.msRequestFullscreen.call(el);
    }
  }, []);


  return { resetExitModal, forceFullscreen };
};

