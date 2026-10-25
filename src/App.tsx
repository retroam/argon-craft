import React, { useEffect, useState } from 'react';
import {
  CanvasScene,
  GameplayTelemetry,
  Generated3DGame,
  InferredGameSpec,
  InteractionLogEntry,
  MicroDemoVariant,
  ModelEvalResult,
  ThinkingLevel,
} from './types';
import {
  DEFAULT_MICRO_DEMOS,
  GOOGLE_ARSENAL_MODELS,
  PRESET_SCENES,
} from './data/presets';
import {
  buildBaselineEvalResultSync,
  computeDeterministicSpecFromTelemetry,
  generateMicroDemoProbes,
  getEffectiveApiKey,
  hasActiveApiKey,
  inferGameSpecFromTelemetry,
  runAutonomousVerificationLoop,
  setCustomApiKey,
  synthesizeFull3DGame,
} from './services/geminiService';
import { buildStandaloneThreeJsGameHtml } from './services/standaloneGameGenerator';
import { FigmaCanvasStudio } from './components/FigmaCanvasStudio';
import { MicroDemoLab } from './components/MicroDemoLab';
import { FullGameStudio } from './components/FullGameStudio';
import { EvalSuiteArena } from './components/EvalSuiteArena';
import { InteractionsTraceDrawer } from './components/InteractionsTraceDrawer';
import { DemoDirectorState, GuidedDemoDirector } from './components/GuidedDemoDirector';
import { STUDIO_THEMES, StudioThemeId } from './theme/studioThemes';
import { KeyRound, X } from 'lucide-react';

type PipelineStage = 'figma_canvas' | 'micro_demos' | 'full_game' | 'eval_suite';

