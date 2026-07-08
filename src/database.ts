import Database from 'better-sqlite3';
import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

import type {
  AddExpenseInput,
  AddCategoryInput,
  Category,
  CategoryTotal,
  DailyTotal,
  DashboardData,
  Expense,
  RenameCategoryInput,
  SetCategoryActiveInput,
  SetMonthlyBudgetInput,
  UpdateExpenseInput,
} from './types';

const paymentMethods = ['微信支付', '支付宝', '银行卡', '信用卡', '现金', '其他'];
const defaultMonthlyBudgetCents = 500000;
const monthlyBudgetSettingKey = 'monthly_budget_cents';

let db: Database.Database | null = null;

interface CategoryRow {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  is_active: number;
}

interface ExpenseRow {
  id: number;
  amount_cents: number;
  currency: 'CNY';
  spent_at: string;
  category_level1_id: number;
  category_level1_name: string;
  category_level2_id: number;
  category_level2_name: string;
  payment_method: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface TotalRow {
  amount_cents: number | null;
}

interface CategoryTotalRow {
  category_id: number;
  category_name: string;
  amount_cents: number;
}

interface DailyTotalRow {
  date: string;
  amount_cents: number;
}

interface IdRow {
  id: number;
}

interface CategoryLookupRow {
  id: number;
  parent_id: number | null;
  is_active: number;
}

interface SettingRow {
  value: string;
}

const defaultCategories: Array<{ name: string; children: string[] }> = [
  { name: '餐饮', children: ['早餐', '午餐', '晚餐', '外卖', '饮品零食', '聚餐'] },
  { name: '交通', children: ['公交地铁', '打车网约车', '火车高铁', '机票', '加油充电', '停车过路'] },
  { name: '购物', children: ['日用品', '服饰鞋包', '数码电器', '美妆个护', '家居用品'] },
  { name: '居住', children: ['房租', '房贷', '物业', '水电燃气', '宽带通讯', '维修'] },
  { name: '娱乐休闲', children: ['电影演出', '游戏', '旅行', '运动健身', '会员订阅'] },
  { name: '医疗健康', children: ['挂号问诊', '药品', '体检', '保险', '护理'] },
  { name: '教育成长', children: ['课程培训', '书籍', '考试证书', '文具工具'] },
  { name: '人情社交', children: ['礼物', '红包', '请客', '家庭支出'] },
  { name: '金融缴费', children: ['还款', '手续费', '税费', '分期付款'] },
  { name: '其他', children: ['未分类', '临时支出'] },
];

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const getMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
};

const getDatabasePath = (): string => process.env.ACCOUNTING_DB_PATH ?? path.join(app.getPath('userData'), 'desktop-accounting.sqlite3');

const getDb = (): Database.Database => {
  if (!db) {
    const dbPath = getDatabasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    seedDefaults(db);
  }

  return db;
};

const migrate = (database: Database.Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      spent_at TEXT NOT NULL,
      category_level1_id INTEGER NOT NULL,
      category_level2_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_level1_id) REFERENCES categories(id),
      FOREIGN KEY (category_level2_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_level1_id, category_level2_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
};

