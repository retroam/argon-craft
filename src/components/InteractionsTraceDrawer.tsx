import React, { useState } from 'react';
import { InteractionLogEntry } from '../types';
import { Activity, CheckCircle2, Clock, GitBranch, Layers, X } from 'lucide-react';

interface InteractionsTraceDrawerProps {
  logs: InteractionLogEntry[];
}

export const InteractionsTraceDrawer: React.FC<InteractionsTraceDrawerProps> = ({
  logs,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      {/* Floating Interactions API Chain Pill (Bottom-Left) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--studio-panel)]/95 hover:bg-[var(--studio-panel)] border border-[var(--studio-border)] shadow-md text-[11px] font-medium text-[var(--studio-text)] cursor-pointer transition"
        title="Inspect @google/genai Interactions API Call Chain & previous_interaction_id State"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <GitBranch className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
        <span>Interactions API Chain ({logs.length})</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden text-[var(--studio-text)]">
            <div className="px-4 py-3 border-b border-[var(--studio-divider)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--studio-accent)]" />
                <div>
                  <div className="text-xs font-semibold">
                    @google/genai Interactions API Trace &amp; Stateful Chain
                  </div>
                  <div className="text-[10px] text-[var(--studio-muted)]">
                    Live audit of client.interactions.create(...) calls, thinking_level, and previous_interaction_id chaining
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-muted-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-[var(--studio-muted)] bg-[var(--studio-muted-bg)] rounded-xl border border-[var(--studio-border)]">
                  No Interactions API calls recorded in this session yet. Click{' '}
                  <strong>Generate 3D Game</strong>, <strong>Watch &amp; Self-Heal 3D Scene</strong>, or{' '}
                  <strong>Managed Agent Sandbox</strong> to inspect live stateful interactions.
                </div>
              ) : (
                logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-[var(--studio-muted-bg)] border border-[var(--studio-border)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[var(--studio-panel)] border border-[var(--studio-border)] font-mono text-[10px] font-semibold text-[var(--studio-accent)]">
                          {entry.model}
                        </span>
                        {entry.thinkingLevel && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-mono text-[10px]">
                            thinking_level: &quot;{entry.thinkingLevel}&quot;
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-[var(--studio-panel)] text-[var(--studio-muted)] font-mono text-[10px] flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          {entry.stage}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--studio-muted)] shrink-0">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.latencyMs}ms
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          {entry.status === 'success' ? 'live' : 'verified'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--studio-text)] leading-relaxed">
                      {entry.summary}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono text-[var(--studio-muted)] pt-0.5">
                      {entry.interactionId && (
                        <span>
                          id: <strong className="text-[var(--studio-text)]">{entry.interactionId}</strong>
                        </span>
                      )}
                      {entry.previousInteractionId && (
                        <span>
                          previous_interaction_id:{' '}
                          <strong className="text-[var(--studio-accent)]">
                            {entry.previousInteractionId}
                          </strong>
                        </span>
                      )}
                      {entry.tokensUsed && <span>tokens: {entry.tokensUsed}</span>}
                      <span>{entry.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
