import * as React from "react";

const SMALL_SCREEN_BREAKPOINT = 768;

export function useSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < SMALL_SCREEN_BREAKPOINT);
    };

    // Check on mount
    checkScreenSize();

    // Listen for resize events
    window.addEventListener("resize", checkScreenSize);
    window.addEventListener("orientationchange", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
      window.removeEventListener("orientationchange", checkScreenSize);
    };
  }, []);

  return isSmallScreen;
}
