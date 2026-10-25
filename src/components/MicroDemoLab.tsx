import React, { useEffect, useState } from 'react';
import {
  CanvasScene,
  GameplayTelemetry,
  InferredGameSpec,
  InteractionLogEntry,
  MicroDemoVariant,
  ThinkingLevel,
} from '../types';
import { ThreeGameViewport } from './ThreeGameViewport';
import { AiSynthIcon, ArgonPrismLogo } from './StudioIcons';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

interface MicroDemoLabProps {
  scene: CanvasScene;
  probes: MicroDemoVariant[];
  telemetries: Record<string, GameplayTelemetry>;
  onUpdateTelemetry: (telemetry: GameplayTelemetry) => void;
  onRateProbe: (
    variantId: MicroDemoVariant['id'],
    rating: 'loved' | 'neutral' | 'disliked'
  ) => void;
  onSimulateAllProbes: () => void;
  onInferAndGenerateFullGame: (thinkingLevel: ThinkingLevel) => void;
  onBackToCanvas: () => void;
  inferredSpec: InferredGameSpec | null;
  isSynthesizing: boolean;
  onLog: (entry: InteractionLogEntry) => void;
  externalActiveProbeId?: MicroDemoVariant['id'];
  autoBotEnabled?: boolean;
}

export const MicroDemoLab: React.FC<MicroDemoLabProps> = ({
  scene,
  probes,
  telemetries,
  onUpdateTelemetry,
  onRateProbe,
  onSimulateAllProbes,
  onInferAndGenerateFullGame,
  onBackToCanvas,
  isSynthesizing,
  externalActiveProbeId,
  autoBotEnabled = false,
}) => {
  const [activeProbeId, setActiveProbeId] = useState<MicroDemoVariant['id']>(
    probes[0]?.id || 'kinetic_platformer'
  );
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('high');

  useEffect(() => {
    if (externalActiveProbeId) {
      setActiveProbeId(externalActiveProbeId);
    }
  }, [externalActiveProbeId]);

  const activeProbe =
    probes.find((p) => p.id === activeProbeId) || probes[0];
  const activeTelemetry = telemetries[activeProbe.id];

  const cleanGameNames: Record<MicroDemoVariant['id'], string> = {
    kinetic_platformer: 'Game 1: 3D Parkour',
    tactical_isometric: 'Game 2: Isometric Puzzle',
    arcade_arena: 'Game 3: Arcade Shooter',
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--studio-shell)] text-[var(--studio-text)] font-sans select-none">
      {/* Clean Studio Header Bar */}
      <header className="h-12 bg-[var(--studio-panel)] border-b border-[var(--studio-border)] px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Back to Blueprint */}
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
              {scene.title}
            </span>
          </div>
          <span className="text-[11px] text-[var(--studio-muted)] hidden md:inline">
            • 3 Playable Mechanic Probes
          </span>
        </div>

        {/* Center: Switch between the 3 Interpreted Playable Games */}
        <div className="flex items-center gap-1 bg-[var(--studio-muted-bg)] p-1 rounded-xl border border-[var(--studio-border)]">
          {probes.map((probe) => {
            const isSelected = probe.id === activeProbe.id;
            const hasPlayed = Boolean(telemetries[probe.id]);
            return (
              <button
                key={probe.id}
                onClick={() => setActiveProbeId(probe.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                    : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                }`}
              >
                <span>{cleanGameNames[probe.id] || probe.title}</span>
                {hasPlayed && (
                  <Check className="w-3 h-3 text-[var(--studio-accent)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Simulate + Generate Full Game CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateAllProbes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-text)] text-[11px] font-medium transition cursor-pointer"
            title="Simulate gameplay across all 3 games"
          >
            <Bot className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
            <span className="hidden sm:inline">Simulate Play</span>
          </button>

          <button
            onClick={() => onInferAndGenerateFullGame(thinkingLevel)}
            disabled={isSynthesizing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] disabled:opacity-50 text-white text-[12px] font-semibold shadow-xs transition cursor-pointer"
          >
            <AiSynthIcon className="w-3.5 h-3.5" />
            <span>
              {isSynthesizing ? 'Synthesizing Full Game...' : 'Generate Full Game'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content: Playable Game Viewport + Clean Right Observation Card */}
      <div className="flex-1 flex min-h-0 p-3 gap-3 overflow-hidden">
        {/* Left / Center: Playable 3D Game */}
        <div className="flex-1 h-full min-w-0">
          <ThreeGameViewport
            scene={scene}
            variantId={activeProbe.id}
            variantTitle={cleanGameNames[activeProbe.id] || activeProbe.title}
            cameraMode={activeProbe.cameraMode}
            physics={activeProbe.physicsProfile}
            durationSeconds={activeProbe.durationSeconds}
            isFullGame={false}
            autoBotEnabled={autoBotEnabled}
            onTelemetryUpdate={onUpdateTelemetry}
            onDemoComplete={(finalTelemetry) => {
              onUpdateTelemetry(finalTelemetry);
              const nextUnplayed = probes.find(
                (p) => p.id !== activeProbe.id && !telemetries[p.id]
              );
              if (nextUnplayed) {
                setTimeout(() => setActiveProbeId(nextUnplayed.id), 1000);
              }
            }}
          />
        </div>

        {/* Right Panel: Clean Studio Inspector for Design Interpretation & Observed Playstyle */}
        <aside className="w-[284px] bg-[var(--studio-panel)] rounded-2xl border border-[var(--studio-border)] shadow-2xs flex flex-col overflow-y-auto shrink-0 divide-y divide-[var(--studio-divider)] text-[11px]">
          {/* Active Game Interpretation */}
          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)] text-[12px]">
                {cleanGameNames[activeProbe.id]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRateProbe(activeProbe.id, 'loved')}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    activeTelemetry?.userRating === 'loved'
                      ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)]'
                      : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)]'
                  }`}
                  title="Prefer this style"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRateProbe(activeProbe.id, 'disliked')}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    activeTelemetry?.userRating === 'disliked'
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)]'
                  }`}
                  title="Less like this"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[var(--studio-muted)] leading-relaxed">
              {activeProbe.hypothesis}
            </p>
            <div className="flex items-center justify-between bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5 text-[var(--studio-muted)]">
              <span>Camera Rig</span>
              <span className="font-medium text-[var(--studio-text)]">
                {activeProbe.cameraMode.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Live Observed Playstyle Signals */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)]">
                Observed Player Telemetry
              </span>
              <span className="text-[10px] font-mono text-[var(--studio-accent)] bg-[var(--studio-accent-soft)] px-1.5 py-0.5 rounded-md font-semibold">
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--studio-muted-bg)] rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--studio-muted)]">Actions / Min</div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-0.5">
                  {activeTelemetry?.apm || 0} APM
                </div>
              </div>
              <div className="bg-[var(--studio-muted-bg)] rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--studio-muted)]">Jumps & Pads</div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-0.5">
                  {(activeTelemetry?.jumpCount || 0) +
                    (activeTelemetry?.jumpPadUses || 0)}
                </div>
              </div>
              <div className="bg-[var(--studio-muted-bg)] rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--studio-muted)]">Airborne Ratio</div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-0.5">
                  {activeTelemetry
                    ? Math.round(activeTelemetry.airborneRatio * 100)
                    : 0}
                  %
                </div>
              </div>
              <div className="bg-[var(--studio-muted-bg)] rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--studio-muted)]">Shards Collected</div>
                <div className="text-sm font-semibold text-[var(--studio-text)] mt-0.5">
                  {activeTelemetry?.collectiblesGathered || 0} /{' '}
                  {scene.nodes.filter((n) => n.role === 'collectible').length}
                </div>
              </div>
            </div>

            {/* Minimal Trajectory Map */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-[var(--studio-muted)] mb-1">
                <span>Spatial Trajectory</span>
                <span>{activeTelemetry?.explorationCoverage || 0}% explored</span>
              </div>
              <div className="relative h-24 w-full bg-[var(--studio-muted-bg)] rounded-xl border border-[var(--studio-border)] overflow-hidden">
                {activeTelemetry?.heatmapPoints.map((pt, i) => {
                  const leftPct = Math.min(94, Math.max(6, ((pt.x + 48) / 96) * 100));
                  const topPct = Math.min(94, Math.max(6, ((pt.z + 32) / 64) * 100));
                  return (
                    <div
                      key={i}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--studio-accent)]/65"
                    />
                  );
                })}
                {(!activeTelemetry || activeTelemetry.heatmapPoints.length === 0) && (
                  <div className="inset-0 absolute flex items-center justify-center text-[10px] text-[var(--studio-muted)]">
                    Play or click Auto-Play to record path
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Inputs Log */}
          <div className="p-3.5 flex-1 flex flex-col min-h-[110px]">
            <div className="font-semibold text-[var(--studio-text)] mb-2">
              Recent Events
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 text-[10px] text-[var(--studio-muted)]">
              {activeTelemetry?.actionTimeline &&
              activeTelemetry.actionTimeline.length > 0 ? (
                [...activeTelemetry.actionTimeline]
                  .reverse()
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[var(--studio-muted-bg)] px-2.5 py-1 rounded-lg text-[var(--studio-text)]"
                    >
                      <span className="truncate">{item.event}</span>
                      <span className="text-[var(--studio-muted)] font-mono ml-2">
                        {item.timeSec}s
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-[var(--studio-muted)] py-3 text-center">
                  Waiting for player input...
                </div>
              )}
            </div>
          </div>

          {/* Bottom Synthesis Box */}
          <div className="p-3.5 bg-[var(--studio-muted-bg)]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)]">
                Gemini 4 Argon
              </span>
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value as ThinkingLevel)}
                className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-lg px-2 py-0.5 text-[10px] text-[var(--studio-text)]"
              >
                <option value="high">Thinking: High</option>
                <option value="medium">Thinking: Medium</option>
                <option value="low">Thinking: Low</option>
              </select>
            </div>
            <button
              onClick={() => onInferAndGenerateFullGame(thinkingLevel)}
              disabled={isSynthesizing}
              className="w-full py-2 px-3 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <AiSynthIcon className="w-3.5 h-3.5" />
              <span>
                {isSynthesizing
                  ? 'Synthesizing Full Game...'
                  : 'Synthesize Full Game from Playstyle'}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
