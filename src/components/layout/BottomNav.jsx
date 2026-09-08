import { NavLink } from 'react-router-dom';
import { Home, Package, BadgeIndianRupee, ShoppingCart, BarChart3 } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';

const navItems = [
  { path: '/', icon: Home, label: 'home' },
  { path: '/stock', icon: Package, label: 'stock' },
  { path: '/sales', icon: BadgeIndianRupee, label: 'sales' },
  { path: '/purchases', icon: ShoppingCart, label: 'purchases' },
  { path: '/reports', icon: BarChart3, label: 'reports' },
];

export default function BottomNav() {
  const { t } = useBusiness();

  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav" id="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
            id={`nav-${item.label}`}
          >
            <div className="nav-icon-wrapper">
              <item.icon size={20} strokeWidth={2.2} />
            </div>
            <span>{t[item.label]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