export default function App() {
  const [activeStage, setActiveStage] = useState<PipelineStage>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const st = params.get('stage') as PipelineStage | null;
      if (
        st &&
        ['figma_canvas', 'micro_demos', 'full_game', 'eval_suite'].includes(st)
      ) {
        return st;
      }
    }
    return 'figma_canvas';
  });

  const [themeId, setThemeId] = useState<StudioThemeId>('mineral_teal');
  const activeTheme = STUDIO_THEMES[themeId];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--studio-backdrop', activeTheme.canvasBackdrop);
    root.style.setProperty('--studio-shell', activeTheme.shellBg);
    root.style.setProperty('--studio-panel', activeTheme.panelBg);
    root.style.setProperty('--studio-muted-bg', activeTheme.panelMutedBg);
    root.style.setProperty('--studio-hover-bg', activeTheme.panelHoverBg);
    root.style.setProperty('--studio-border', activeTheme.borderColor);
    root.style.setProperty('--studio-divider', activeTheme.dividerColor);
    root.style.setProperty('--studio-text', activeTheme.textPrimary);
    root.style.setProperty('--studio-muted', activeTheme.textSecondary);
    root.style.setProperty('--studio-accent', activeTheme.accent);
    root.style.setProperty('--studio-accent-hover', activeTheme.accentHover);
    root.style.setProperty('--studio-accent-soft', activeTheme.accentSoft);
    root.style.setProperty('--studio-accent-border', activeTheme.accentBorder);
  }, [activeTheme]);

  const [scene, setScene] = useState<CanvasScene>(PRESET_SCENES[0]);
  const [probes, setProbes] = useState<MicroDemoVariant[]>(DEFAULT_MICRO_DEMOS);
  const [probeInteractionId, setProbeInteractionId] = useState<string | undefined>(
    undefined
  );
  const [telemetries, setTelemetries] = useState<Record<string, GameplayTelemetry>>({});
  const [inferredSpec, setInferredSpec] = useState<InferredGameSpec>(() =>
    computeDeterministicSpecFromTelemetry(PRESET_SCENES[0], DEFAULT_MICRO_DEMOS, [])
  );

  const [generatedGame, setGeneratedGame] = useState<Generated3DGame>(() => {
    const initialSpec = computeDeterministicSpecFromTelemetry(
      PRESET_SCENES[0],
      DEFAULT_MICRO_DEMOS,
      []
    );
    const html = buildStandaloneThreeJsGameHtml(
      PRESET_SCENES[0],
      initialSpec,
      'gemini-4-argon (thinking: high)'
    );
    return {
      id: 'initial-game',
      title: `${PRESET_SCENES[0].title}: ${initialSpec.playerArchetype}`,
      subtitle: 'Telemetry-Synthesized 3D Build',
      spec: initialSpec,
      scene: PRESET_SCENES[0],
      standaloneHtmlCode: html,
      verificationChecks: runAutonomousVerificationLoop(
        PRESET_SCENES[0],
        initialSpec,
        html
      ),
      modelUsed: 'gemini-4-argon',
      thinkingLevel: 'high',
      generationLatencyMs: 640,
      totalTokens: 4820,
      createdAt: new Date().toLocaleTimeString(),
    };
  });

  const [evalResults, setEvalResults] = useState<Record<string, ModelEvalResult>>(() => {
    const initialMap: Record<string, ModelEvalResult> = {};
    for (const cfg of GOOGLE_ARSENAL_MODELS) {
      initialMap[cfg.id] = buildBaselineEvalResultSync(
        cfg,
        PRESET_SCENES[0],
        inferredSpec
      );
    }
    return initialMap;
  });

  const [interactionLogs, setInteractionLogs] = useState<InteractionLogEntry[]>([
    {
      id: 'log-init-argon',
      timestamp: new Date().toLocaleTimeString(),
      model: 'gemini-4-argon',
      thinkingLevel: 'high',
      stage: 'canvas_vision',
      interactionId: 'int_argon_stage_init_01',
      latencyMs: 640,
      status: 'fallback_simulated',
      summary:
        'Initialized 2.5D Stage Blueprint & baseline 3D physics profile via @google/genai Interactions API.',
      tokensUsed: 4820,
    },
  ]);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getEffectiveApiKey());
  const [hasKey, setHasKey] = useState<boolean>(() => hasActiveApiKey());

  const [isDemoActive, setIsDemoActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1' || params.get('demo') === 'autostart';
    }
    return false;
  });

  const [directorState, setDirectorState] = useState<DemoDirectorState>({
    isActive: false,
    elapsedSec: 0,
    selectedNodeId: null,
    activeProbeId: 'kinetic_platformer',
    fullGameCamera: 'third_person_chase',
    fullGameViewMode: 'play_native',
    evalTab: 'leaderboard',
  });

  const appendLog = (entry: InteractionLogEntry) => {
    setInteractionLogs((prev) => [entry, ...prev.slice(0, 39)]);
  };

  const handleLaunchMicroDemos = async (canvasPngDataUrl: string | null) => {
    setActiveStage('micro_demos');
    const res = await generateMicroDemoProbes(scene, canvasPngDataUrl, appendLog);
    setProbes(res.probes);
    setProbeInteractionId(res.interactionId);
  };

  const handleUpdateTelemetry = (t: GameplayTelemetry) => {
    setTelemetries((prev) => {
      const existing = prev[t.variantId];
      return {
        ...prev,
        [t.variantId]: {
          ...t,
          userRating: existing?.userRating ?? t.userRating,
        },
      };
    });
  };

  const handleRateProbe = (
    variantId: MicroDemoVariant['id'],
    rating: 'loved' | 'neutral' | 'disliked'
  ) => {
    setTelemetries((prev) => {
      const existing = prev[variantId] || {
        variantId,
        variantTitle: probes.find((p) => p.id === variantId)?.title || variantId,
        playDurationSec: 12,
        totalKeyPresses: 28,
        apm: 140,
        jumpCount: 5,
        dashOrActionCount: 3,
        projectilesFired: 2,
        airborneRatio: 0.36,
        explorationCoverage: 64,
        collectiblesGathered: 2,
        totalCollectibles: 3,
        hazardCollisions: 0,
        jumpPadUses: 2,
        enemiesEvadedOrHit: 1,
        goalReached: true,
        timeToGoalSec: 12.4,
        averageSpeed: 13.2,
        heatmapPoints: [
          { x: -24, z: 14, weight: 1.2 },
          { x: -6, z: 2, weight: 1.8 },
          { x: 18, z: -12, weight: 2.1 },
        ],
        actionTimeline: [
          { timeSec: 2.1, event: 'Jump Pad Boost', type: 'jump' },
          { timeSec: 6.4, event: 'Collected Shard (2/3)', type: 'collect' },
        ],
        userRating: rating,
        engagementScore: rating === 'loved' ? 94 : 62,
      };
      return {
        ...prev,
        [variantId]: {
          ...existing,
          userRating: rating,
        },
      };
    });
  };

  const handleSimulateAllProbes = () => {
    const simulated: Record<string, GameplayTelemetry> = {
      kinetic_platformer: {
        variantId: 'kinetic_platformer',
        variantTitle: 'Game 1: 3D Parkour',
        playDurationSec: 18.4,
        totalKeyPresses: 52,
        apm: 169,
        jumpCount: 11,
        dashOrActionCount: 7,
        projectilesFired: 4,
        airborneRatio: 0.54,
        explorationCoverage: 86,
        collectiblesGathered: 3,
        totalCollectibles: 3,
        hazardCollisions: 0,
        jumpPadUses: 4,
        enemiesEvadedOrHit: 2,
        goalReached: true,
        timeToGoalSec: 18.4,
        averageSpeed: 14.8,
        heatmapPoints: [
          { x: -30, z: 18, weight: 1.5 },
          { x: -15, z: 8, weight: 2.2 },
          { x: 0, z: -2, weight: 2.8 },
          { x: 16, z: -10, weight: 2.4 },
          { x: 28, z: -18, weight: 3.0 },
        ],
        actionTimeline: [
          { timeSec: 1.8, event: 'Double-Jump Activated', type: 'jump' },
          { timeSec: 4.2, event: 'Jump Pad Launch', type: 'jump' },
          { timeSec: 8.6, event: 'Collected Shard (2/3)', type: 'collect' },
          { timeSec: 18.4, event: 'Goal Reached in 18.4s', type: 'goal' },
        ],
        userRating: 'loved',
        engagementScore: 96,
      },
      tactical_isometric: {
        variantId: 'tactical_isometric',
        variantTitle: 'Game 2: Isometric Puzzle',
        playDurationSec: 20.0,
        totalKeyPresses: 31,
        apm: 93,
        jumpCount: 3,
        dashOrActionCount: 2,
        projectilesFired: 1,
        airborneRatio: 0.14,
        explorationCoverage: 58,
        collectiblesGathered: 2,
        totalCollectibles: 3,
        hazardCollisions: 1,
        jumpPadUses: 1,
        enemiesEvadedOrHit: 1,
        goalReached: false,
        timeToGoalSec: null,
        averageSpeed: 9.2,
        heatmapPoints: [
          { x: -28, z: 16, weight: 2.1 },
          { x: -8, z: 6, weight: 2.5 },
          { x: 8, z: 0, weight: 1.9 },
        ],
        actionTimeline: [
          { timeSec: 3.4, event: 'Jump Impulse', type: 'jump' },
          { timeSec: 9.2, event: 'Collected Shard (1/3)', type: 'collect' },
        ],
        userRating: 'neutral',
        engagementScore: 68,
      },
      arcade_arena: {
        variantId: 'arcade_arena',
        variantTitle: 'Game 3: Arcade Shooter',
        playDurationSec: 16.9,
        totalKeyPresses: 48,
        apm: 170,
        jumpCount: 6,
        dashOrActionCount: 9,
        projectilesFired: 8,
        airborneRatio: 0.34,
        explorationCoverage: 78,
        collectiblesGathered: 3,
        totalCollectibles: 3,
        hazardCollisions: 0,
        jumpPadUses: 2,
        enemiesEvadedOrHit: 4,
        goalReached: true,
        timeToGoalSec: 16.9,
        averageSpeed: 14.1,
        heatmapPoints: [
          { x: -25, z: 15, weight: 1.4 },
          { x: -4, z: 4, weight: 2.6 },
          { x: 14, z: -8, weight: 2.9 },
        ],
        actionTimeline: [
          { timeSec: 2.5, event: 'Plasma Pulse Fired', type: 'dash' },
          { timeSec: 16.9, event: 'Goal Reached in 16.9s', type: 'goal' },
        ],
        userRating: 'loved',
        engagementScore: 91,
      },
    };
    setTelemetries(simulated);
  };

  const handleInferAndGenerateFullGame = async (thinkingLevel: ThinkingLevel) => {
    setIsSynthesizing(true);
    try {
      let currentTelemetries = Object.values(telemetries);
      if (currentTelemetries.length === 0) {
        handleSimulateAllProbes();
        currentTelemetries = [
          {
            variantId: 'kinetic_platformer',
            variantTitle: 'Game 1: 3D Parkour',
            playDurationSec: 18.4,
            totalKeyPresses: 52,
            apm: 169,
            jumpCount: 11,
            dashOrActionCount: 7,
            projectilesFired: 4,
            airborneRatio: 0.54,
            explorationCoverage: 86,
            collectiblesGathered: 3,
            totalCollectibles: 3,
            hazardCollisions: 0,
            jumpPadUses: 4,
            enemiesEvadedOrHit: 2,
            goalReached: true,
            timeToGoalSec: 18.4,
            averageSpeed: 14.8,
            heatmapPoints: [],
            actionTimeline: [],
            userRating: 'loved',
            engagementScore: 96,
          },
        ];
      }

      const spec = await inferGameSpecFromTelemetry(
        scene,
        probes,
        currentTelemetries,
        probeInteractionId,
        thinkingLevel,
        appendLog
      );
      setInferredSpec(spec);

      const fullGame = await synthesizeFull3DGame(
        scene,
        spec,
        thinkingLevel,
        appendLog
      );
      setGeneratedGame(fullGame);
      setActiveStage('full_game');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveApiKey = () => {
    setCustomApiKey(apiKeyInput);
    setHasKey(hasActiveApiKey());
    setShowKeyModal(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--studio-backdrop)] text-[var(--studio-text)] transition-colors duration-200">
      <a href="?game=iron-circuit" className="fixed bottom-4 left-4 z-50 rounded-lg bg-slate-950 text-teal-200 px-4 py-3 text-xs font-bold shadow-xl border border-teal-500/40">Play Iron Circuit · 3D Fighter ↗</a>
      <GuidedDemoDirector
        isActive={isDemoActive}
        onStop={() => {
          setIsDemoActive(false);
          setScene(PRESET_SCENES[0]);
        }}
        onRestart={() => {
          setScene({ ...PRESET_SCENES[0], nodes: [] });
          setActiveStage('figma_canvas');
        }}
        onSetStage={setActiveStage}
        onSetScene={setScene}
        onSimulateProbes={handleSimulateAllProbes}
        onRateProbe={handleRateProbe}
        onDirectorStateChange={setDirectorState}
        telemetries={telemetries}
      />

      {activeStage === 'figma_canvas' && (
        <FigmaCanvasStudio
          scene={scene}
          onChangeScene={setScene}
          onLaunchMicroDemos={handleLaunchMicroDemos}
          onOpenEvalSuite={() => setActiveStage('eval_suite')}
          onOpenKeyModal={() => setShowKeyModal(true)}
          hasKey={hasKey}
          onLog={appendLog}
          theme={activeTheme}
          onChangeTheme={setThemeId}
          externalSelectedNodeId={
            isDemoActive ? directorState.selectedNodeId : undefined
          }
          onStartGuidedDemo={() => setIsDemoActive(true)}
        />
      )}

      {activeStage === 'micro_demos' && (
        <MicroDemoLab
          scene={scene}
          probes={probes}
          telemetries={telemetries}
          onUpdateTelemetry={handleUpdateTelemetry}
          onRateProbe={handleRateProbe}
          onSimulateAllProbes={handleSimulateAllProbes}
          onInferAndGenerateFullGame={handleInferAndGenerateFullGame}
          onBackToCanvas={() => setActiveStage('figma_canvas')}
          inferredSpec={inferredSpec}
          isSynthesizing={isSynthesizing}
          onLog={appendLog}
          externalActiveProbeId={
            isDemoActive ? directorState.activeProbeId : undefined
          }
          autoBotEnabled={isDemoActive}
        />
      )}

      {activeStage === 'full_game' && (
        <FullGameStudio
          game={generatedGame}
          onUpdateGameCode={(newHtml) =>
            setGeneratedGame({ ...generatedGame, standaloneHtmlCode: newHtml })
          }
          onUpdateGame={(updated) => {
            setGeneratedGame(updated);
            setScene(updated.scene);
            setInferredSpec(updated.spec);
          }}
          onBackToDemos={() => setActiveStage('micro_demos')}
          onBackToCanvas={() => setActiveStage('figma_canvas')}
          onOpenEvalSuite={() => setActiveStage('eval_suite')}
          onLog={appendLog}
          externalCameraMode={
            isDemoActive ? directorState.fullGameCamera : undefined
          }
          externalViewMode={
            isDemoActive ? directorState.fullGameViewMode : undefined
          }
          autoBotEnabled={isDemoActive}
        />
      )}

      {!isDemoActive && <InteractionsTraceDrawer logs={interactionLogs} />}

      {activeStage === 'eval_suite' && (
        <EvalSuiteArena
          scene={scene}
          telemetries={Object.values(telemetries)}
          referenceSpec={inferredSpec}
          evalResults={evalResults}
          onUpdateEvalResult={(res) =>
            setEvalResults((prev) => ({ ...prev, [res.configId]: res }))
          }
          onBackToCanvas={() => setActiveStage('figma_canvas')}
          onLog={appendLog}
          externalTab={isDemoActive ? directorState.evalTab : undefined}
        />
      )}

      {/* Clean Studio API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl text-[var(--studio-text)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <KeyRound className="w-4 h-4 text-[var(--studio-accent)]" />
                <span>Google AI Studio / Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--studio-muted)] leading-relaxed">
              In Google AI Studio Build, <code>process.env.GEMINI_API_KEY</code> is
              injected automatically. You can also paste an API key below for local runs.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[var(--studio-muted-bg)] border border-[var(--studio-border)] rounded-lg px-3 py-2 text-xs text-[var(--studio-text)] font-mono focus:outline-none focus:border-[var(--studio-accent)]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[var(--studio-muted-bg)] text-[var(--studio-text)] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-lg bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-xs font-medium cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
