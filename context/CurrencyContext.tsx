import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Currency = {
  symbol: string;
  name:   string;
  code:   string;
};

export const CURRENCIES: Currency[] = [
  { symbol: '₱',  name: 'Philippine Peso',   code: 'PHP' },
  { symbol: '$',  name: 'US Dollar',          code: 'USD' },
  { symbol: '€',  name: 'Euro',               code: 'EUR' },
  { symbol: '£',  name: 'British Pound',      code: 'GBP' },
  { symbol: '¥',  name: 'Japanese Yen',       code: 'JPY' },
  { symbol: '₩',  name: 'Korean Won',         code: 'KRW' },
  { symbol: 'A$', name: 'Australian Dollar',  code: 'AUD' },
  { symbol: 'C$', name: 'Canadian Dollar',    code: 'CAD' },
  { symbol: 'Fr', name: 'Swiss Franc',        code: 'CHF' },
  { symbol: '₹',  name: 'Indian Rupee',       code: 'INR' },
  { symbol: 'R$', name: 'Brazilian Real',     code: 'BRL' },
  { symbol: '₺',  name: 'Turkish Lira',       code: 'TRY' },
];

type CurrencyCtx = {
  currency:    Currency;
  setCurrency: (c: Currency) => Promise<void>;
  fmt:         (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyCtx>({
  currency:    CURRENCIES[0],
  setCurrency: async () => {},
  fmt:         (n) => `₱${n.toLocaleString()}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);

  useEffect(() => {
    AsyncStorage.getItem('currency').then(saved => {
      if (saved) setCurrencyState(JSON.parse(saved));
    });
  }, []);

  async function setCurrency(c: Currency) {
    setCurrencyState(c);
    await AsyncStorage.setItem('currency', JSON.stringify(c));
  }

  function fmt(amount: number): string {
    return `${currency.symbol}${amount.toLocaleString()}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() { return useContext(CurrencyContext); }