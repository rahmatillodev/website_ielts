import { useState, useEffect } from "react";

/**
 * Get the appropriate Tailwind grid columns class based on window width
 * @returns {string} Tailwind grid columns class
 */
export const getGridCols = () => {
  const w = window.innerWidth;
  if (w >= 1500) return "grid-cols-4";
  if (w >= 1200) return "grid-cols-3";
  if (w >= 768) return "grid-cols-2";
  return "grid-cols-1";
};

/**
 * Custom hook that returns the responsive grid columns class
 * and automatically updates on window resize
 * @returns {string} Tailwind grid columns class
 */
export const useResponsiveGridCols = () => {
  const [cols, setCols] = useState("grid-cols-1");

  useEffect(() => {
    // Initial
    setCols(getGridCols());

    // Resize listener
    const handleResize = () => setCols(getGridCols());
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return cols;
};