const seedDefaults = (database: Database.Database): void => {
  ensureAppSetting(database, monthlyBudgetSettingKey, String(defaultMonthlyBudgetCents));

  const categoryCount = database.prepare('SELECT COUNT(*) AS amount_cents FROM categories').get() as TotalRow;

  if ((categoryCount.amount_cents ?? 0) === 0) {
    const insertCategory = database.prepare(`
      INSERT INTO categories (name, parent_id, sort_order, is_active)
      VALUES (@name, @parentId, @sortOrder, 1)
    `);

    const seedCategories = database.transaction(() => {
      defaultCategories.forEach((category, categoryIndex) => {
        const result = insertCategory.run({
          name: category.name,
          parentId: null,
          sortOrder: categoryIndex,
        });
        const parentId = Number(result.lastInsertRowid);

        category.children.forEach((child, childIndex) => {
          insertCategory.run({
            name: child,
            parentId,
            sortOrder: childIndex,
          });
        });
      });
    });

    seedCategories();
  }

  const expenseCount = database.prepare('SELECT COUNT(*) AS amount_cents FROM expenses').get() as TotalRow;

  if ((expenseCount.amount_cents ?? 0) > 0) {
    return;
  }

  const findChild = database.prepare(`
    SELECT id
    FROM categories
    WHERE name = ? AND parent_id IS NOT NULL
    LIMIT 1
  `);
  const findParent = database.prepare(`
    SELECT parent_id AS id
    FROM categories
    WHERE id = ?
    LIMIT 1
  `);
  const insertExpense = database.prepare(`
    INSERT INTO expenses (
      amount_cents,
      currency,
      spent_at,
      category_level1_id,
      category_level2_id,
      payment_method,
      note,
      created_at,
      updated_at
    )
    VALUES (@amountCents, 'CNY', @spentAt, @categoryLevel1Id, @categoryLevel2Id, @paymentMethod, @note, @createdAt, @updatedAt)
  `);

  const today = new Date();
  const samples = [
    { child: '午餐', amountCents: 2800, offset: 0, note: '沙县小吃', paymentMethod: '微信支付' },
    { child: '公交地铁', amountCents: 600, offset: 0, note: '地铁 2 号线', paymentMethod: '支付宝' },
    { child: '日用品', amountCents: 8650, offset: -1, note: '超市购物', paymentMethod: '微信支付' },
    { child: '午餐', amountCents: 2500, offset: -1, note: '兰州拉面', paymentMethod: '微信支付' },
    { child: '打车网约车', amountCents: 1800, offset: -2, note: '打车回家', paymentMethod: '支付宝' },
    { child: '饮品零食', amountCents: 1600, offset: -3, note: '咖啡', paymentMethod: '银行卡' },
    { child: '会员订阅', amountCents: 3000, offset: -4, note: '视频会员', paymentMethod: '信用卡' },
  ];

  const seedExpenses = database.transaction(() => {
    samples.forEach((sample) => {
      const child = findChild.get(sample.child) as IdRow | undefined;
      if (!child) {
        return;
      }

      const parent = findParent.get(child.id) as IdRow | undefined;
      if (!parent) {
        return;
      }

      const date = toLocalDateKey(addDays(today, sample.offset));
      const timestamp = `${date}T${sample.offset === 0 ? '12:30' : '18:30'}:00`;
      const now = new Date().toISOString();

      insertExpense.run({
        amountCents: sample.amountCents,
        spentAt: timestamp,
        categoryLevel1Id: parent.id,
        categoryLevel2Id: child.id,
        paymentMethod: sample.paymentMethod,
        note: sample.note,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  seedExpenses();
};

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  parentId: row.parent_id,
  sortOrder: row.sort_order,
  isActive: row.is_active === 1,
});

const mapExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  amountCents: row.amount_cents,
  currency: row.currency,
  spentAt: row.spent_at,
  categoryLevel1Id: row.category_level1_id,
  categoryLevel1Name: row.category_level1_name,
  categoryLevel2Id: row.category_level2_id,
  categoryLevel2Name: row.category_level2_name,
  paymentMethod: row.payment_method,
  note: row.note ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getTotal = (database: Database.Database, start: string, end: string): number => {
  const row = database
    .prepare('SELECT COALESCE(SUM(amount_cents), 0) AS amount_cents FROM expenses WHERE spent_at >= ? AND spent_at < ?')
    .get(start, end) as TotalRow;

  return row.amount_cents ?? 0;
};

const ensureAppSetting = (database: Database.Database, key: string, value: string): void => {
  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT OR IGNORE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `)
    .run(key, value, now);
};

const getAppSetting = (database: Database.Database, key: string): string | null => {
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as SettingRow | undefined;
  return row?.value ?? null;
};

const setAppSetting = (database: Database.Database, key: string, value: string): void => {
  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (@key, @value, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    .run({ key, value, updatedAt: now });
};

const getMonthlyBudgetCents = (database: Database.Database): number => {
  const stored = Number(getAppSetting(database, monthlyBudgetSettingKey));
  if (Number.isFinite(stored) && stored > 0) {
    return Math.round(stored);
  }

  return defaultMonthlyBudgetCents;
};

const normalizeCategoryName = (name: string): string => name.trim();

const ensureCategoryName = (name: string): string => {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error('分类名称不能为空');
  }

  if (normalized.length > 16) {
    throw new Error('分类名称最多 16 个字');
  }

  return normalized;
};

const categoryNameExists = (database: Database.Database, name: string, parentId: number | null, exceptId?: number): boolean => {
  if (parentId === null) {
    const row = database
      .prepare(`
        SELECT id
        FROM categories
        WHERE name = ? AND parent_id IS NULL AND (? IS NULL OR id != ?)
        LIMIT 1
      `)
      .get(name, exceptId ?? null, exceptId ?? null) as IdRow | undefined;
    return Boolean(row);
  }

  const row = database
    .prepare(`
      SELECT id
      FROM categories
      WHERE name = ? AND parent_id = ? AND (? IS NULL OR id != ?)
      LIMIT 1
    `)
    .get(name, parentId, exceptId ?? null, exceptId ?? null) as IdRow | undefined;
  return Boolean(row);
};

const getNextSortOrder = (database: Database.Database, parentId: number | null): number => {
  const row =
    parentId === null
      ? (database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS amount_cents FROM categories WHERE parent_id IS NULL').get() as TotalRow)
      : (database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS amount_cents FROM categories WHERE parent_id = ?').get(parentId) as TotalRow);

  return row.amount_cents ?? 0;
};

export const getDashboardData = (): DashboardData => {
  const database = getDb();
  const { start, end } = getMonthRange();
  const today = toLocalDateKey(new Date());
  const tomorrow = toLocalDateKey(addDays(new Date(), 1));
  const monthlyBudgetCents = getMonthlyBudgetCents(database);

  const categories = (database
    .prepare('SELECT id, name, parent_id, sort_order, is_active FROM categories ORDER BY parent_id IS NOT NULL, sort_order, id')
    .all() as CategoryRow[]).map(mapCategory);

  const expenses = (database
    .prepare(`
      SELECT
        expenses.id,
        expenses.amount_cents,
        expenses.currency,
        expenses.spent_at,
        expenses.category_level1_id,
        level1.name AS category_level1_name,
        expenses.category_level2_id,
        level2.name AS category_level2_name,
        expenses.payment_method,
        expenses.note,
        expenses.created_at,
        expenses.updated_at
      FROM expenses
      INNER JOIN categories AS level1 ON level1.id = expenses.category_level1_id
      INNER JOIN categories AS level2 ON level2.id = expenses.category_level2_id
      ORDER BY expenses.spent_at DESC, expenses.id DESC
    `)
    .all() as ExpenseRow[]).map(mapExpense);

  const monthExpenseCents = getTotal(database, start, end);
  const todayExpenseCents = getTotal(database, today, tomorrow);
  const currentDay = new Date().getDate();

  const categoryRows = database
    .prepare(`
      SELECT
        level1.id AS category_id,
        level1.name AS category_name,
        SUM(expenses.amount_cents) AS amount_cents
      FROM expenses
      INNER JOIN categories AS level1 ON level1.id = expenses.category_level1_id
      WHERE expenses.spent_at >= ? AND expenses.spent_at < ?
      GROUP BY level1.id, level1.name
      ORDER BY amount_cents DESC
    `)
    .all(start, end) as CategoryTotalRow[];

  const categoryTotals: CategoryTotal[] = categoryRows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    amountCents: row.amount_cents,
    percent: monthExpenseCents > 0 ? Math.round((row.amount_cents / monthExpenseCents) * 1000) / 10 : 0,
  }));

  const dailyTotals = database
    .prepare(`
      SELECT SUBSTR(spent_at, 1, 10) AS date, SUM(amount_cents) AS amount_cents
      FROM expenses
      WHERE spent_at >= ? AND spent_at < ?
      GROUP BY SUBSTR(spent_at, 1, 10)
      ORDER BY date ASC
    `)
    .all(start, end) as DailyTotalRow[];

  return {
    categories,
    expenses,
    categoryTotals,
    dailyTotals: dailyTotals.map((row): DailyTotal => ({ date: row.date, amountCents: row.amount_cents })),
    paymentMethods,
    appInfo: {
      databasePath: getDatabasePath(),
      appVersion: app.getVersion(),
      platform: process.platform,
    },
    summary: {
      monthExpenseCents,
      todayExpenseCents,
      averageDailyCents: currentDay > 0 ? Math.round(monthExpenseCents / currentDay) : 0,
      monthlyBudgetCents,
      budgetRemainingCents: monthlyBudgetCents - monthExpenseCents,
    },
  };
};

export const addExpense = (input: AddExpenseInput): DashboardData => {
  const database = getDb();

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('支出金额必须大于 0');
  }

  const child = database
    .prepare('SELECT id, parent_id FROM categories WHERE id = ? AND parent_id IS NOT NULL AND is_active = 1')
    .get(input.categoryLevel2Id) as { id: number; parent_id: number } | undefined;

  if (!child) {
    throw new Error('请选择有效的二级分类');
  }

  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO expenses (
        amount_cents,
        currency,
        spent_at,
        category_level1_id,
        category_level2_id,
        payment_method,
        note,
        created_at,
        updated_at
      )
      VALUES (@amountCents, 'CNY', @spentAt, @categoryLevel1Id, @categoryLevel2Id, @paymentMethod, @note, @createdAt, @updatedAt)
    `)
    .run({
      amountCents: input.amountCents,
      spentAt: input.spentAt,
      categoryLevel1Id: child.parent_id,
      categoryLevel2Id: child.id,
      paymentMethod: input.paymentMethod || paymentMethods[0],
      note: input.note.trim(),
      createdAt: now,
      updatedAt: now,
    });

  return getDashboardData();
};

export const updateExpense = (input: UpdateExpenseInput): DashboardData => {
  const database = getDb();

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('请选择有效的花销记录');
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('支出金额必须大于 0');
  }

  const existingExpense = database
    .prepare('SELECT category_level2_id AS id FROM expenses WHERE id = ?')
    .get(input.id) as IdRow | undefined;

  if (!existingExpense) {
    throw new Error('没有找到要编辑的花销记录');
  }

  const child = database
    .prepare(`
      SELECT id, parent_id, is_active
      FROM categories
      WHERE id = ? AND parent_id IS NOT NULL
    `)
    .get(input.categoryLevel2Id) as CategoryLookupRow | undefined;

  if (!child || (child.is_active !== 1 && child.id !== existingExpense.id)) {
    throw new Error('请选择有效的二级分类');
  }

  const result = database
    .prepare(`
      UPDATE expenses
      SET
        amount_cents = @amountCents,
        spent_at = @spentAt,
        category_level1_id = @categoryLevel1Id,
        category_level2_id = @categoryLevel2Id,
        payment_method = @paymentMethod,
        note = @note,
        updated_at = @updatedAt
      WHERE id = @id
    `)
    .run({
      id: input.id,
      amountCents: input.amountCents,
      spentAt: input.spentAt,
      categoryLevel1Id: child.parent_id,
      categoryLevel2Id: child.id,
      paymentMethod: input.paymentMethod || paymentMethods[0],
      note: input.note.trim(),
      updatedAt: new Date().toISOString(),
    });

  if (result.changes === 0) {
    throw new Error('没有找到要编辑的花销记录');
  }

  return getDashboardData();
};

export const addCategory = (input: AddCategoryInput): DashboardData => {
  const database = getDb();
  const name = ensureCategoryName(input.name);

  if (input.parentId !== null && (!Number.isInteger(input.parentId) || input.parentId <= 0)) {
    throw new Error('请选择有效的一级分类');
  }

  if (categoryNameExists(database, name, input.parentId)) {
    throw new Error('同一级下已经有同名分类');
  }

  if (input.parentId !== null) {
    const parent = database
      .prepare('SELECT id, parent_id, is_active FROM categories WHERE id = ?')
      .get(input.parentId) as CategoryLookupRow | undefined;

    if (!parent || parent.parent_id !== null || parent.is_active !== 1) {
      throw new Error('请选择启用中的一级分类');
    }
  }

  database
    .prepare(`
      INSERT INTO categories (name, parent_id, sort_order, is_active)
      VALUES (@name, @parentId, @sortOrder, 1)
    `)
    .run({
      name,
      parentId: input.parentId,
      sortOrder: getNextSortOrder(database, input.parentId),
    });

  return getDashboardData();
};

export const renameCategory = (input: RenameCategoryInput): DashboardData => {
  const database = getDb();
  const name = ensureCategoryName(input.name);

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('请选择有效的分类');
  }

  const category = database
    .prepare('SELECT id, parent_id, is_active FROM categories WHERE id = ?')
    .get(input.id) as CategoryLookupRow | undefined;

  if (!category) {
    throw new Error('没有找到要重命名的分类');
  }

  if (categoryNameExists(database, name, category.parent_id, category.id)) {
    throw new Error('同一级下已经有同名分类');
  }

  database.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, category.id);
  return getDashboardData();
};

