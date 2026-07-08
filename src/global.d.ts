import type { AccountingApi } from './types';

declare global {
  interface Window {
    accountingApi: AccountingApi;
  }
}

export {};
