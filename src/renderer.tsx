import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  BookOpen,
  Bus,
  CalendarDays,
  CreditCard,
  Gift,
  Home,
  LayoutGrid,
  List,
  MoreHorizontal,
  PencilLine,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Utensils,
  WalletCards,
} from 'lucide-react';

import './index.css';
import type {
  AddCategoryInput,
  Category,
  CategoryTotal,
  DashboardData,
  Expense,
  RenameCategoryInput,
  SetCategoryActiveInput,
  SetMonthlyBudgetInput,
  UpdateExpenseInput,
} from './types';

type PageId = 'quick' | 'details' | 'stats' | 'categories' | 'settings';
const pageIds: PageId[] = ['quick', 'details', 'stats', 'categories', 'settings'];

const getInitialPage = (): PageId => {
  const page = new URLSearchParams(window.location.search).get('page') as PageId | null;
  return page && pageIds.indexOf(page) >= 0 ? page : 'quick';
};

const formatMoney = (cents: number): string =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(cents / 100);

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

const formatFullDateTime = (value: string): string => value.replace('T', ' ').slice(0, 16);

const todayInputValue = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMoneyInputValue = (cents: number): string => (cents / 100).toFixed(2);

const categoryIcon = (name: string): React.ReactNode => {
  const props = { size: 18, strokeWidth: 2.2 };
  const map: Record<string, React.ReactNode> = {
    餐饮: <Utensils {...props} />,
    交通: <Bus {...props} />,
    购物: <ShoppingBag {...props} />,
    居住: <Home {...props} />,
    娱乐休闲: <BarChart3 {...props} />,
    医疗健康: <WalletCards {...props} />,
    教育成长: <BookOpen {...props} />,
    人情社交: <Gift {...props} />,
    金融缴费: <CreditCard {...props} />,
  };

  return map[name] ?? <MoreHorizontal {...props} />;
};

interface StatCardProps {
  title: string;
  value: string;
  meta: string;
  tone?: 'green' | 'red' | 'neutral';
  icon: React.ReactNode;
}

const StatCard = ({ title, value, meta, tone = 'neutral', icon }: StatCardProps): JSX.Element => (
  <section className="stat-card">
    <div className="stat-copy">
      <p>{title}</p>
      <strong className={tone === 'green' ? 'is-green' : tone === 'red' ? 'is-red' : ''}>{value}</strong>
      <span className={tone === 'red' ? 'is-red' : tone === 'green' ? 'is-green' : ''}>{meta}</span>
    </div>
    <div className={`stat-icon ${tone}`}>{icon}</div>
  </section>
);