export const setCategoryActive = (input: SetCategoryActiveInput): DashboardData => {
  const database = getDb();

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('请选择有效的分类');
  }

  const category = database
    .prepare('SELECT id, parent_id, is_active FROM categories WHERE id = ?')
    .get(input.id) as CategoryLookupRow | undefined;

  if (!category) {
    throw new Error('没有找到要处理的分类');
  }

  const nextActive = input.isActive ? 1 : 0;

  if (!input.isActive) {
    const remainingActiveChildren =
      category.parent_id === null
        ? (database
            .prepare(`
              SELECT COUNT(*) AS amount_cents
              FROM categories
              WHERE parent_id IS NOT NULL AND is_active = 1 AND parent_id != ?
            `)
            .get(category.id) as TotalRow)
        : (database
            .prepare(`
              SELECT COUNT(*) AS amount_cents
              FROM categories
              WHERE parent_id IS NOT NULL AND is_active = 1 AND id != ?
            `)
            .get(category.id) as TotalRow);

    if ((remainingActiveChildren.amount_cents ?? 0) <= 0) {
      throw new Error('至少保留一个启用中的二级分类');
    }
  }

  const toggleCategory = database.transaction(() => {
    database.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(nextActive, category.id);

    if (category.parent_id === null && !input.isActive) {
      database.prepare('UPDATE categories SET is_active = 0 WHERE parent_id = ?').run(category.id);
    }

    if (category.parent_id !== null && input.isActive) {
      database.prepare('UPDATE categories SET is_active = 1 WHERE id = ?').run(category.parent_id);
    }
  });

  toggleCategory();
  return getDashboardData();
};

