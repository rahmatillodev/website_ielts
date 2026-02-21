/**
 * Utility functions for managing fullscreen during mock tests
 * Ensures users stay in fullscreen permanently during practice sections
 */

/**
 * Check if currently in fullscreen mode
 */
export const isFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

/**
 * Enter fullscreen mode
 * Returns a promise that resolves when fullscreen is entered
 */
export const enterFullscreen = async (element = document.documentElement) => {
  try {
    if (isFullscreen()) {
      return true; // Already in fullscreen
    }

    // Try different browser-specific methods
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
      return true;
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
      return true;
    }
    
    return false; // Fullscreen not supported
  } catch (error) {
    // Fullscreen may require user interaction
    // Return false so caller can set up user interaction listener
    console.warn('[mockTestFullscreen] Failed to enter fullscreen:', error);
    return false;
  }
};

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch (error) {
    console.warn('[mockTestFullscreen] Failed to exit fullscreen:', error);
  }
};

/**
 * Auto-enter fullscreen when entering practice pages
 * Sets up listener for user interaction if immediate fullscreen fails
 * @param {Function} onFullscreenEntered - Callback when fullscreen is successfully entered
 * @param {Function} onFullscreenFailed - Callback when fullscreen fails (optional)
 * @returns {Function} Cleanup function
 */
export const autoEnterFullscreen = (onFullscreenEntered, onFullscreenFailed) => {
  let fullscreenEntered = false;
  let userInteractionListener = null;
  let timeoutId = null;

  const attemptFullscreen = async () => {
    // Check if already in fullscreen
    if (isFullscreen()) {
      fullscreenEntered = true;
      if (onFullscreenEntered) onFullscreenEntered();
      return true;
    }

    // Try to enter fullscreen
    const success = await enterFullscreen();
    
    if (success) {
      fullscreenEntered = true;
      if (onFullscreenEntered) onFullscreenEntered();
      // Remove user interaction listener if it was set up
      if (userInteractionListener) {
        document.removeEventListener('click', userInteractionListener, true);
        document.removeEventListener('touchstart', userInteractionListener, true);
        document.removeEventListener('keydown', userInteractionListener, true);
        userInteractionListener = null;
      }
      return true;
    }

    // Fullscreen failed (likely needs user interaction)
    // Set up listener for first user interaction
    if (!userInteractionListener) {
      userInteractionListener = async () => {
        try {
          const success = await enterFullscreen();
          if (success) {
            fullscreenEntered = true;
            if (onFullscreenEntered) onFullscreenEntered();
            // Remove listener after successful fullscreen
            document.removeEventListener('click', userInteractionListener, true);
            document.removeEventListener('touchstart', userInteractionListener, true);
            document.removeEventListener('keydown', userInteractionListener, true);
            userInteractionListener = null;
          }
        } catch (err) {
          // Silently fail - user may have already entered fullscreen
        }
      };
      
      // Listen for first user interaction
      document.addEventListener('click', userInteractionListener, true);
      document.addEventListener('touchstart', userInteractionListener, true);
      document.addEventListener('keydown', userInteractionListener, true);
    }

    if (onFullscreenFailed) onFullscreenFailed();
    return false;
  };

  // Small delay to ensure page is rendered
  timeoutId = setTimeout(attemptFullscreen, 100);

  // Also try immediately (in case page is already rendered)
  attemptFullscreen();

  // Cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (userInteractionListener) {
      document.removeEventListener('click', userInteractionListener, true);
      document.removeEventListener('touchstart', userInteractionListener, true);
      document.removeEventListener('keydown', userInteractionListener, true);
      userInteractionListener = null;
    }
  };
};

/**
 * Monitor fullscreen changes and re-enter if user exits
 * Only shows exit modal when user actively tries to exit (not on initial entry)
 * @param {Function} onExitAttempt - Callback when user tries to exit fullscreen
 * @param {boolean} preventExit - If true, automatically re-enter fullscreen when user exits
 * @returns {Function} Cleanup function
 */
export const monitorFullscreen = (onExitAttempt, preventExit = false) => {
  let wasFullscreen = isFullscreen();
  let isInitialCheck = true;

  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = isFullscreen();

    // Skip the first check (initial mount) to avoid showing modal on entry
    if (isInitialCheck) {
      isInitialCheck = false;
      wasFullscreen = isCurrentlyFullscreen;
      return;
    }

    // If user exits fullscreen (was fullscreen, now not)
    if (wasFullscreen && !isCurrentlyFullscreen) {
      // User actively exited fullscreen - show modal
      if (onExitAttempt) {
        onExitAttempt();
      }

      // If preventExit is true, automatically re-enter fullscreen
      if (preventExit) {
        // Small delay to allow modal to show first
        setTimeout(() => {
          enterFullscreen().catch(() => {
            // Silently fail - user may have blocked fullscreen
          });
        }, 100);
      }
    }

    // Update tracked state
    wasFullscreen = isCurrentlyFullscreen;
  };

  // Listen to all fullscreen change events
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  // Cleanup function
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  };
};

