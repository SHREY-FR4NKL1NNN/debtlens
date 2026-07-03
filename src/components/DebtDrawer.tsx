import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '../hooks/useMediaQuery';
import { DEBT_TYPES, type Debt, type DebtType } from '../types';
import { extractPdfText } from '../lib/pdf';
import { parseStatement, type ParsedStatement } from '../lib/api';
import { XIcon, UploadIcon, SparkIcon, CheckIcon } from './icons';
import './DebtDrawer.css';

interface Props {
  open: boolean;
  editing: Debt | null;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id'>) => void;
}

interface FormState {
  name: string;
  type: DebtType;
  balance: string;
  apr: string;
  minimumPayment: string;
  originalBalance: string;
}

const empty: FormState = {
  name: '',
  type: 'credit',
  balance: '',
  apr: '',
  minimumPayment: '',
  originalBalance: '',
};

type ImportState =
  | { phase: 'idle' }
  | { phase: 'reading' }
  | { phase: 'parsing' }
  | { phase: 'done'; result: ParsedStatement }
  | { phase: 'error'; message: string };

export function DebtDrawer({ open, editing, onClose, onSave }: Props) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState<FormState>(empty);
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setImportState({ phase: 'idle' });
      setForm(
        editing
          ? {
              name: editing.name,
              type: editing.type,
              balance: String(editing.balance),
              apr: String(editing.apr),
              minimumPayment: String(editing.minimumPayment),
              originalBalance:
                editing.originalBalance != null ? String(editing.originalBalance) : '',
            }
          : empty,
      );
    }
  }, [open, editing]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const num = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };
  const valid =
    form.name.trim().length > 0 &&
    num(form.balance) >= 0 &&
    num(form.apr) >= 0 &&
    num(form.minimumPayment) >= 0;

  const submit = () => {
    if (!valid) return;
    const orig = num(form.originalBalance);
    onSave({
      name: form.name.trim(),
      type: form.type,
      balance: num(form.balance),
      apr: num(form.apr),
      minimumPayment: num(form.minimumPayment),
      originalBalance: Number.isFinite(orig) && orig > 0 ? orig : undefined,
    });
    onClose();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      setImportState({ phase: 'reading' });
      const text = await extractPdfText(file);
      setImportState({ phase: 'parsing' });
      const result = await parseStatement(text);
      setImportState({ phase: 'done', result });
    } catch (err) {
      setImportState({
        phase: 'error',
        message:
          err instanceof Error && /API/.test(err.message)
            ? 'Backend unavailable — enter values manually.'
            : "Couldn't read that statement — enter values manually.",
      });
    }
  };

  const applyParsed = (r: ParsedStatement) => {
    set({
      balance: r.balance != null ? String(r.balance) : form.balance,
      apr: r.apr != null ? String(r.apr) : form.apr,
      minimumPayment:
        r.minimumPayment != null ? String(r.minimumPayment) : form.minimumPayment,
      name: r.name ?? form.name,
      type: (r.type as DebtType) ?? form.type,
    });
    setImportState({ phase: 'idle' });
  };

  const panelVariants = isMobile
    ? {
        hidden: { y: '100%' },
        visible: { y: 0 },
      }
    : {
        hidden: { x: '100%' },
        visible: { x: 0 },
      };

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer-root">
          <motion.div
            className="drawer-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            className={`drawer-panel glass ${isMobile ? 'drawer-bottom' : 'drawer-right'}`}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-head">
              <h2 className="dl-heading">{editing ? 'Edit debt' : 'Add a debt'}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <XIcon />
              </button>
            </div>

            <div className="drawer-body">
              <div className="field">
                <label>Debt name</label>
                <input
                  className="input"
                  style={{ fontFamily: 'var(--font-body)' }}
                  placeholder="Chase Sapphire"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => set({ type: e.target.value as DebtType })}
                >
                  {DEBT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Current balance</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="4200"
                    value={form.balance}
                    onChange={(e) => set({ balance: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>APR (%)</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="18.99"
                    value={form.apr}
                    onChange={(e) => set({ apr: e.target.value })}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Minimum payment</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="120"
                    value={form.minimumPayment}
                    onChange={(e) => set({ minimumPayment: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>
                    Original balance <span className="dl-muted">(optional)</span>
                  </label>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="6000"
                    value={form.originalBalance}
                    onChange={(e) => set({ originalBalance: e.target.value })}
                  />
                </div>
              </div>

              {/* PDF import */}
              <div className="import-zone">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {importState.phase === 'idle' && (
                  <button
                    className="btn btn-ghost import-btn"
                    onClick={() => fileRef.current?.click()}
                    type="button"
                  >
                    <UploadIcon width={18} height={18} /> Import from statement (PDF)
                  </button>
                )}
                {(importState.phase === 'reading' || importState.phase === 'parsing') && (
                  <div className="import-status">
                    <span className="spinner" />
                    {importState.phase === 'reading'
                      ? 'Reading PDF…'
                      : 'Extracting balance, APR & minimum…'}
                  </div>
                )}
                {importState.phase === 'error' && (
                  <div className="import-error">{importState.message}</div>
                )}
                {importState.phase === 'done' && (
                  <ParsedPreview result={importState.result} onApply={applyParsed} />
                )}
              </div>
            </div>

            <div className="drawer-foot">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!valid}>
                {editing ? 'Save changes' : 'Add debt'}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function ParsedPreview({
  result,
  onApply,
}: {
  result: ParsedStatement;
  onApply: (r: ParsedStatement) => void;
}) {
  const rows: [string, string][] = [
    ['Balance', result.balance != null ? `$${result.balance.toLocaleString()}` : '—'],
    ['APR', result.apr != null ? `${result.apr}%` : '—'],
    [
      'Minimum',
      result.minimumPayment != null ? `$${result.minimumPayment.toLocaleString()}` : '—',
    ],
  ];
  return (
    <motion.div
      className="parsed-preview"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="parsed-head">
        <SparkIcon width={16} height={16} />
        <span>Extracted from your statement</span>
        {result.confidence === 'low' && <span className="parsed-flag">low confidence</span>}
      </div>
      <div className="parsed-rows">
        {rows.map(([k, v]) => (
          <div key={k} className="parsed-row">
            <span className="dl-muted">{k}</span>
            <span className="dl-mono">{v}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => onApply(result)}>
        <CheckIcon width={15} height={15} /> Use these values
      </button>
    </motion.div>
  );
}