export const setMonthlyBudget = (input: SetMonthlyBudgetInput): DashboardData => {
  const database = getDb();

  if (!Number.isInteger(input.monthlyBudgetCents) || input.monthlyBudgetCents <= 0) {
    throw new Error('月预算金额必须大于 0');
  }

  if (input.monthlyBudgetCents > 999999900) {
    throw new Error('月预算金额不能超过 9,999,999 元');
  }

  setAppSetting(database, monthlyBudgetSettingKey, String(input.monthlyBudgetCents));
  return getDashboardData();
};

export const deleteExpense = (id: number): DashboardData => {
  const database = getDb();
  database.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return getDashboardData();
};

export const exportExpensesCsv = async (): Promise<{ canceled: boolean; filePath?: string }> => {
  const database = getDb();
  const result = await dialog.showSaveDialog({
    title: '导出花销明细',
    defaultPath: `桌面记帐-${toLocalDateKey(new Date())}.csv`,
    filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const rows = (database
    .prepare(`
      SELECT
        expenses.id,
        expenses.amount_cents,
        expenses.currency,
        expenses.spent_at,
        expenses.category_level1_id,
        level1.name AS category_level1_name,
        expenses.category_level2_id,
        level2.name AS category_level2_name,
        expenses.payment_method,
        expenses.note,
        expenses.created_at,
        expenses.updated_at
      FROM expenses
      INNER JOIN categories AS level1 ON level1.id = expenses.category_level1_id
      INNER JOIN categories AS level2 ON level2.id = expenses.category_level2_id
      ORDER BY expenses.spent_at DESC, expenses.id DESC
    `)
    .all() as ExpenseRow[]).map(mapExpense);

  const escapeCsv = (value: string | number): string => {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    ['日期', '一级分类', '二级分类', '金额', '支付方式', '备注'].map(escapeCsv).join(','),
    ...rows.map((row) =>
      [
        row.spentAt.replace('T', ' ').slice(0, 16),
        row.categoryLevel1Name,
        row.categoryLevel2Name,
        (row.amountCents / 100).toFixed(2),
        row.paymentMethod,
        row.note,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ].join('\n');

  fs.writeFileSync(result.filePath, `\uFEFF${csv}`, 'utf8');
  return { canceled: false, filePath: result.filePath };
};
