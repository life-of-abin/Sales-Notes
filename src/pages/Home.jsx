import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime } from '../utils/formatDate';
import { formatProductDisplayName } from '../utils/transliterate';
import StatCard from '../components/ui/StatCard';
import SmartAmountText from '../components/ui/SmartAmountText';
import ActionButton from '../components/ui/ActionButton';
import MagicQrModal from '../components/MagicQrModal';
import {
  BadgeIndianRupee,
  TrendingUp,
  Package,
  Clock,
  ShoppingCart,
  HandCoins,
  Calculator,
  Wallet,
  Users,
  ChevronRight,
  Eye,
  EyeOff,
  Languages,
  Check,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const {
    t,
    language,
    changeLanguage,
    todaySalesTotal,
    todayProfitTotal,
    stockValue,
    totalPending,
    sales,
    saleItems,
    products,
  } = useBusiness();

  const [privacyMode, setPrivacyMode] = useState(() => {
    const saved = localStorage.getItem('my_dukaan_privacy');
    // Default to true (Hidden) on initial launch
    return saved === null ? true : saved === 'true';
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const togglePrivacy = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('my_dukaan_privacy', String(next));
      return next;
    });
  };

  const handleSelectLanguage = (lang) => {
    changeLanguage(lang);
    setShowLangMenu(false);
  };

  const maskAmount = (val) => {
    if (!privacyMode) return formatCurrency(val);
    return '₹ ****';
  };

  // Recent sales (last 5)
  const recentSales = sales.slice(0, 5);

  const getProductName = (saleId) => {
    const items = saleItems.filter((si) => si.saleId === saleId);
    if (items.length === 0) return t.sell || 'Sale';
    const product = products.find((p) => p.id === items[0].productId);
    return formatProductDisplayName(product?.name || 'Item', language);
  };

  return (
    <div className="page-content">
      {/* Magic QR Code Modal (Hidden Feature) */}
      <MagicQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        language={language}
        t={t}
      />

      {/* Greeting & Header Action Buttons */}
      <div className="greeting">
        <div
          className="greeting-brand"
          onClick={() => setShowQrModal(true)}
          style={{ cursor: 'pointer' }}
          title={language === 'ta' ? 'மேஜிக் QR வாலட் (தட்டவும்)' : 'Magic QR Vault (Tap to open)'}
          id="btn-app-logo-magic"
        >
          <img
            src="/logo.png"
            alt="My Dukaan"
            className="greeting-logo"
            id="app-icon-magic-qr"
          />
          <div className="greeting-content">
            <div className="greeting-text">{t.greeting}</div>
            <div className="greeting-sub">{language === 'ta' ? 'இன்றைய வியாபார சுருக்கம்' : "Today's business summary"}</div>
          </div>
        </div>


        <div className="greeting-actions">
          {/* Language Selector in front of Visible/Privacy Button */}
          <div className="lang-selector-wrapper">
            <button
              className={`lang-btn ${language === 'ta' ? 'active' : ''}`}
              onClick={() => setShowLangMenu((prev) => !prev)}
              id="btn-language-selector"
              aria-label="Select Language / மொழி"
              title="Change Language"
            >
              <Languages size={17} />
              <span>{language === 'ta' ? 'தமிழ்' : 'English'}</span>
            </button>

            {showLangMenu && (
              <>
                <div
                  className="lang-menu-backdrop"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="lang-dropdown animate-pop" id="lang-dropdown-menu">
                  <button
                    className={`lang-option ${language === 'en' ? 'selected' : ''}`}
                    onClick={() => handleSelectLanguage('en')}
                    id="btn-lang-en"
                  >
                    <div className="lang-option-text">
                      <span className="lang-title">English</span>
                      <span className="lang-subtitle">English</span>
                    </div>
                    {language === 'en' && <Check size={16} className="lang-check" />}
                  </button>

                  <button
                    className={`lang-option ${language === 'ta' ? 'selected' : ''}`}
                    onClick={() => handleSelectLanguage('ta')}
                    id="btn-lang-ta"
                  >
                    <div className="lang-option-text">
                      <span className="lang-title">தமிழ்</span>
                      <span className="lang-subtitle">Tamil</span>
                    </div>
                    {language === 'ta' && <Check size={16} className="lang-check" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Privacy / Visible Button */}
          <button
            className={`privacy-btn ${privacyMode ? 'active' : ''}`}
            onClick={togglePrivacy}
            title={privacyMode ? 'Amounts hidden (Tap to show)' : 'Amounts visible (Tap to hide)'}
            id="btn-privacy-toggle"
            aria-label="Toggle privacy"
          >
            {privacyMode ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{privacyMode ? (language === 'ta' ? 'மறைந்தது' : 'Hidden') : (language === 'ta' ? 'தெரியும்' : 'Visible')}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={<Package size={22} color="#F97316" />}
          iconBg="#FFF7ED"
          label={t.stockValue}
          value={stockValue}
          isPrivate={privacyMode}
        />
        <StatCard
          icon={<BadgeIndianRupee size={22} color="#5B5FE6" />}
          iconBg="#EEEEFF"
          label={t.todaySales}
          value={todaySalesTotal}
          isPrivate={privacyMode}
        />
        <StatCard
          icon={<TrendingUp size={22} color="#22C55E" />}
          iconBg="#ECFDF5"
          label={t.todayProfit}
          value={todayProfitTotal}
          isPrivate={privacyMode}
        />
        <StatCard
          icon={<Clock size={22} color="#EF4444" />}
          iconBg="#FEF2F2"
          label={t.customerPending}
          value={totalPending}
          isPrivate={privacyMode}
        />
      </div>

      {/* Action Buttons */}
      <div className="actions-row">
        <ActionButton
          icon={<ShoppingCart size={24} />}
          label={t.buy}
          variant="buy"
          onClick={() => navigate('/new-purchase')}
          id="btn-buy"
        />
        <ActionButton
          icon={<HandCoins size={24} />}
          label={t.sell}
          variant="sell"
          onClick={() => navigate('/new-sale')}
          id="btn-sell"
        />
        <ActionButton
          icon={<Calculator size={24} />}
          label={t.calculator}
          variant="calc"
          onClick={() => navigate('/calculator')}
          id="btn-calc"
        />
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button
          className="btn btn--outline btn--sm"
          style={{ flex: 1 }}
          onClick={() => navigate('/expenses')}
          id="btn-expenses-link"
        >
          <Wallet size={18} />
          {t.expenses}
        </button>
        <button
          className="btn btn--outline btn--sm"
          style={{ flex: 1 }}
          onClick={() => navigate('/customers')}
          id="btn-customers-link"
        >
          <Users size={18} />
          {t.customers}
        </button>
      </div>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">{t.recentSales}</div>
            <button className="section-action" onClick={() => navigate('/sales')} id="btn-view-all-sales">
              {t.viewAll} <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
            </button>
          </div>
          {recentSales.map((sale) => (
            <div key={sale.id} className="sale-card">
              <div className="sale-card-left">
                <div className="sale-card-product">{getProductName(sale.id)}</div>
                <div className="sale-card-time">
                  {formatDate(sale.date, language)} · {formatTime(sale.date)}
                </div>
              </div>
              <div className="sale-card-right">
                <div className="sale-card-amount">
                  <SmartAmountText value={sale.totalAmount} isPrivate={privacyMode} compact={true} />
                </div>
                <div className={`sale-card-profit ${sale.totalProfit < 0 ? 'negative' : ''}`}>
                  <SmartAmountText
                    value={sale.totalProfit}
                    isPrivate={privacyMode}
                    showSign={true}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
