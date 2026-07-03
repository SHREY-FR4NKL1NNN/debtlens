import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  illustration?: ReactNode;
}

/** Designed empty state — never a blank screen (spec). */
export function EmptyState({ icon, title, body, action, illustration }: Props) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="empty-illustration">{illustration ?? icon}</div>
      <h2 className="dl-heading">{title}</h2>
      <p className="dl-label empty-body">{body}</p>
      {action && <div className="empty-action">{action}</div>}
    </motion.div>
  );
}
