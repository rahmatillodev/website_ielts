import React from 'react';
import { useTestStore } from '@/store/testStore';
import AnalyticsPage from './AnalyticsPage';
import CefrAnalyticsPage from './CefrAnalyticsPage';

/**
 * Renders IELTS or CEFR analytics based on sidebar test program (no mixed data).
 */
const AnalyticsRouter = () => {
  const testProgram = useTestStore((state) => state.testProgram);

  if (testProgram === 'cefr') {
    return <CefrAnalyticsPage />;
  }

  return <AnalyticsPage />;
};

export default AnalyticsRouter;
