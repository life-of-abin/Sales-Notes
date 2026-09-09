import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BusinessProvider } from './context/BusinessContext';
import { CalculatorProvider } from './context/CalculatorContext';
import { useBusiness } from './hooks/useBusiness';
import BottomNav from './components/layout/BottomNav';
import ToastContainer from './components/ui/Toast';
import InstallPrompt from './components/ui/InstallPrompt';
import FloatingCalculator from './components/ui/FloatingCalculator';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Stock from './pages/Stock';
import ProductDetail from './pages/ProductDetail';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import NewPurchase from './pages/NewPurchase';
import NewSale from './pages/NewSale';
import Calculator from './pages/Calculator';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';

function AppContent() {
  const { loading } = useBusiness();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        fontSize: 48,
      }}>
        🛍️
      </div>
    );
  }

  return (
    <div className="app-layout">
      <InstallPrompt />
      <ToastContainer />
      <FloatingCalculator />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/stock/:id" element={<ProductDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/new-purchase" element={<NewPurchase />} />
        <Route path="/new-sale" element={<NewSale />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BusinessProvider>
        <CalculatorProvider>
          <AppContent />
        </CalculatorProvider>
      </BusinessProvider>
    </BrowserRouter>
  );
}
