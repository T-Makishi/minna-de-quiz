import { createContext, useContext } from 'react';
import { AppSettings } from '../types';

export type AppSettingsContextValue = {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
};

export const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('AppSettingsContext is not available.');
  }
  return context;
}
