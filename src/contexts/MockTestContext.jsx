import { createContext, useContext, useState } from 'react';

const MockTestContext = createContext(null);

export const useMockTest = () => {
  const context = useContext(MockTestContext);
  return context;
};

export const MockTestProvider = ({ children, config }) => {
  const [mockTestConfig] = useState(config || {});

  return (
    <MockTestContext.Provider value={mockTestConfig}>
      {children}
    </MockTestContext.Provider>
  );
};

