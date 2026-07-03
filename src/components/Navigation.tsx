import { NavLink } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { ThemeToggle } from './ThemeToggle';
import {
  DashboardIcon,
  DebtsIcon,
  StrategyIcon,
  SimulateIcon,
  ProgressIcon,
  CalendarIcon,
  LifeIcon,
  SparkIcon,
} from './icons';
import './Navigation.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
interface NavItem {
  to: string;
  label: string;
  Icon: Icon;
  primary: boolean; // shown in the mobile bottom bar
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, primary: true },
  { to: '/debts', label: 'Debts', Icon: DebtsIcon, primary: true },
  { to: '/strategy', label: 'Strategy', Icon: StrategyIcon, primary: true },
  { to: '/simulate', label: 'Simulate', Icon: SimulateIcon, primary: true },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon, primary: false },
  { to: '/life', label: 'Life Cost', Icon: LifeIcon, primary: false },
  { to: '/progress', label: 'Progress', Icon: ProgressIcon, primary: true },
];

const PRIMARY = NAV.filter((n) => n.primary);
const SECONDARY = NAV.filter((n) => !n.primary);

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand-sm' : ''}`}>
      <span className="brand-mark">
        <SparkIcon width={18} height={18} />
      </span>
      <span className="brand-name dl-display">DebtLens</span>
    </div>
  );
}

/** Left sidebar — tablet & desktop. */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <Wordmark />
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon width={20} height={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <ThemeToggle />
      </div>
    </aside>
  );
}

/** Top header — mobile only. Hosts brand, secondary-screen links, theme. */
export function MobileHeader() {
  return (
    <header className="mobile-header glass">
      <Wordmark small />
      <div className="mobile-header-actions">
        {SECONDARY.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `header-icon-btn ${isActive ? 'active' : ''}`
            }
            aria-label={label}
            title={label}
          >
            <Icon width={19} height={19} />
          </NavLink>
        ))}
        <ThemeToggle compact />
      </div>
    </header>
  );
}

/** Bottom tab bar — mobile only, exactly the 5 primary screens (spec). */
export function BottomNav() {
  return (
    <nav className="bottom-nav glass">
      {PRIMARY.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}
        >
          <Icon width={22} height={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Chooses the right chrome for the viewport. */
export function Navigation() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <>
        <MobileHeader />
        <BottomNav />
      </>
    );
  }
  return <Sidebar />;
}
