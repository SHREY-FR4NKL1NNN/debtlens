import { AnimatePresence, motion } from 'framer-motion';
import type { ExplanationState } from '../hooks/useExplanation';
import { SparkIcon } from './icons';
import './ExplanationPanel.css';

interface Props extends ExplanationState {
  title?: string;
}

/** Glass panel that renders a streaming LocalMind explanation. */
export function ExplanationPanel({
  text,
  streaming,
  started,
  error,
  title = 'DebtLens explains',
}: Props) {
  return (
    <AnimatePresence>
      {started && (
        <motion.div
          className="glass explain-panel"
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="explain-head">
            <span className="explain-badge">
              <SparkIcon width={15} height={15} />
            </span>
            <span className="explain-title">{title}</span>
            {streaming && <span className="explain-status">thinking…</span>}
          </div>

          {error ? (
            <p className="explain-error">{error}</p>
          ) : (
            <p className="explain-body">
              {text}
              {streaming && <span className="explain-cursor" />}
              {!text && streaming && (
                <span className="dl-muted">Analyzing your debt portfolio…</span>
              )}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