const MiniLineChart = ({ data }: { data: DashboardData['dailyTotals'] }): JSX.Element => {
  const points = useMemo(() => {
    const width = 430;
    const height = 160;
    const max = Math.max(...data.map((item) => item.amountCents), 1);
    const padded = data.length > 0 ? data.slice(-7) : [];

    return padded.map((item, index) => {
      const x = padded.length === 1 ? width / 2 : (index / (padded.length - 1)) * width;
      const y = height - (item.amountCents / max) * 120 - 20;
      return { ...item, x, y };
    });
  }, [data]);

  const line = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="trend-chart">
      <svg viewBox="0 0 430 180" role="img" aria-label="每日支出趋势">
        {[0, 1, 2, 3].map((lineIndex) => (
          <line
            key={lineIndex}
            x1="0"
            x2="430"
            y1={30 + lineIndex * 40}
            y2={30 + lineIndex * 40}
            className="chart-grid-line"
          />
        ))}
        <polyline points={line} className="chart-line" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="4" className="chart-point" />
        ))}
      </svg>
      <div className="trend-labels">
        {points.map((point) => (
          <span key={point.date}>{point.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
};

const CategoryRanking = ({ totals }: { totals: CategoryTotal[] }): JSX.Element => {
  const max = Math.max(...totals.map((total) => total.amountCents), 1);

  return (
    <section className="panel ranking-panel">
      <div className="panel-title-row">
        <h2>分类支出排行</h2>
        <span className="toggle-pill">本月</span>
      </div>
      <div className="ranking-list">
        {totals.slice(0, 5).map((item) => (
          <div className="ranking-row" key={item.categoryId}>
            <div className="category-badge">{categoryIcon(item.categoryName)}</div>
            <span className="ranking-name">{item.categoryName}</span>
            <div className="ranking-bar">
              <span style={{ width: `${Math.max((item.amountCents / max) * 100, 8)}%` }} />
            </div>
            <strong>{formatMoney(item.amountCents)}</strong>
            <em>{item.percent.toFixed(1)}%</em>
          </div>
        ))}
      </div>
    </section>
  );
};

const RecentExpenses = ({
  expenses,
  onDelete,
  onOpenDetails,
}: {
  expenses: Expense[];
  onDelete: (id: number) => void;
  onOpenDetails: () => void;
}): JSX.Element => (
  <section className="panel recent-panel">
    <div className="panel-title-row">
      <h2>最近明细</h2>
      <button className="ghost-button" type="button" onClick={onOpenDetails}>查看全部</button>
    </div>
    <div className="expense-table">
      <div className="expense-head">
        <span>日期</span>
        <span>分类</span>
        <span>备注</span>
        <span>金额</span>
        <span>支付方式</span>
        <span />
      </div>
      {expenses.slice(0, 5).map((expense) => (
        <div className="expense-row" key={expense.id}>
          <span>{formatDateTime(expense.spentAt)}</span>
          <span className="category-cell">
            <i>{categoryIcon(expense.categoryLevel1Name)}</i>
            {expense.categoryLevel1Name}
          </span>
          <span className="expense-note">{expense.note || expense.categoryLevel2Name}</span>
          <strong>-{formatMoney(expense.amountCents)}</strong>
          <span>{expense.paymentMethod}</span>
          <button className="icon-button" type="button" onClick={() => onDelete(expense.id)} aria-label="删除记录">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  </section>
);

const QuickEntry = ({
  categories,
  paymentMethods,
  onAdd,
}: {
  categories: Category[];
  paymentMethods: string[];
  onAdd: (amountCents: number, spentAt: string, categoryLevel2Id: number, paymentMethod: string, note: string) => void;
}): JSX.Element => {
  const activeChildren = categories.filter((category) => category.parentId !== null && category.isActive);
  const parents = categories.filter(
    (category) => category.parentId === null && category.isActive && activeChildren.some((child) => child.parentId === category.id),
  );
  const [selectedParentId, setSelectedParentId] = useState<number>(parents[0]?.id ?? 0);
  const children = activeChildren.filter((category) => category.parentId === selectedParentId);
  const [selectedChildId, setSelectedChildId] = useState<number>(children[0]?.id ?? 0);
  const [amount, setAmount] = useState('');
  const [spentDate, setSpentDate] = useState(todayInputValue());
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0] ?? '微信支付');
  const [note, setNote] = useState('');

  useEffect(() => {
    const parentStillAvailable = parents.some((parent) => parent.id === selectedParentId);
    if (!parentStillAvailable) {
      setSelectedParentId(parents[0]?.id ?? 0);
    }
  }, [categories, parents, selectedParentId]);

  useEffect(() => {
    const nextChildren = categories.filter((category) => category.parentId === selectedParentId && category.isActive);
    setSelectedChildId(nextChildren[0]?.id ?? 0);
  }, [categories, selectedParentId]);

  const submit = (keepNote: boolean): void => {
    const yuan = Number(amount);
    if (!Number.isFinite(yuan) || yuan <= 0 || !selectedChildId) {
      return;
    }

    onAdd(Math.round(yuan * 100), `${spentDate}T12:00:00`, selectedChildId, paymentMethod, note);
    setAmount('');
    if (!keepNote) {
      setNote('');
    }
  };

  return (
    <section className="panel quick-panel">
      <h2>记一笔</h2>
      <label className="field-label" htmlFor="amount">支出金额</label>
      <div className="amount-input">
        <span>¥</span>
        <input id="amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>

      <div className="category-chips">
        {parents.slice(0, 5).map((parent) => (
          <button
            className={parent.id === selectedParentId ? 'chip active' : 'chip'}
            key={parent.id}
            type="button"
            onClick={() => setSelectedParentId(parent.id)}
          >
            {categoryIcon(parent.name)}
            {parent.name}
          </button>
        ))}
      </div>

      <div className="form-row">
        <div className="form-control">
          <label className="field-label" htmlFor="sub-category">二级分类</label>
          <select id="sub-category" value={selectedChildId} onChange={(event) => setSelectedChildId(Number(event.target.value))}>
            {children.map((child) => (
              <option value={child.id} key={child.id}>{child.name}</option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="field-label" htmlFor="spent-date">日期</label>
          <input id="spent-date" type="date" value={spentDate} onChange={(event) => setSpentDate(event.target.value)} />
        </div>
      </div>

      <label className="field-label" htmlFor="note">备注（可选）</label>
      <input id="note" placeholder="请输入备注..." value={note} onChange={(event) => setNote(event.target.value)} />

      <label className="field-label" htmlFor="payment">支付方式</label>
      <select id="payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
        {paymentMethods.map((method) => (
          <option value={method} key={method}>{method}</option>
        ))}
      </select>

      <div className="quick-actions">
        <button className="primary-button" type="button" onClick={() => submit(false)}>保存</button>
        <button className="secondary-button" type="button" onClick={() => submit(true)}>保存并再记</button>
      </div>
    </section>
  );
};

const DetailsPage = ({
  data,
  onDelete,
  onUpdate,
}: {
  data: DashboardData;
  onDelete: (id: number) => void;
  onUpdate: (input: UpdateExpenseInput) => Promise<void>;
}): JSX.Element => {
  const parents = data.categories.filter((category) => category.parentId === null);
  const activeChildren = data.categories.filter((category) => category.parentId !== null && category.isActive);
  const [keyword, setKeyword] = useState('');
  const [level1Id, setLevel1Id] = useState('all');
  const [level2Id, setLevel2Id] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState(todayInputValue());
  const [editParentId, setEditParentId] = useState(parents[0]?.id ?? 0);
  const [editChildId, setEditChildId] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState(data.paymentMethods[0] ?? '微信支付');
  const [editNote, setEditNote] = useState('');

  const secondaryOptions = useMemo(() => {
    if (level1Id === 'all') {
      return data.categories.filter((category) => category.parentId !== null);
    }

    return data.categories.filter((category) => category.parentId === Number(level1Id));
  }, [data.categories, level1Id]);

  const editableParents = useMemo(
    () =>
      parents.filter(
        (parent) =>
          (parent.isActive && activeChildren.some((child) => child.parentId === parent.id)) ||
          parent.id === editingExpense?.categoryLevel1Id,
      ),
    [activeChildren, editingExpense, parents],
  );

  const editChildren = useMemo(
    () =>
      data.categories.filter(
        (category) =>
          category.parentId === editParentId &&
          (category.isActive || category.id === editingExpense?.categoryLevel2Id),
      ),
    [data.categories, editParentId, editingExpense],
  );

  useEffect(() => {
    setLevel2Id('all');
  }, [level1Id]);

  useEffect(() => {
    if (!editingExpense) {
      return;
    }

    const isCurrentChildValid = editChildren.some((child) => child.id === editChildId);
    if (!isCurrentChildValid) {
      setEditChildId(editChildren[0]?.id ?? 0);
    }
  }, [editChildId, editChildren, editingExpense]);

  const filteredExpenses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return data.expenses.filter((expense) => {
      const dateKey = expense.spentAt.slice(0, 10);
      const content = [
        expense.note,
        expense.categoryLevel1Name,
        expense.categoryLevel2Name,
        expense.paymentMethod,
        formatMoney(expense.amountCents),
      ]
        .join(' ')
        .toLowerCase();

      if (normalizedKeyword && !content.includes(normalizedKeyword)) {
        return false;
      }

      if (level1Id !== 'all' && expense.categoryLevel1Id !== Number(level1Id)) {
        return false;
      }

      if (level2Id !== 'all' && expense.categoryLevel2Id !== Number(level2Id)) {
        return false;
      }

      if (paymentMethod !== 'all' && expense.paymentMethod !== paymentMethod) {
        return false;
      }

      if (dateFrom && dateKey < dateFrom) {
        return false;
      }

      if (dateTo && dateKey > dateTo) {
        return false;
      }

      return true;
    });
  }, [data.expenses, dateFrom, dateTo, keyword, level1Id, level2Id, paymentMethod]);

  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  const resetFilters = (): void => {
    setKeyword('');
    setLevel1Id('all');
    setLevel2Id('all');
    setPaymentMethod('all');
    setDateFrom('');
    setDateTo('');
  };

  const openEdit = (expense: Expense): void => {
    setEditingExpense(expense);
    setEditAmount(toMoneyInputValue(expense.amountCents));
    setEditDate(expense.spentAt.slice(0, 10));
    setEditParentId(expense.categoryLevel1Id);
    setEditChildId(expense.categoryLevel2Id);
    setEditPaymentMethod(expense.paymentMethod);
    setEditNote(expense.note);
  };

  const saveEdit = async (): Promise<void> => {
    if (!editingExpense) {
      return;
    }

    const yuan = Number(editAmount);
    if (!Number.isFinite(yuan) || yuan <= 0 || !editChildId) {
      window.alert('请填写有效金额，并选择分类。');
      return;
    }

    try {
      await onUpdate({
        id: editingExpense.id,
        amountCents: Math.round(yuan * 100),
        spentAt: `${editDate}T12:00:00`,
        categoryLevel2Id: editChildId,
        paymentMethod: editPaymentMethod,
        note: editNote,
      });
      setEditingExpense(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '更新失败，请稍后重试。');
    }
  };

  return (
    <section className="details-page">
      <div className="page-title-row">
        <div>
          <h1>明细</h1>
          <p>共 {filteredExpenses.length} 笔，合计 {formatMoney(filteredTotal)}</p>
        </div>
        <button className="secondary-button compact" type="button" onClick={resetFilters}>重置筛选</button>
      </div>

      <section className="panel detail-filters">
        <label className="search-box" htmlFor="detail-search">
          <Search size={18} />
          <input
            id="detail-search"
            placeholder="搜索备注、分类、支付方式或金额"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <div className="filter-grid">
          <div className="form-control">
            <label className="field-label" htmlFor="filter-level1">一级分类</label>
            <select id="filter-level1" value={level1Id} onChange={(event) => setLevel1Id(event.target.value)}>
              <option value="all">全部</option>
              {parents.map((parent) => (
                <option value={parent.id} key={parent.id}>{parent.name}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="field-label" htmlFor="filter-level2">二级分类</label>
            <select id="filter-level2" value={level2Id} onChange={(event) => setLevel2Id(event.target.value)}>
              <option value="all">全部</option>
              {secondaryOptions.map((child) => (
                <option value={child.id} key={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="field-label" htmlFor="filter-payment">支付方式</label>
            <select id="filter-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="all">全部</option>
              {data.paymentMethods.map((method) => (
                <option value={method} key={method}>{method}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="field-label" htmlFor="filter-from">开始日期</label>
            <input id="filter-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="form-control">
            <label className="field-label" htmlFor="filter-to">结束日期</label>
            <input id="filter-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel detail-table-panel">
        <div className="details-table">
          <div className="details-head">
            <span>日期</span>
            <span>分类</span>
            <span>备注</span>
            <span>金额</span>
            <span>支付方式</span>
            <span>操作</span>
          </div>
          {filteredExpenses.map((expense) => (
            <div className="details-row" key={expense.id}>
              <span>{formatFullDateTime(expense.spentAt)}</span>
              <span className="category-cell details-category">
                <i>{categoryIcon(expense.categoryLevel1Name)}</i>
                <span>
                  <strong>{expense.categoryLevel1Name}</strong>
                  <small>{expense.categoryLevel2Name}</small>
                </span>
              </span>
              <span className="expense-note">{expense.note || '无备注'}</span>
              <strong>-{formatMoney(expense.amountCents)}</strong>
              <span>{expense.paymentMethod}</span>
              <span className="row-actions">
                <button className="icon-button" type="button" onClick={() => openEdit(expense)} aria-label="编辑记录">
                  <PencilLine size={16} />
                </button>
                <button className="icon-button" type="button" onClick={() => onDelete(expense.id)} aria-label="删除记录">
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
          ))}
          {filteredExpenses.length === 0 && <div className="empty-state">没有符合条件的记录</div>}
        </div>
      </section>

      {editingExpense && (
        <div className="modal-backdrop">
          <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-expense-title">
            <div className="modal-title-row">
              <div>
                <h2 id="edit-expense-title">编辑花销</h2>
                <p>修改金额、日期、分类、支付方式或备注</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setEditingExpense(null)}>取消</button>
            </div>

            <div className="edit-grid">
              <div className="form-control">
                <label className="field-label" htmlFor="edit-amount">金额</label>
                <input
                  id="edit-amount"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={(event) => setEditAmount(event.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="field-label" htmlFor="edit-date">日期</label>
                <input id="edit-date" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
              </div>
              <div className="form-control">
                <label className="field-label" htmlFor="edit-level1">一级分类</label>
                <select id="edit-level1" value={editParentId} onChange={(event) => setEditParentId(Number(event.target.value))}>
                  {editableParents.map((parent) => (
                    <option value={parent.id} key={parent.id}>{parent.name}{parent.isActive ? '' : '（已停用）'}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="field-label" htmlFor="edit-level2">二级分类</label>
                <select id="edit-level2" value={editChildId} onChange={(event) => setEditChildId(Number(event.target.value))}>
                  {editChildren.map((child) => (
                    <option value={child.id} key={child.id}>{child.name}{child.isActive ? '' : '（已停用）'}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="field-label" htmlFor="edit-payment">支付方式</label>
                <select
                  id="edit-payment"
                  value={editPaymentMethod}
                  onChange={(event) => setEditPaymentMethod(event.target.value)}
                >
                  {data.paymentMethods.map((method) => (
                    <option value={method} key={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="form-control edit-note-control">
                <label className="field-label" htmlFor="edit-note">备注</label>
                <input id="edit-note" value={editNote} onChange={(event) => setEditNote(event.target.value)} />
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setEditingExpense(null)}>取消</button>
              <button className="primary-button" type="button" onClick={saveEdit}>保存修改</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

const CategoriesPage = ({
  categories,
  onAddCategory,
  onRenameCategory,
  onSetCategoryActive,
}: {
  categories: Category[];
  onAddCategory: (input: AddCategoryInput) => Promise<void>;
  onRenameCategory: (input: RenameCategoryInput) => Promise<void>;
  onSetCategoryActive: (input: SetCategoryActiveInput) => Promise<void>;
}): JSX.Element => {
  const parents = categories.filter((category) => category.parentId === null);
  const activeParents = parents.filter((category) => category.isActive);
  const activeChildrenCount = categories.filter((category) => category.parentId !== null && category.isActive).length;
  const [newParentName, setNewParentName] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [childParentId, setChildParentId] = useState(activeParents[0]?.id ?? 0);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const parentStillAvailable = activeParents.some((parent) => parent.id === childParentId);
    if (!parentStillAvailable) {
      setChildParentId(activeParents[0]?.id ?? 0);
    }
  }, [activeParents, childParentId]);

  const runCategoryAction = async (action: () => Promise<void>): Promise<void> => {
    try {
      await action();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '分类操作失败，请稍后重试。');
    }
  };

  const submitParent = async (): Promise<void> => {
    await runCategoryAction(async () => {
      await onAddCategory({ name: newParentName, parentId: null });
      setNewParentName('');
    });
  };

  const submitChild = async (): Promise<void> => {
    if (!childParentId) {
      window.alert('请先选择一个启用中的一级分类。');
      return;
    }

    await runCategoryAction(async () => {
      await onAddCategory({ name: newChildName, parentId: childParentId });
      setNewChildName('');
    });
  };

  const openRename = (category: Category): void => {
    setEditingCategory(category);
    setEditingName(category.name);
  };

  const saveRename = async (): Promise<void> => {
    if (!editingCategory) {
      return;
    }

    await runCategoryAction(async () => {
      await onRenameCategory({ id: editingCategory.id, name: editingName });
      setEditingCategory(null);
      setEditingName('');
    });
  };

  const toggleCategory = async (category: Category): Promise<void> => {
    if (category.isActive) {
      const ok = window.confirm('停用后，新记账时不会再显示这个分类；历史记录不会删除。确定停用吗？');
      if (!ok) {
        return;
      }
    }

    await runCategoryAction(async () => {
      await onSetCategoryActive({ id: category.id, isActive: !category.isActive });
    });
  };

  return (
    <section className="categories-page">
      <div className="page-title-row">
        <div>
          <h1>分类</h1>
          <p>共 {parents.length} 个一级分类，{activeChildrenCount} 个启用中的二级分类。</p>
        </div>
      </div>

      <section className="panel category-tools-panel">
        <div className="category-add-box">
          <h2>新增一级分类</h2>
          <div className="inline-form">
            <input
              placeholder="例如：宠物、办公"
              value={newParentName}
              onChange={(event) => setNewParentName(event.target.value)}
            />
            <button className="primary-button compact-button" type="button" onClick={submitParent}>新增</button>
          </div>
        </div>
        <div className="category-add-box">
          <h2>新增二级分类</h2>
          <div className="inline-form child-form">
            <select value={childParentId} onChange={(event) => setChildParentId(Number(event.target.value))}>
              {activeParents.map((parent) => (
                <option value={parent.id} key={parent.id}>{parent.name}</option>
              ))}
            </select>
            <input
              placeholder="例如：猫粮、打印"
              value={newChildName}
              onChange={(event) => setNewChildName(event.target.value)}
            />
            <button className="primary-button compact-button" type="button" onClick={submitChild}>新增</button>
          </div>
        </div>
      </section>

      <div className="category-board">
        {parents.map((parent) => (
          <section className={parent.isActive ? 'panel category-group' : 'panel category-group is-inactive'} key={parent.id}>
            <div className="category-group-title">
              <span className="category-badge">{categoryIcon(parent.name)}</span>
              <div className="category-title-copy">
                <h2>{parent.name}</h2>
                <span className={parent.isActive ? 'status-pill active' : 'status-pill'}>{parent.isActive ? '启用中' : '已停用'}</span>
              </div>
              <div className="category-actions">
                <button className="mini-button" type="button" onClick={() => openRename(parent)}>重命名</button>
                <button className="mini-button" type="button" onClick={() => toggleCategory(parent)}>
                  {parent.isActive ? '停用' : '启用'}
                </button>
              </div>
            </div>
            <div className="sub-category-list">
              {categories
                .filter((category) => category.parentId === parent.id)
                .map((child) => (
                  <div className={child.isActive ? 'sub-category-item' : 'sub-category-item is-inactive'} key={child.id}>
                    <span>{child.name}</span>
                    <em>{child.isActive ? '启用中' : '已停用'}</em>
                    <div className="category-actions">
                      <button className="mini-button" type="button" onClick={() => openRename(child)}>重命名</button>
                      <button className="mini-button" type="button" onClick={() => toggleCategory(child)}>
                        {child.isActive ? '停用' : '启用'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      {editingCategory && (
        <div className="modal-backdrop">
          <section className="edit-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="edit-category-title">
            <div className="modal-title-row">
              <div>
                <h2 id="edit-category-title">重命名分类</h2>
                <p>{editingCategory.parentId === null ? '一级分类' : '二级分类'}，历史记录会同步显示新名称。</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setEditingCategory(null)}>取消</button>
            </div>
            <div className="form-control">
              <label className="field-label" htmlFor="edit-category-name">分类名称</label>
              <input id="edit-category-name" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setEditingCategory(null)}>取消</button>
              <button className="primary-button" type="button" onClick={saveRename}>保存名称</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

const SettingsPage = ({
  data,
  onExport,
  onSetMonthlyBudget,
}: {
  data: DashboardData;
  onExport: () => void;
  onSetMonthlyBudget: (input: SetMonthlyBudgetInput) => Promise<void>;
}): JSX.Element => {
  const [budgetInput, setBudgetInput] = useState(toMoneyInputValue(data.summary.monthlyBudgetCents));

  useEffect(() => {
    setBudgetInput(toMoneyInputValue(data.summary.monthlyBudgetCents));
  }, [data.summary.monthlyBudgetCents]);

  const saveBudget = async (): Promise<void> => {
    const yuan = Number(budgetInput);
    if (!Number.isFinite(yuan) || yuan <= 0) {
      window.alert('请填写大于 0 的月预算金额。');
      return;
    }

    try {
      await onSetMonthlyBudget({ monthlyBudgetCents: Math.round(yuan * 100) });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '预算保存失败，请稍后重试。');
    }
  };

  return (
    <section className="settings-page">
      <div className="page-title-row">
        <div>
          <h1>设置</h1>
          <p>管理月预算、数据位置和导出备份。</p>
        </div>
      </div>

      <section className="settings-grid">
        <section className="panel settings-card">
          <div>
            <h2>月预算</h2>
            <p>预算会用于首页“预算剩余”和进度环计算。</p>
          </div>
          <div className="budget-setting-row">
            <label className="amount-input compact-amount" htmlFor="monthly-budget">
              <span>¥</span>
              <input
                id="monthly-budget"
                inputMode="decimal"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
              />
            </label>
            <button className="primary-button" type="button" onClick={saveBudget}>保存预算</button>
          </div>
        </section>

        <section className="panel settings-card">
          <div>
            <h2>数据导出</h2>
            <p>导出为 CSV 后，可以用 Excel 或 Numbers 打开。</p>
          </div>
          <button className="primary-button" type="button" onClick={onExport}>导出 CSV</button>
        </section>

        <section className="panel settings-card wide-card">
          <div>
            <h2>本地数据位置</h2>
            <p>记帐数据保存在这台电脑的 SQLite 文件里。备份时可以重点保存这个文件。</p>
          </div>
          <code className="settings-path">{data.appInfo.databasePath}</code>
        </section>

        <section className="panel settings-card">
          <div>
            <h2>应用信息</h2>
            <p>当前打包版本和运行平台。</p>
          </div>
          <div className="app-info-list">
            <span>版本</span>
            <strong>{data.appInfo.appVersion}</strong>
            <span>平台</span>
            <strong>{data.appInfo.platform}</strong>
          </div>
        </section>
      </section>
    </section>
  );
};

const App = (): JSX.Element => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activePage, setActivePage] = useState<PageId>(getInitialPage);
  const [message, setMessage] = useState('数据保存在本机');

  const reload = async (): Promise<void> => {
    const next = await window.accountingApi.getDashboard();
    setData(next);
  };

  useEffect(() => {
    reload();
  }, []);

  if (!data) {
    return <main className="loading-screen">正在打开桌面记帐...</main>;
  }

  const add = async (
    amountCents: number,
    spentAt: string,
    categoryLevel2Id: number,
    paymentMethod: string,
    note: string,
  ): Promise<void> => {
    const next = await window.accountingApi.addExpense({ amountCents, spentAt, categoryLevel2Id, paymentMethod, note });
    setData(next);
    setMessage('已保存一笔花销');
  };

  const update = async (input: UpdateExpenseInput): Promise<void> => {
    const next = await window.accountingApi.updateExpense(input);
    setData(next);
    setMessage('已更新记录');
  };

  const addCategory = async (input: AddCategoryInput): Promise<void> => {
    const next = await window.accountingApi.addCategory(input);
    setData(next);
    setMessage('已新增分类');
  };

  const renameCategory = async (input: RenameCategoryInput): Promise<void> => {
    const next = await window.accountingApi.renameCategory(input);
    setData(next);
    setMessage('已重命名分类');
  };

  const setCategoryActive = async (input: SetCategoryActiveInput): Promise<void> => {
    const next = await window.accountingApi.setCategoryActive(input);
    setData(next);
    setMessage(input.isActive ? '已启用分类' : '已停用分类');
  };

  const setMonthlyBudget = async (input: SetMonthlyBudgetInput): Promise<void> => {
    const next = await window.accountingApi.setMonthlyBudget(input);
    setData(next);
    setMessage('已更新月预算');
  };

  const remove = async (id: number): Promise<void> => {
    const ok = window.confirm('确定删除这笔花销吗？');
    if (!ok) {
      return;
    }
    const next = await window.accountingApi.deleteExpense(id);
    setData(next);
    setMessage('已删除记录');
  };

  const exportCsv = async (): Promise<void> => {
    const result = await window.accountingApi.exportCsv();
    setMessage(result.canceled ? '已取消导出' : `已导出：${result.filePath ?? ''}`);
  };

  const budgetPercent =
    data.summary.monthlyBudgetCents > 0
      ? Math.min(Math.round((data.summary.monthExpenseCents / data.summary.monthlyBudgetCents) * 100), 100)
      : 0;
  const navigationItems: Array<{ id: PageId; label: string; icon: React.ReactNode }> = [
    { id: 'quick', label: '记一笔', icon: <PencilLine size={22} /> },
    { id: 'details', label: '明细', icon: <List size={22} /> },
    { id: 'stats', label: '统计', icon: <BarChart3 size={22} /> },
    { id: 'categories', label: '分类', icon: <LayoutGrid size={22} /> },
    { id: 'settings', label: '设置', icon: <Settings size={22} /> },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">¥</div>
          <strong>桌面记帐</strong>
        </div>
        <nav>
          {navigationItems.map((item) => (
            <button
              className={item.id === activePage ? 'nav-item active' : 'nav-item'}
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button className="month-picker" type="button">
          <CalendarDays size={18} />
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <span>{message}</span>
          <button className="secondary-button compact" type="button" onClick={exportCsv}>导出 CSV</button>
        </header>

        <section className="stats-grid">
          <StatCard
            title="本月支出"
            value={formatMoney(data.summary.monthExpenseCents)}
            meta="较上月 -12.6%"
            tone="green"
            icon={<WalletCards size={30} />}
          />
          <StatCard
            title="今日支出"
            value={formatMoney(data.summary.todayExpenseCents)}
            meta="日均支出参考"
            tone="red"
            icon={<CalendarDays size={30} />}
          />
          <StatCard
            title="日均支出"
            value={formatMoney(data.summary.averageDailyCents)}
            meta="按本月已过天数计算"
            icon={<ReceiptText size={30} />}
          />
          <section className="stat-card budget-card">
            <div className="stat-copy">
              <p>预算剩余</p>
              <strong>{formatMoney(data.summary.budgetRemainingCents)}</strong>
              <span>预算 {formatMoney(data.summary.monthlyBudgetCents)}</span>
            </div>
            <div className="budget-ring" style={{ ['--budget' as string]: `${budgetPercent}%` }}>
              <span>{budgetPercent}%</span>
            </div>
          </section>
        </section>

        {activePage === 'quick' && (
          <section className="dashboard-grid">
            <div className="left-column">
              <QuickEntry categories={data.categories} paymentMethods={data.paymentMethods} onAdd={add} />
              <section className="panel trend-panel">
                <div className="panel-title-row">
                  <h2>每日支出趋势</h2>
                  <span className="toggle-pill">折线图</span>
                </div>
                <MiniLineChart data={data.dailyTotals} />
              </section>
            </div>
            <div className="right-column">
              <RecentExpenses expenses={data.expenses} onDelete={remove} onOpenDetails={() => setActivePage('details')} />
              <CategoryRanking totals={data.categoryTotals} />
            </div>
          </section>
        )}

        {activePage === 'details' && <DetailsPage data={data} onDelete={remove} onUpdate={update} />}

        {activePage === 'stats' && (
          <section className="stats-page">
            <div className="page-title-row">
              <div>
                <h1>统计</h1>
                <p>查看本月每日趋势和一级分类支出排行。</p>
              </div>
            </div>
            <section className="dashboard-grid stats-dashboard">
              <section className="panel trend-panel">
                <div className="panel-title-row">
                  <h2>每日支出趋势</h2>
                  <span className="toggle-pill">折线图</span>
                </div>
                <MiniLineChart data={data.dailyTotals} />
              </section>
              <CategoryRanking totals={data.categoryTotals} />
            </section>
          </section>
        )}

        {activePage === 'categories' && (
          <CategoriesPage
            categories={data.categories}
            onAddCategory={addCategory}
            onRenameCategory={renameCategory}
            onSetCategoryActive={setCategoryActive}
          />
        )}

        {activePage === 'settings' && <SettingsPage data={data} onExport={exportCsv} onSetMonthlyBudget={setMonthlyBudget} />}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
