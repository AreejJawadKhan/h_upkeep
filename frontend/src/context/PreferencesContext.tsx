import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CurrencyCode = 'PKR' | 'USD' | 'GBP' | 'EUR' | 'AED' | 'SAR';

const STORAGE_KEY = 'hupkeep.currency';
const DEFAULT_CURRENCY: CurrencyCode = 'PKR';
const CURRENCY_OPTIONS: CurrencyCode[] = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'];

type PreferencesContextValue = {
  currencyCode: CurrencyCode;
  setCurrencyCode: (value: CurrencyCode) => void;
  currencyOptions: CurrencyCode[];
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStoredCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && CURRENCY_OPTIONS.includes(stored as CurrencyCode)) {
    return stored as CurrencyCode;
  }

  return DEFAULT_CURRENCY;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>(readStoredCurrency);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currencyCode);
  }, [currencyCode]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      currencyCode,
      setCurrencyCode: setCurrencyCodeState,
      currencyOptions: CURRENCY_OPTIONS,
    }),
    [currencyCode],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
