import React, { useEffect, useState } from 'react';
import {
  ArsenalModelConfig,
  CanvasScene,
  GameplayTelemetry,
  InferredGameSpec,
  InteractionLogEntry,
  ModelEvalResult,
} from '../types';
import { COMPANION_MEDIA_MODELS, GOOGLE_ARSENAL_MODELS } from '../data/presets';
import { evaluateSingleArsenalModel } from '../services/geminiService';
import { ThreeGameViewport } from './ThreeGameViewport';
import { AiSynthIcon, ArgonPrismLogo, LaunchCubeIcon } from './StudioIcons';
import {
  ArrowLeft,
  Trophy,
  Zap,
} from 'lucide-react';

interface EvalSuiteArenaProps {
  scene: CanvasScene;
  telemetries: GameplayTelemetry[];
  referenceSpec: InferredGameSpec;
  evalResults: Record<string, ModelEvalResult>;
  onUpdateEvalResult: (res: ModelEvalResult) => void;
  onBackToCanvas: () => void;
  onLog: (entry: InteractionLogEntry) => void;
  externalTab?: 'leaderboard' | 'side_by_side' | 'architecture_guide';
}

export const EvalSuiteArena: React.FC<EvalSuiteArenaProps> = ({
  scene,
  telemetries,
  referenceSpec,
  evalResults,
  onUpdateEvalResult,
  onBackToCanvas,
  onLog,
  externalTab,
}) => {
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [runningModelId, setRunningModelId] = useState<string | null>(null);
  const [leftArenaId, setLeftArenaId] = useState<string>('argon-high');
  const [rightArenaId, setRightArenaId] = useState<string>('flash-3-8');
  const [activeTab, setActiveTab] = useState<
    'leaderboard' | 'side_by_side' | 'architecture_guide'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (
        tab === 'leaderboard' ||
        tab === 'side_by_side' ||
        tab === 'architecture_guide'
      ) {
        return tab;
      }
    }
    return 'leaderboard';
  });

  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  const runSingleModel = async (cfg: ArsenalModelConfig) => {
    setRunningModelId(cfg.id);
    try {
      const res = await evaluateSingleArsenalModel(
        cfg,
        scene,
        telemetries,
        referenceSpec,
        onLog
      );
      onUpdateEvalResult(res);
    } finally {
      setRunningModelId(null);
    }
  };

  const runAllArsenalBenchmarks = async () => {
    setIsRunningAll(true);
    try {
      for (const cfg of GOOGLE_ARSENAL_MODELS) {
        setRunningModelId(cfg.id);
        const res = await evaluateSingleArsenalModel(
          cfg,
          scene,
          telemetries,
          referenceSpec,
          onLog
        );
        onUpdateEvalResult(res);
      }
    } finally {
      setRunningModelId(null);
      setIsRunningAll(false);
    }
  };

  const resultsList = GOOGLE_ARSENAL_MODELS.map((m) => ({
    config: m,
    result: evalResults[m.id] || null,
  }));

  const leftResult = evalResults[leftArenaId];
  const rightResult = evalResults[rightArenaId];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--studio-shell)] text-[var(--studio-text)] font-sans select-none">
      {/* Clean Studio Header Bar */}
      <header className="h-12 bg-[var(--studio-panel)] border-b border-[var(--studio-border)] px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCanvas}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--studio-muted-bg)] text-[12px] font-medium text-[var(--studio-text)] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Stage</span>
          </button>
          <div className="h-4 w-px bg-[var(--studio-border)]" />
          <div className="flex items-center gap-1.5">
            <ArgonPrismLogo className="w-4 h-4 text-[var(--studio-accent)]" />
            <span className="text-[12px] font-semibold text-[var(--studio-text)]">
              Google Model Arsenal Evaluation Suite
            </span>
          </div>
        </div>

        {/* Center View Switcher */}
        <div className="flex items-center gap-1 bg-[var(--studio-muted-bg)] p-1 rounded-xl border border-[var(--studio-border)] text-[11px]">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            Scorecard
          </button>
          <button
            onClick={() => setActiveTab('side_by_side')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'side_by_side'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            Side-by-Side 3D Arena
          </button>
          <button
            onClick={() => setActiveTab('architecture_guide')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'architecture_guide'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            Companions & Routing
          </button>
        </div>

        {/* Right Run Benchmark CTA */}
        <button
          onClick={runAllArsenalBenchmarks}
          disabled={isRunningAll}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] disabled:opacity-50 text-white text-[12px] font-semibold shadow-xs transition cursor-pointer"
        >
          <LaunchCubeIcon className="w-3.5 h-3.5" />
          <span>
            {isRunningAll ? `Evaluating ${runningModelId}...` : 'Run All Benchmarks'}
          </span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 max-w-7xl w-full mx-auto space-y-4">
        {activeTab === 'leaderboard' && (
          <>
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--studio-muted)]">
                  <span>Lead Full-Game Synthesizer</span>
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-1">
                  Gemini 4 Argon (thinking: high)
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  98/100 Score • 100% WebGL Pass Rate
                </div>
              </div>

              <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--studio-muted)]">
                  <span>Interactive Spec Inference</span>
                  <AiSynthIcon className="w-4 h-4 text-[var(--studio-accent)]" />
                </div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-1">
                  Gemini 4 Argon (thinking: medium)
                </div>
                <div className="text-[11px] text-[var(--studio-accent)] font-medium mt-0.5">
                  95/100 Score • ~1.89s Latency
                </div>
              </div>

              <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--studio-muted)]">
                  <span>Rapid 20s Demo Probe Generator</span>
                  <Zap className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-1">
                  Gemini 3.8 Flash
                </div>
                <div className="text-[11px] text-[var(--studio-muted)] font-medium mt-0.5">
                  89/100 Score • 680ms • $0.30/1M tokens
                </div>
              </div>
            </div>

            {/* Clean Studio Table */}
            <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--studio-border)] text-[11px] text-[var(--studio-muted)] bg-[var(--studio-muted-bg)]/60">
                    <th className="py-3 px-4 font-medium">Model</th>
                    <th className="py-3 px-3 font-medium">Recommended Role</th>
                    <th className="py-3 px-3 font-medium text-center">Overall</th>
                    <th className="py-3 px-3 font-medium text-center">2D→3D Spatial</th>
                    <th className="py-3 px-3 font-medium text-center">Playstyle→Spec</th>
                    <th className="py-3 px-3 font-medium text-center">Bot Replay</th>
                    <th className="py-3 px-3 font-medium text-right">Latency</th>
                    <th className="py-3 px-3 font-medium text-right">Est. Cost</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--studio-divider)]">
                  {resultsList.map(({ config, result }) => {
                    const isRunning = runningModelId === config.id;
                    return (
                      <tr
                        key={config.id}
                        className="hover:bg-[var(--studio-muted-bg)]/40 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--studio-text)]">
                            {config.displayName}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--studio-muted)]">
                            {config.modelId} • {config.contextWindow}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[var(--studio-muted)] max-w-[240px]">
                          {config.recommendedJob}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {result && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-mono font-semibold text-[11px] ${
                                result.overallScore >= 92
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : result.overallScore >= 85
                                  ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)]'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {result.overallScore}/100
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--studio-text)]">
                          {result ? `${result.spatialFidelityScore}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--studio-text)]">
                          {result ? `${result.specAlignmentScore}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[var(--studio-text)]">
                          {result ? `${result.botPlayabilityScore}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[var(--studio-muted)]">
                          {result ? `${result.latencyMs}ms` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[var(--studio-muted)]">
                          {result ? `$${result.estimatedCostUsd.toFixed(4)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => runSingleModel(config)}
                            disabled={isRunning}
                            className="px-2.5 py-1 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-text)] text-[11px] font-medium transition cursor-pointer"
                          >
                            {isRunning ? 'Running...' : 'Re-run'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'side_by_side' && (
          <div className="space-y-3">
            <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 text-[12px]">
              <span className="font-semibold text-[var(--studio-text)]">
                Side-by-Side Playable Model Comparison
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={leftArenaId}
                  onChange={(e) => setLeftArenaId(e.target.value)}
                  className="bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--studio-text)]"
                >
                  {GOOGLE_ARSENAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      Left: {m.displayName}
                    </option>
                  ))}
                </select>
                <span className="text-[var(--studio-muted)] text-[11px]">vs</span>
                <select
                  value={rightArenaId}
                  onChange={(e) => setRightArenaId(e.target.value)}
                  className="bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--studio-text)]"
                >
                  {GOOGLE_ARSENAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      Right: {m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[480px]">
              <div className="flex flex-col h-full bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-3 gap-2">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-semibold text-[var(--studio-text)]">
                    {GOOGLE_ARSENAL_MODELS.find((m) => m.id === leftArenaId)?.displayName}
                  </span>
                  {leftResult && (
                    <span className="font-mono text-emerald-600 font-medium">
                      {leftResult.overallScore}/100 • {leftResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <ThreeGameViewport
                    scene={scene}
                    variantId={referenceSpec.winningProbeId}
                    variantTitle={
                      GOOGLE_ARSENAL_MODELS.find((m) => m.id === leftArenaId)
                        ?.displayName || 'Left Model'
                    }
                    cameraMode={leftResult?.cameraMode || referenceSpec.selectedCameraMode}
                    physics={leftResult?.generatedPhysics || referenceSpec.tunedPhysics}
                    durationSeconds={0}
                    isFullGame={true}
                    autoBotEnabled={true}
                  />
                </div>
              </div>

              <div className="flex flex-col h-full bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-3 gap-2">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-semibold text-[var(--studio-text)]">
                    {GOOGLE_ARSENAL_MODELS.find((m) => m.id === rightArenaId)?.displayName}
                  </span>
                  {rightResult && (
                    <span className="font-mono text-[var(--studio-accent)] font-medium">
                      {rightResult.overallScore}/100 • {rightResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <ThreeGameViewport
                    scene={scene}
                    variantId={referenceSpec.winningProbeId}
                    variantTitle={
                      GOOGLE_ARSENAL_MODELS.find((m) => m.id === rightArenaId)
                        ?.displayName || 'Right Model'
                    }
                    cameraMode={
                      rightResult?.cameraMode || referenceSpec.selectedCameraMode
                    }
                    physics={rightResult?.generatedPhysics || referenceSpec.tunedPhysics}
                    durationSeconds={0}
                    isFullGame={true}
                    autoBotEnabled={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'architecture_guide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMPANION_MEDIA_MODELS.map((m) => (
              <div
                key={m.id}
                className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--studio-text)]">
                      {m.displayName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--studio-muted-bg)] text-[var(--studio-muted)]">
                      {m.modelId}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--studio-accent)] font-medium mt-0.5">
                    {m.modality}
                  </div>
                  <p className="text-[11px] text-[var(--studio-muted)] mt-1 leading-relaxed">
                    {m.role}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold font-mono text-emerald-600">
                    {m.qualityScore}/100
                  </div>
                  <div className="text-[10px] font-mono text-[var(--studio-muted)] mt-0.5">
                    {m.latencyAvg}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
