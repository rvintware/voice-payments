import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import useTTS from '../hooks/useTTS.js';
import VoiceButton from './VoiceButton.jsx';

/*
  UnifiedDialog is a finite-state overlay that will eventually handle
  both the "review" (say yes/no) step and the "result" step (payment
  link or split links).  For now we scaffold the component with the
  state machine and minimal placeholder UI so that it can be wired into
  App incrementally.
*/
export default function UnifiedDialog({ payload, onClose, onCancel }) {
  // payload contains the data to review (amount, recipients, etc.)
  const [phase, setPhase] = useState('review'); // 'review' | 'result' | 'error'
  const [resultData, setResultData] = useState(null);

  // focus management
  const cardRef = useRef(null);

  // Focus trap & Esc listener
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    if (cardRef.current) {
      cardRef.current.focus({ preventScroll: true });
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
      if (e.key === 'Tab' && cardRef.current) {
        // simple trap: keep focus inside card by cycling
        const focusables = cardRef.current.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [onCancel]);

  useEffect(() => {
    function done() {
      onClose?.();
    }
    window.addEventListener('confirm_done', done);
    return () => window.removeEventListener('confirm_done', done);
  }, [onClose]);

  // Listen for the WebSocket push that carries the payment link(s).
  useEffect(() => {
    function handleResult(e) {
      const detail = e.detail || {};
      setResultData(detail.url ? detail : detail);
      setPhase('result');
    }
    window.addEventListener('payment_result', handleResult);
    return () => window.removeEventListener('payment_result', handleResult);
  }, []);

  if (!payload) return null; // nothing to show

  // Extract commonly-used fields
  const { amountCents, recipientEmail, sentence } = payload;
  const name = recipientEmail?.split('@')[0] || 'friend';
  const dollars = amountCents ? (amountCents / 100).toFixed(2) : null;

  // Speak confirmation sentence once (like old ConfirmationDialog)
  useTTS(amountCents && recipientEmail ? { amountCents, name } : null);

  // Auto-actions when result arrives (single-link case)
  useEffect(() => {
    if (phase !== 'result' || !resultData) return;
    // If single link object, copy & open automatically (same as previous PaymentLinkDialog)
    if (resultData.url) {
      try {
        navigator.clipboard.writeText(resultData.url);
      } catch (_) {}
      // open in background tab (non-blocking)
      window.open(resultData.url, '_blank', 'noopener,noreferrer');
    }
  }, [phase, resultData]);

  // check reduced motion preference
  const prefersReduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Helper: render badge in top-right corner
  function StepBadge({ step }) {
    return (
      <span className="absolute top-3 right-4 text-xs opacity-70 select-none">
        Step {step} of 2
      </span>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative bg-white rounded-xl shadow-xl p-6 w-96 ${prefersReduceMotion ? '' : 'animate-slide-up-fade'} text-center`}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'review' && (
          <>
            <StepBadge step={1} />
            {sentence ? (
              <>
                <p className="text-lg mb-2">I heard:</p>
                <p className="font-semibold text-banking-mint mb-4">{sentence}</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">I heard:</p>
                {dollars && (
                  <p className="font-semibold text-banking-mint mb-4">Send ${dollars} to {name}</p>
                )}
              </>
            )}
            <p className="mb-6">Say "yes" to continue or "no" to cancel.</p>
            <VoiceButton
              mode="answer"
              answerPayload={{ amountCents, recipientEmail }}
              onPaymentLink={(linkObj) => {
                setResultData(linkObj);
                setPhase('result');
              }}
              onCancel={onCancel}
            />
          </>
        )}

        {phase === 'result' && resultData && (
          <>
            <StepBadge step={2} />
            {/* Decide between single link and split links */}
            {Array.isArray(resultData.links) || Array.isArray(resultData) ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Payment Links</h2>
                <ul className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {(resultData.links || resultData).map((l) => {
                    const pretty = (l.amount_cents / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: (l.currency || 'usd').toUpperCase(),
                    });
                    return (
                      <li key={l.url} className="flex items-center justify-between gap-2 border-b pb-2">
                        <div>
                          <p className="font-medium">{l.name}</p>
                          <p className="text-sm text-gray-600">{pretty}</p>
                        </div>
                        <button
                          className="px-2 py-1 text-xs bg-banking-purple text-white rounded"
                          onClick={() => navigator.clipboard.writeText(l.url)}
                        >
                          Copy Link
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4">Payment Link</h2>
                <div className="flex items-center justify-between gap-2 mb-6">
                  <div>
                    <p className="font-medium">{resultData.name}</p>
                    <p className="text-sm text-gray-600">{
                      typeof resultData.amount_cents === 'number'
                        ? (resultData.amount_cents / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: (resultData.currency || 'usd').toUpperCase(),
                          })
                        : 'Payment link generated'
                    }</p>
                  </div>
                  <button
                    className="px-2 py-1 text-xs bg-banking-purple text-white rounded"
                    onClick={() => navigator.clipboard.writeText(resultData.url)}
                  >
                    Copy Link
                  </button>
                </div>
              </>
            )}

            <button
              className="mt-2 px-4 py-2 bg-gray-200 rounded w-full"
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-lg font-semibold mb-2 text-red-600">Something went wrong</p>
            <p className="text-sm mb-4">Please try again.</p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-200 rounded"
                onClick={() => setPhase('review')}
              >Retry</button>
              <button
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded"
                onClick={onCancel}
              >Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Runtime prop validation – helps catch undefined fields early in dev
UnifiedDialog.propTypes = {
  payload: PropTypes.shape({
    sentence: PropTypes.string,
    amountCents: PropTypes.number,
    recipientEmail: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
}; 