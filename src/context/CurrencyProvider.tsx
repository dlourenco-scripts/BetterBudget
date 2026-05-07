import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Image} from 'react-native';
import {
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Foundation,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appImages} from '@/constants/assets';

export type CurrencyCode =
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'JPY'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'CNY'
  | 'SEK'
  | 'NZD'
  | 'PKR';

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  getCurrencyIcon: (color?: string) => React.ReactNode;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

const CURRENCY_STORAGE_KEY = '@budgetapp:selectedCurrency';

export const CurrencyProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // Load currency from storage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (mounted && storedCurrency) {
          setSelectedCurrency(storedCurrency as CurrencyCode);
        }
      } catch (e) {
        // ignore storage errors
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = useCallback(async (currency: CurrencyCode) => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
      setSelectedCurrency(currency);
    } catch (e) {
      // ignore storage errors but still update state
      setSelectedCurrency(currency);
    }
  }, []);

  const getCurrencyIcon = useCallback(
    (color?: string) => {
      const iconSize = 15;
      const iconColor = color || 'black';

      switch (selectedCurrency) {
        case 'USD':
        case 'AUD':
        case 'CAD':
        case 'NZD':
          return <Foundation name="dollar" size={iconSize} color={iconColor} />;
        case 'GBP':
          return (
            <FontAwesome5 name="pound-sign" size={iconSize} color={iconColor} />
          );
        case 'EUR':
          return <FontAwesome name="euro" size={iconSize} color={iconColor} />;
        case 'JPY':
        case 'CNY':
          return <FontAwesome name="yen" size={iconSize} color={iconColor} />;
        case 'CHF':
          return (
            <FontAwesome6 name="franc-sign" size={iconSize} color={iconColor} />
          );
        case 'SEK':
          return (
            <Image
              source={appImages.kr}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: iconColor,
                resizeMode: 'contain',
              }}
            />
          );
        case 'PKR':
          return (
            <Image
              source={appImages.Rs}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: iconColor,
                resizeMode: 'contain',
              }}
            />
          );
        default:
          return <Foundation name="dollar" size={iconSize} color={iconColor} />;
      }
    },
    [selectedCurrency],
  );

  const currencySymbol = useMemo(() => {
    switch (selectedCurrency) {
      case 'USD':
      case 'AUD':
      case 'CAD':
      case 'NZD':
        return '$';
      case 'GBP':
        return '£';
      case 'EUR':
        return '€';
      case 'JPY':
      case 'CNY':
        return '¥';
      case 'CHF':
        return 'Fr';
      case 'SEK':
        return 'kr';
      case 'PKR':
        return 'Rs';
      default:
        return '$';
    }
  }, [selectedCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setCurrency,
        getCurrencyIcon,
        currencySymbol,
      }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};
