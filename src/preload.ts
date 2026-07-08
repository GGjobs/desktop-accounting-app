import { contextBridge, ipcRenderer } from 'electron';

import type {
  AccountingApi,
  AddCategoryInput,
  AddExpenseInput,
  DashboardData,
  RenameCategoryInput,
  SetCategoryActiveInput,
  SetMonthlyBudgetInput,
  UpdateExpenseInput,
} from './types';

const api: AccountingApi = {
  getDashboard: () => ipcRenderer.invoke('dashboard:get') as Promise<DashboardData>,
  addExpense: (input: AddExpenseInput) => ipcRenderer.invoke('expenses:add', input) as Promise<DashboardData>,
  updateExpense: (input: UpdateExpenseInput) => ipcRenderer.invoke('expenses:update', input) as Promise<DashboardData>,
  deleteExpense: (id: number) => ipcRenderer.invoke('expenses:delete', id) as Promise<DashboardData>,
  addCategory: (input: AddCategoryInput) => ipcRenderer.invoke('categories:add', input) as Promise<DashboardData>,
  renameCategory: (input: RenameCategoryInput) => ipcRenderer.invoke('categories:rename', input) as Promise<DashboardData>,
  setCategoryActive: (input: SetCategoryActiveInput) => ipcRenderer.invoke('categories:setActive', input) as Promise<DashboardData>,
  setMonthlyBudget: (input: SetMonthlyBudgetInput) =>
    ipcRenderer.invoke('settings:setMonthlyBudget', input) as Promise<DashboardData>,
  exportCsv: () => ipcRenderer.invoke('expenses:exportCsv') as Promise<{ canceled: boolean; filePath?: string }>,
};

contextBridge.exposeInMainWorld('accountingApi', api);
