import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hover?: boolean; // lift 2px on hover (spec hover rule)
  onClick?: () => void;
  as?: 'div' | 'button';
}

export function GlassCard({
  children,
  className = '',
  style,
  hover = false,
  onClick,
}: Props) {
  return (
    <motion.div
      className={`glass ${hover ? 'glass-hover' : ''} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </motion.div>
  );
}
