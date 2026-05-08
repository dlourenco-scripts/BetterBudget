import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalkthroughContextType {
  currentStep: number;
  isWalkthroughActive: boolean;
  startWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipWalkthrough: () => void;
  resetWalkthrough: () => void; // For testing
  isStepVisible: (stepNumber: number) => boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(
  undefined,
);

export const WalkthroughProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  const startWalkthrough = useCallback(async () => {
    try {
      const value = await AsyncStorage.getItem('hasSeenWalkthrough');
      const hasSeenWalkthrough = value === 'true';
      if (!hasSeenWalkthrough) {
        setCurrentStep(1);
        setIsWalkthroughActive(true);
      }
    } catch (error) {
      console.error('Error checking walkthrough status:', error);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep === 8) {
      // Last step
      skipWalkthrough();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipWalkthrough = useCallback(async () => {
    setCurrentStep(0);
    setIsWalkthroughActive(false);
    try {
      await AsyncStorage.setItem('hasSeenWalkthrough', 'true');
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Reset walkthrough - for testing purposes
  const resetWalkthrough = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('hasSeenWalkthrough');
      setCurrentStep(1);
      setIsWalkthroughActive(true);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const isStepVisible = useCallback(
    (stepNumber: number) => {
      return isWalkthroughActive && currentStep === stepNumber;
    },
    [isWalkthroughActive, currentStep],
  );

  // On mount, check whether the walkthrough has been seen; if not, start it
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenWalkthrough');
        const hasSeenWalkthrough = value === 'true';
        if (mounted && !hasSeenWalkthrough) {
          setCurrentStep(1);
          setIsWalkthroughActive(true);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <WalkthroughContext.Provider
      value={{
        currentStep,
        isWalkthroughActive,
        startWalkthrough,
        nextStep,
        prevStep,
        skipWalkthrough,
        resetWalkthrough,
        isStepVisible,
      }}>
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
};
