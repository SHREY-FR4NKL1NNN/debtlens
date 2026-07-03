import { Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './screens/Dashboard';
import { Debts } from './screens/Debts';
import { Strategy } from './screens/Strategy';
import { Simulator } from './screens/Simulator';
import { Calendar } from './screens/Calendar';
import { LifeCost } from './screens/LifeCost';
import { Progress } from './screens/Progress';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="route-wrap"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/simulate" element={<Simulator />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/life" element={<LifeCost />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navigation />
      <main className="app-main">
        <div className="app-content">
          <AnimatedRoutes />
        </div>
      </main>
    </div>
  );
}
