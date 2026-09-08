import { useState } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { EXPENSE_TYPES, getExpenseTypeLabel } from '../utils/constants';
import PageHeader from '../components/layout/PageHeader';
import CurrencyInput from '../components/ui/CurrencyInput';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Plus, Trash2 } from 'lucide-react';

export default function Expenses() {
  const { expenses, addExpense, deleteExpense, totalExpensesVal, language, t } = useBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [type, setType] = useState(EXPENSE_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) return;
    await addExpense(type, Number(amount), note);
    setShowAdd(false);
    setAmount('');
    setNote('');
    setType(EXPENSE_TYPES[0]);
  };

  const handleConfirmDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title={t.expenses}
        showBack
        rightAction={
          expenses.length > 0 ? (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setShowAdd(true)}
              id="btn-add-expense"
              style={{ width: 'auto' }}
            >
              <Plus size={16} />
              {t.add}
            </button>
          ) : null
        }
      />

      {/* Total */}
      {expenses.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'var(--color-danger-bg)' }}>
          <div className="summary-row">
            <span className="summary-row-label" style={{ fontWeight: 600 }}>{t.totalExpenses}</span>
            <span className="summary-row-value loss">{formatCurrency(totalExpensesVal)}</span>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          emoji="💸"
          title={t.noExpenses}
          description={t.noExpensesDesc}
          actionLabel={t.addExpense}
          onAction={() => setShowAdd(true)}
        />
      ) : (
        expenses.map((expense) => (
          <div key={expense.id} className="expense-card">
            <div className="expense-card-left">
              <span className="expense-card-type">{getExpenseTypeLabel(expense.type, language)}</span>
              {expense.note && (
                <span className="expense-card-note">{expense.note}</span>
              )}
              <span className="expense-card-note">{formatDate(expense.date, language)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span className="expense-card-amount">-{formatCurrency(expense.amount)}</span>
              <button
                onClick={() => setExpenseToDelete(expense)}
                style={{ color: 'var(--color-text-tertiary)', padding: 4, cursor: 'pointer' }}
                aria-label="Delete expense"
                id={`btn-delete-expense-${expense.id}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t.addExpense}>
        <div className="form-group">
          <label className="form-label">{t.expenseType}</label>
          <select
            className="form-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
            id="select-expense-type"
          >
            {EXPENSE_TYPES.map((expType) => (
              <option key={expType} value={expType}>
                {getExpenseTypeLabel(expType, language)}
              </option>
            ))}
          </select>
        </div>

        <CurrencyInput
          label={t.amount}
          value={amount}
          onChange={setAmount}
          id="input-expense-amount"
        />

        <div className="form-group">
          <label className="form-label">{t.note}</label>
          <input
            type="text"
            className="form-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.optionalNote}
            id="input-expense-note"
          />
        </div>

        <button
          className="btn btn--primary btn--lg"
          onClick={handleSave}
          disabled={!amount || Number(amount) <= 0}
          id="btn-save-expense"
        >
          {t.save}
        </button>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title={t.deleteExpenseConfirmTitle}
      >
        {expenseToDelete && (
          <div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-base)' }}>
              {t.deleteExpenseConfirmDesc}
            </p>

            <div
              className="card"
              style={{
                marginBottom: 'var(--space-xl)',
                background: 'var(--color-surface-hover, #f8fafc)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{getExpenseTypeLabel(expenseToDelete.type, language)}</span>
                <span style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 700 }}>
                  -{formatCurrency(expenseToDelete.amount)}
                </span>
              </div>
              {expenseToDelete.note && (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {expenseToDelete.note}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={() => setExpenseToDelete(null)}
                id="btn-cancel-delete-expense"
              >
                {t.cancel}
              </button>
              <button
                className="btn btn--danger"
                style={{ flex: 1 }}
                onClick={handleConfirmDelete}
                id="btn-confirm-delete-expense"
              >
                {t.delete}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
