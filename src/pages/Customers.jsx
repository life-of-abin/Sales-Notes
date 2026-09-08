import { useState } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatCustomerDisplayName, toTamilName } from '../utils/transliterate';
import PageHeader from '../components/layout/PageHeader';
import CurrencyInput from '../components/ui/CurrencyInput';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Plus, UserPlus, Phone, Check, User } from 'lucide-react';

export default function Customers() {
  const {
    customers,
    totalPending,
    recordCustomerPayment,
    addOrUpdateCustomerPending,
    language,
    t,
  } = useBusiness();

  // Payment Modal
  const [showPayment, setShowPayment] = useState(null); // customer id
  const [paymentAmount, setPaymentAmount] = useState('');

  // Manual Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [initialPaid, setInitialPaid] = useState('');
  const [phone, setPhone] = useState('');

  const customersWithPending = customers.filter((c) => (c.totalPending || 0) > 0);

  const numTotal = Number(totalAmount) || 0;
  const numPaid = Number(initialPaid) || 0;
  const isPaidInvalid = numPaid > numTotal && numTotal > 0;
  const netPending = Math.max(0, numTotal - numPaid);

  // ---- Record Payment for Existing Customer ----
  const handlePayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0 || !showPayment) return;
    await recordCustomerPayment(showPayment, Number(paymentAmount));
    setShowPayment(null);
    setPaymentAmount('');
  };

  // ---- Save Customer (Manual Entry) ----
  const handleSaveCustomer = async () => {
    const trimmedName = customerName.trim();
    if (!trimmedName || numTotal <= 0 || isPaidInvalid) return;

    const finalName = language === 'ta' ? toTamilName(trimmedName) : trimmedName;
    await addOrUpdateCustomerPending(
      finalName,
      numTotal,
      numPaid,
      phone.trim()
    );

    // Reset and close
    setShowAddModal(false);
    setCustomerName('');
    setTotalAmount('');
    setInitialPaid('');
    setPhone('');
  };

  return (
    <div className="page-content">
      <PageHeader
        title={t.customers}
        showBack
      />

      {/* Quick Add Banner Card */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-md)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
          border: '1px dashed var(--color-primary-light, #818cf8)',
          cursor: 'pointer',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-lg)'
        }}
        onClick={() => setShowAddModal(true)}
        id="btn-open-add-customer-card"
        role="button"
        tabIndex={0}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-primary, #4f46e5)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserPlus size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>
              {t.addCustomer}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {language === 'ta'
                ? 'பெயர், பாக்கி தொகை, ஆரம்ப கட்டணம் உள்ளிடவும்'
                : 'Enter name, pending amount & initial paid'}
            </div>
          </div>
        </div>
        <button className="btn btn--primary btn--sm" style={{ width: 'auto', padding: '6px 14px' }}>
          <Plus size={14} />
          {t.add}
        </button>
      </div>

      {/* Total Pending Summary */}
      {totalPending > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'var(--color-warning-bg)' }}>
          <div className="summary-row">
            <span className="summary-row-label" style={{ fontWeight: 600 }}>{t.totalPending}</span>
            <span className="summary-row-value" style={{ color: 'var(--color-warning-dark)', fontWeight: 700 }}>
              {formatCurrency(totalPending)}
            </span>
          </div>
        </div>
      )}

      {/* Customer List */}
      {customersWithPending.length === 0 ? (
        <EmptyState
          emoji="👥"
          title={t.noCustomers}
          description={t.noCustomersDesc}
        />
      ) : (
        customersWithPending.map((customer) => (
          <div key={customer.id} className="customer-card">
            <div className="customer-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--color-surface-hover, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)'
                  }}
                >
                  <User size={16} />
                </div>
                <span className="customer-card-name">
                  {formatCustomerDisplayName(customer.name, language)}
                </span>
              </div>
              <span className="customer-card-pending">
                {formatCurrency(customer.totalPending)}
              </span>
            </div>
            {customer.phone && (
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={13} />
                {customer.phone}
              </div>
            )}
            <button
              className="btn btn--success btn--sm"
              onClick={() => {
                setShowPayment(customer.id);
                setPaymentAmount(String(customer.totalPending));
              }}
              id={`btn-pay-${customer.id}`}
            >
              <Check size={16} />
              {t.markAsPaid}
            </button>
          </div>
        ))
      )}

      {/* Manual Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t.addCustomer}
      >
        <div className="form-group">
          <label className="form-label">{t.customerName} *</label>
          <input
            type="text"
            className="form-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t.customerNamePlaceholder}
            id="input-customer-name"
            autoFocus
          />
          {language === 'ta' && customerName.trim() && (
            <div
              style={{
                marginTop: '6px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-primary, #4f46e5)',
                fontWeight: 600,
              }}
            >
              தமிழ்: {toTamilName(customerName)}
            </div>
          )}
        </div>

        <CurrencyInput
          label={`${t.totalBillAmount} *`}
          value={totalAmount}
          onChange={setTotalAmount}
          id="input-total-amount"
        />

        <CurrencyInput
          label={t.initialPaid}
          value={initialPaid}
          onChange={setInitialPaid}
          id="input-initial-paid"
        />

        {isPaidInvalid && (
          <div
            className="form-error"
            style={{
              marginBottom: 'var(--space-md)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
            }}
          >
            ⚠️ {t.initialPaidError}
          </div>
        )}

        {numTotal > 0 && !isPaidInvalid && (
          <div
            className="card"
            style={{
              background: 'var(--color-surface-hover, #f8fafc)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{t.totalBillAmount}:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(numTotal)}</span>
            </div>
            {numPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t.initialPaid}:</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>-{formatCurrency(numPaid)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-base)', borderTop: '1px dashed var(--color-border, #e2e8f0)', paddingTop: 4, marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>{t.netPendingBalance}:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-warning-dark, #b45309)' }}>{formatCurrency(netPending)}</span>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t.phoneOptional}</label>
          <input
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            id="input-customer-phone"
          />
        </div>

        <button
          className="btn btn--primary btn--lg"
          onClick={handleSaveCustomer}
          disabled={!customerName.trim() || numTotal <= 0 || isPaidInvalid}
          id="btn-save-customer"
          style={{ marginTop: 'var(--space-md)' }}
        >
          <Check size={18} />
          {t.saveCustomer}
        </button>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={!!showPayment}
        onClose={() => { setShowPayment(null); setPaymentAmount(''); }}
        title={t.recordPaymentTitle}
      >
        <CurrencyInput
          label={t.amount}
          value={paymentAmount}
          onChange={setPaymentAmount}
          id="input-payment-amount"
        />
        <button
          className="btn btn--success btn--lg"
          onClick={handlePayment}
          disabled={!paymentAmount || Number(paymentAmount) <= 0}
          id="btn-confirm-payment"
          style={{ marginTop: 'var(--space-md)' }}
        >
          <Check size={18} />
          {t.confirm}
        </button>
      </Modal>
    </div>
  );
}
