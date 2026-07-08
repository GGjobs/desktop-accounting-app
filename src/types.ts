export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Expense {
  id: number;
  amountCents: number;
  currency: 'CNY';
  spentAt: string;
  categoryLevel1Id: number;
  categoryLevel1Name: string;
  categoryLevel2Id: number;
  categoryLevel2Name: string;
  paymentMethod: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddExpenseInput {
  amountCents: number;
  spentAt: string;
  categoryLevel2Id: number;
  paymentMethod: string;
  note: string;
}

export interface UpdateExpenseInput extends AddExpenseInput {
  id: number;
}

export interface AddCategoryInput {
  name: string;
  parentId: number | null;
}

export interface RenameCategoryInput {
  id: number;
  name: string;
}

export interface SetCategoryActiveInput {
  id: number;
  isActive: boolean;
}

export interface SetMonthlyBudgetInput {
  monthlyBudgetCents: number;
}

export interface CategoryTotal {
  categoryId: number;
  categoryName: string;
  amountCents: number;
  percent: number;
}

export interface DailyTotal {
  date: string;
  amountCents: number;
}

export interface DashboardSummary {
  monthExpenseCents: number;
  todayExpenseCents: number;
  averageDailyCents: number;
  monthlyBudgetCents: number;
  budgetRemainingCents: number;
}

export interface AppInfo {
  databasePath: string;
  appVersion: string;
  platform: string;
}

export interface DashboardData {
  categories: Category[];
  expenses: Expense[];
  categoryTotals: CategoryTotal[];
  dailyTotals: DailyTotal[];
  paymentMethods: string[];
  appInfo: AppInfo;
  summary: DashboardSummary;
}

export interface AccountingApi {
  getDashboard: () => Promise<DashboardData>;
  addExpense: (input: AddExpenseInput) => Promise<DashboardData>;
  updateExpense: (input: UpdateExpenseInput) => Promise<DashboardData>;
  deleteExpense: (id: number) => Promise<DashboardData>;
  addCategory: (input: AddCategoryInput) => Promise<DashboardData>;
  renameCategory: (input: RenameCategoryInput) => Promise<DashboardData>;
  setCategoryActive: (input: SetCategoryActiveInput) => Promise<DashboardData>;
  setMonthlyBudget: (input: SetMonthlyBudgetInput) => Promise<DashboardData>;
  exportCsv: () => Promise<{ canceled: boolean; filePath?: string }>;
}
