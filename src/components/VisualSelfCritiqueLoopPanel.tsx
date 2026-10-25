import React, { useState } from 'react';
import {
  GameplayTelemetry,
  Generated3DGame,
  InteractionLogEntry,
} from '../types';
import {
  VisualCritiqueIterationResult,
  runVisualSelfCritiqueAndFixLoop,
} from '../services/selfCritiqueLoopService';
import { Camera, CheckCircle2, Eye, RefreshCw, Sparkles, Wrench } from 'lucide-react';

interface VisualSelfCritiqueLoopPanelProps {
  game: Generated3DGame;
  onApplyPatchedGame: (patchedGame: Generated3DGame) => void;
  captureWebglFrame?: (() => string) | null;
  latestTelemetry?: GameplayTelemetry | null;
  onLog: (entry: InteractionLogEntry) => void;
}

export const VisualSelfCritiqueLoopPanel: React.FC<
  VisualSelfCritiqueLoopPanelProps
> = ({
  game,
  onApplyPatchedGame,
  captureWebglFrame,
  latestTelemetry,
  onLog,
}) => {
  const [iteration, setIteration] = useState<number>(1);
  const [isRunningLoop, setIsRunningLoop] = useState<boolean>(false);
  const [history, setHistory] = useState<VisualCritiqueIterationResult[]>([]);

  const latestResult = history[history.length - 1] || null;
  const currentScore = latestResult ? latestResult.scoreAfter : 76;

  const handleRunLoop = async () => {
    if (isRunningLoop) return;
    setIsRunningLoop(true);
    try {
      const frameDataUrl = captureWebglFrame ? captureWebglFrame() : null;
      const result = await runVisualSelfCritiqueAndFixLoop(
        game,
        iteration,
        frameDataUrl || null,
        latestTelemetry,
        onLog
      );

      setIteration(result.iteration);
      setHistory((prev) => [...prev, result]);

      onApplyPatchedGame({
        ...game,
        subtitle: `Self-Healed 3D Build • ${result.versionLabel}`,
        scene: result.patchedScene,
        spec: {
          ...game.spec,
          tunedPhysics: result.patchedPhysics,
          interactionId: result.interactionId,
        },
        standaloneHtmlCode: result.patchedHtmlCode,
        verificationChecks: result.updatedVerificationChecks,
      });
    } finally {
      setIsRunningLoop(false);
    }
  };

  return (
    <div className="p-3.5 space-y-2.5 bg-[var(--studio-accent-soft)]/35 border-b border-[var(--studio-divider)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--studio-text)]">
          <Eye className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
          <span>Render → Watch → Critique → Fix Loop</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--studio-panel)] border border-[var(--studio-accent-border)] text-[var(--studio-accent)] font-semibold">
          {currentScore}/100
        </span>
      </div>

      {/* Version Progression Pills: Draft v1 -> Patched v2 -> Verified v3 */}
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div
          className={`px-2 py-1 rounded-md border text-center font-medium ${
            iteration === 1
              ? 'bg-[var(--studio-panel)] border-[var(--studio-accent)] text-[var(--studio-accent)]'
              : 'bg-[var(--studio-muted-bg)] border-[var(--studio-border)] text-[var(--studio-muted)]'
          }`}
        >
          Draft v1 (76)
        </div>
        <div
          className={`px-2 py-1 rounded-md border text-center font-medium ${
            iteration === 2
              ? 'bg-[var(--studio-panel)] border-[var(--studio-accent)] text-[var(--studio-accent)]'
              : iteration > 2
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-[var(--studio-muted-bg)] border-[var(--studio-border)] text-[var(--studio-muted)]'
          }`}
        >
          Patched v2 (94)
        </div>
        <div
          className={`px-2 py-1 rounded-md border text-center font-medium ${
            iteration >= 3
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
              : 'bg-[var(--studio-muted-bg)] border-[var(--studio-border)] text-[var(--studio-muted)]'
          }`}
        >
          Verified v3 (99)
        </div>
      </div>

      <p className="text-[10px] text-[var(--studio-muted)] leading-relaxed">
        Captures the live WebGL frame, watches &amp; critiques 3D reachability/sightlines with{' '}
        <span className="font-mono text-[var(--studio-text)]">gemini-4-argon</span>, and mutates the
        3D scene in place.
      </p>

      <button
        onClick={handleRunLoop}
        disabled={isRunningLoop}
        className="w-full py-2 px-3 rounded-lg bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
      >
        {isRunningLoop ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Watching WebGL Frame &amp; Patching 3D Scene...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {iteration === 1
                ? 'Watch & Self-Heal 3D Scene (Argon Loop)'
                : iteration === 2
                ? 'Run Final v3 Visual Verification Pass'
                : 'Re-Verify 3D Scene Frame (99/100)'}
            </span>
          </>
        )}
      </button>

      {latestResult && (
        <div className="space-y-2 pt-1">
          {latestResult.capturedFrameDataUrl && (
            <div className="rounded-lg overflow-hidden border border-[var(--studio-border)] bg-slate-950 relative">
              <img
                src={latestResult.capturedFrameDataUrl}
                alt="Captured WebGL Frame inspected by Gemini 4 Argon"
                className="w-full h-20 object-cover opacity-90"
              />
              <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
                <span className="flex items-center gap-1">
                  <Camera className="w-2.5 h-2.5 text-sky-400" />
                  WebGL Frame Inspected
                </span>
                <span className="text-emerald-300">
                  {latestResult.scoreBefore} → {latestResult.scoreAfter}/100
                </span>
              </div>
            </div>
          )}

          <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-lg p-2 space-y-1">
            <div className="text-[10px] font-semibold text-[var(--studio-text)] flex items-center gap-1">
              <Eye className="w-3 h-3 text-[var(--studio-accent)]" />
              <span>Argon Visual Critique ({latestResult.versionLabel})</span>
            </div>
            {latestResult.visualCritiques.map((c, idx) => (
              <div
                key={idx}
                className="text-[10px] text-[var(--studio-muted)] leading-snug"
              >
                • {c}
              </div>
            ))}
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 space-y-1">
            <div className="text-[10px] font-semibold text-emerald-900 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-emerald-600" />
              <span>3D Scene &amp; Physics Patches Applied</span>
            </div>
            {latestResult.appliedDiffSummary.map((diff, idx) => (
              <div
                key={idx}
                className="text-[10px] font-mono text-emerald-800 flex items-start gap-1 leading-snug"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <span>{diff}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
