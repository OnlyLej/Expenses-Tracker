import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Category  = { id: string; label: string; color: string; icon: string };
export type Expense   = { id: string; amount: number; note: string; category: string; date: string; photo?: string };
export type Recurring = { id: string; amount: number; note: string; category: string; dayOfMonth: number };
export type Goal      = { categoryId: string; limit: number };

export const CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food & Dining',  color: '#ff7043', icon: 'restaurant'    },
  { id: 'transport',     label: 'Transport',       color: '#42a5f5', icon: 'directions-car' },
  { id: 'shopping',      label: 'Shopping',        color: '#ab47bc', icon: 'shopping-bag'  },
  { id: 'health',        label: 'Health',          color: '#26a69a', icon: 'favorite'      },
  { id: 'bills',         label: 'Bills',           color: '#ffca28', icon: 'receipt'       },
  { id: 'entertainment', label: 'Entertainment',   color: '#ef5350', icon: 'movie'         },
  { id: 'other',         label: 'Other',           color: '#78909c', icon: 'more-horiz'    },
];

type Ctx = {
  expenses:   Expense[];
  recurring:  Recurring[];
  goals:      Goal[];
  budget:     number;
  loading:    boolean;
  addExpense:           (e: Omit<Expense,   'id' | 'date'>) => Promise<void>;
  deleteExpense:        (id: string)  => Promise<void>;
  addRecurring:         (r: Omit<Recurring, 'id'>) => Promise<void>;
  deleteRecurring:      (id: string)  => Promise<void>;
  setGoal:              (g: Goal)     => Promise<void>;
  updateBudget:         (n: number)   => Promise<void>;
  getMonthlyTotal:      () => number;
  getCategoryTotals:    () => (Category & { total: number; goal?: number })[];
  getLast6MonthsTotals: () => { label: string; total: number }[];
};

const ExpenseContext = createContext<Ctx>({} as Ctx);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [goals,     setGoals]     = useState<Goal[]>([]);
  const [budget,    setBudget]    = useState(10000);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [e, r, g, b] = await Promise.all([
        AsyncStorage.getItem('expenses'),
        AsyncStorage.getItem('recurring'),
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('budget'),
      ]);
      if (e) setExpenses(JSON.parse(e));
      if (r) setRecurring(JSON.parse(r));
      if (g) setGoals(JSON.parse(g));
      if (b) setBudget(Number(b));
      if (r) await processRecurring(JSON.parse(r), e ? JSON.parse(e) : []);
    } catch {}
    setLoading(false);
  }

  async function processRecurring(recs: Recurring[], existingExpenses: Expense[]) {
    const today    = new Date();
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
    const added: Expense[] = [];

    for (const rec of recs) {
      if (rec.dayOfMonth !== today.getDate()) continue;
      const alreadyAdded = existingExpenses.some(e => {
        const d = new Date(e.date);
        return e.note === `[Auto] ${rec.note}` &&
          d.getMonth()    === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      });
      if (!alreadyAdded) {
        added.push({
          id:       `rec-${rec.id}-${monthKey}`,
          amount:   rec.amount,
          note:     `[Auto] ${rec.note}`,
          category: rec.category,
          date:     new Date().toISOString(),
        });
      }
    }

    if (added.length > 0) {
      const next = [...added, ...existingExpenses];
      setExpenses(next);
      await AsyncStorage.setItem('expenses', JSON.stringify(next));
    }
  }

  async function addExpense(exp: Omit<Expense, 'id' | 'date'>) {
    const next = [{ id: Date.now().toString(), ...exp, date: new Date().toISOString() }, ...expenses];
    setExpenses(next);
    await AsyncStorage.setItem('expenses', JSON.stringify(next));
  }

  async function deleteExpense(id: string) {
    const next = expenses.filter(e => e.id !== id);
    setExpenses(next);
    await AsyncStorage.setItem('expenses', JSON.stringify(next));
  }

  async function addRecurring(rec: Omit<Recurring, 'id'>) {
    const next = [...recurring, { id: Date.now().toString(), ...rec }];
    setRecurring(next);
    await AsyncStorage.setItem('recurring', JSON.stringify(next));
  }

  async function deleteRecurring(id: string) {
    const next = recurring.filter(r => r.id !== id);
    setRecurring(next);
    await AsyncStorage.setItem('recurring', JSON.stringify(next));
  }

  async function setGoal(goal: Goal) {
    let next: Goal[];

    if (goal.limit <= 0) {
      // Remove the goal entirely
      next = goals.filter(g => g.categoryId !== goal.categoryId);
    } else {
      // Add or update
      next = [...goals.filter(g => g.categoryId !== goal.categoryId), goal];
    }

    setGoals(next);
    await AsyncStorage.setItem('goals', JSON.stringify(next));
  }

  async function updateBudget(n: number) {
    setBudget(n);
    await AsyncStorage.setItem('budget', String(n));
  }

  function getMonthlyTotal() {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth()    === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
  }

  function getCategoryTotals() {
    const now     = new Date();
    const monthly = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth()    === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    });
    return CATEGORIES.map(c => ({
      ...c,
      total: monthly
        .filter(e => e.category === c.id)
        .reduce((s, e) => s + e.amount, 0),
      goal: goals.find(g => g.categoryId === c.id)?.limit,
    }));
  }

  function getLast6MonthsTotals() {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        total: expenses
          .filter(e => {
            const ed = new Date(e.date);
            return ed.getMonth()    === d.getMonth() &&
                   ed.getFullYear() === d.getFullYear();
          })
          .reduce((s, e) => s + e.amount, 0),
      };
    });
  }

  return (
    <ExpenseContext.Provider value={{
      expenses, recurring, goals, budget, loading,
      addExpense, deleteExpense, addRecurring, deleteRecurring,
      setGoal, updateBudget, getMonthlyTotal, getCategoryTotals, getLast6MonthsTotals,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() { return useContext(ExpenseContext); }