import React, { useEffect, useState } from 'react';
import {
  CameraPerspective,
  CanvasNode,
  CanvasScene,
  GameplayTelemetry,
  MicroDemoVariant,
} from '../types';
import { PRESET_SCENES } from '../data/presets';
import { ArgonPrismLogo } from './StudioIcons';
import { Pause, Play, RotateCcw, X } from 'lucide-react';

export interface DemoDirectorState {
  isActive: boolean;
  elapsedSec: number;
  selectedNodeId: string | null;
  activeProbeId: MicroDemoVariant['id'];
  fullGameCamera: CameraPerspective;
  fullGameViewMode: 'play_native' | 'code_inspector';
  evalTab: 'leaderboard' | 'side_by_side' | 'architecture_guide';
}

interface CaptionStep {
  startSec: number;
  endSec: number;
  stepBadge: string;
  title: string;
  instruction: string;
  cursorX: number; // viewport % (0..100)
  cursorY: number; // viewport % (0..100)
  cursorLabel?: string;
  clicking?: boolean;
}

const DEMO_DURATION_SEC = 60;

const CAPTION_STEPS: CaptionStep[] = [
  {
    startSec: 0,
    endSec: 3.5,
    stepBadge: '01 / BLANK CANVAS',
    title: 'Start with a clean 2.5D spatial stage blueprint',
    instruction:
      'No wall-of-text prompts needed—begin on an empty architectural grid ready for 3D game prefabs.',
    cursorX: 50,
    cursorY: 46,
    cursorLabel: 'Empty 800×540 Stage Blueprint',
  },
  {
    startSec: 3.5,
    endSec: 9,
    stepBadge: '02 / BASE PLATFORMS & SPAWN',
    title: 'Draw the landing deck, player spawn, and kinetic boost pad',
    instruction:
      'Place a 3D platform slab (Z+0), drop the Player Spawn beacon, and attach a 1.8x Kinetic Jump Pad.',
    cursorX: 33,
    cursorY: 64,
    cursorLabel: 'Placing Spawn & Jump Pad',
    clicking: true,
  },
  {
    startSec: 9,
    endSec: 14,
    stepBadge: '02 / ELEVATED 3D GEOMETRY',
    title: 'Extrude elevated skybridges and plasma hazard trenches',
    instruction:
      'Each 2D shape carries 3D extrusion height (H) and vertical elevation (Z+28 to Z+48) in the right inspector.',
    cursorX: 51,
    cursorY: 46,
    cursorLabel: 'Central Skybridge (Z+28)',
    clicking: true,
  },
  {
    startSec: 14,
    endSec: 19.2,
    stepBadge: '02 / CRYSTALS, SENTINELS & GOAL',
    title: 'Populate energy shards, patrolling drones, and the Goal Portal',
    instruction:
      'Add collectibles, autonomous enemy sentinels, and the Quantum Victory Portal on the top-right sanctum deck.',
    cursorX: 66,
    cursorY: 31,
    cursorLabel: 'Quantum Goal Portal (Z+72)',
    clicking: true,
  },
  {
    startSec: 19.2,
    endSec: 22,
    stepBadge: '02 / LAUNCH 3D PROBES',
    title: 'Blueprint complete — click "Generate 3D Game" in the spatial dock',
    instruction:
      'ArgonCraft sends the 2D layout to Gemini to synthesize 3 distinct playable 3D mechanic probes.',
    cursorX: 58,
    cursorY: 93,
    cursorLabel: 'Click Generate 3D Game',
    clicking: true,
  },
  {
    startSec: 22,
    endSec: 28,
    stepBadge: '03 / PLAYABLE PROBE 1 (3D PARKOUR)',
    title: 'Play Game 1: Kinetic 3D Parkour while live telemetry records',
    instruction:
      'As you jump, air-dash, and use boost pads, the right panel logs APM, airborne ratio, and movement paths.',
    cursorX: 92,
    cursorY: 16,
    cursorLabel: 'Live Telemetry • Rating: Loved',
    clicking: true,
  },
  {
    startSec: 28,
    endSec: 33,
    stepBadge: '03 / PLAYABLE PROBE 2 (ISOMETRIC)',
    title: 'Switch to Game 2: Tactical Isometric Puzzle interpretation',
    instruction:
      'Same stage layout, re-interpreted with an isometric tactical camera rig and precision platforming physics.',
    cursorX: 50,
    cursorY: 4.5,
    cursorLabel: 'Switch to Game 2: Isometric',
    clicking: true,
  },
  {
    startSec: 33,
    endSec: 38,
    stepBadge: '03 / PLAYABLE PROBE 3 (ARCADE ARENA)',
    title: 'Test Game 3: High-Speed Arcade Shooter & trigger synthesis',
    instruction:
      'After sampling the 3 probes, click "Generate Full Game" to chain telemetry into Gemini 4 Argon.',
    cursorX: 90,
    cursorY: 4.5,
    cursorLabel: 'Click Generate Full Game',
    clicking: true,
  },
  {
    startSec: 38,
    endSec: 46,
    stepBadge: '04 / SYNTHESIZED FULL 3D GAME',
    title: 'Play the full 3D game tailored to your observed playstyle',
    instruction:
      'Gemini 4 Argon inferred a 96% match for aerial parkour, tuning double-jump physics and verifying 5/5 checks.',
    cursorX: 88,
    cursorY: 36,
    cursorLabel: '96% Spec Match • 5/5 Verified',
  },
  {
    startSec: 46,
    endSec: 52,
    stepBadge: '04 / CAMERA RIGS & STANDALONE CODE',
    title: 'Toggle live 3D camera perspectives & inspect Three.js HTML code',
    instruction:
      'Switch between 3D Chase and Isometric views on the fly, or export the self-contained HTML5 game bundle.',
    cursorX: 46,
    cursorY: 4.5,
    cursorLabel: 'Toggle Isometric / Code View',
    clicking: true,
  },
  {
    startSec: 52,
    endSec: 56,
    stepBadge: '05 / GOOGLE MODEL ARSENAL SCORECARD',
    title: 'Benchmark Gemini 4 Argon across the Google Model Arsenal',
    instruction:
      'Compare spatial fidelity, playstyle alignment, latency, and cost across Argon High/Med/Low, Flash, and Gemma.',
    cursorX: 48,
    cursorY: 34,
    cursorLabel: 'Argon High: 98/100 Score',
  },
  {
    startSec: 56,
    endSec: 60.5,
    stepBadge: '05 / SIDE-BY-SIDE 3D ARENA',
    title: 'Compare models side-by-side in simultaneous 3D gameplay',
    instruction:
      'From a blank 2D canvas to a telemetry-synthesized, verified 3D game in 60 seconds.',
    cursorX: 50,
    cursorY: 4.5,
    cursorLabel: 'Side-by-Side 3D Arena',
    clicking: true,
  },
];

declare global {
  interface Window {
    __setDemoTimeSec?: (sec: number) => void;
  }
}

interface GuidedDemoDirectorProps {
  isActive: boolean;
  onStop: () => void;
  onRestart: () => void;
  onSetStage: (
    stage: 'figma_canvas' | 'micro_demos' | 'full_game' | 'eval_suite'
  ) => void;
  onSetScene: (scene: CanvasScene) => void;
  onSimulateProbes: () => void;
  onRateProbe: (
    variantId: MicroDemoVariant['id'],
    rating: 'loved' | 'neutral' | 'disliked'
  ) => void;
  onDirectorStateChange: (state: DemoDirectorState) => void;
  telemetries?: Record<string, GameplayTelemetry>;
}

export const GuidedDemoDirector: React.FC<GuidedDemoDirectorProps> = ({
  isActive,
  onStop,
  onRestart,
  onSetStage,
  onSetScene,
  onSimulateProbes,
  onRateProbe,
  onDirectorStateChange,
}) => {
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Expose deterministic time-stepping hook for high-precision video capture
  useEffect(() => {
    window.__setDemoTimeSec = (sec: number) => {
      setIsPaused(true);
      setElapsedSec(Math.max(0, Math.min(DEMO_DURATION_SEC, sec)));
    };
    return () => {
      delete window.__setDemoTimeSec;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setElapsedSec(0);
      setIsPaused(false);
      return;
    }

    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (isPaused) {
        lastTime = now;
        return;
      }
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setElapsedSec((prev) => {
        const next = prev + dt;
        return next >= DEMO_DURATION_SEC ? DEMO_DURATION_SEC : next;
      });
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, isPaused]);

  // Choreograph app state based on elapsedSec (0..60s)
  useEffect(() => {
    if (!isActive) return;

    const basePreset = PRESET_SCENES[0];
    const allNodes: CanvasNode[] = basePreset.nodes;

    // 0s - 22s: Stage 1 — Building from Blank Canvas
    if (elapsedSec < 22) {
      onSetStage('figma_canvas');

      let count = 0;
      if (elapsedSec >= 3.5) {
        const buildProgress = Math.min(1, (elapsedSec - 3.5) / 15.2);
        count = Math.max(1, Math.round(buildProgress * allNodes.length));
      }

      const visibleNodes = allNodes.slice(0, count);
      const latestNodeId =
        visibleNodes.length > 0
          ? visibleNodes[visibleNodes.length - 1].id
          : null;

      onSetScene({
        ...basePreset,
        title:
          count === 0
            ? 'Untitled Stage — Blank Blueprint'
            : basePreset.title,
        nodes: visibleNodes,
      });

      onDirectorStateChange({
        isActive: true,
        elapsedSec,
        selectedNodeId: latestNodeId,
        activeProbeId: 'kinetic_platformer',
        fullGameCamera: 'third_person_chase',
        fullGameViewMode: 'play_native',
        evalTab: 'leaderboard',
      });
      return;
    }

    // Ensure full preset scene is restored from 22s onward
    onSetScene(basePreset);

    // 22s - 38s: Stage 2 — Playing the 3 Short 3D Mechanic Probes
    if (elapsedSec >= 22 && elapsedSec < 38) {
      onSetStage('micro_demos');
      if (elapsedSec >= 24.5 && elapsedSec < 26.0) {
        onRateProbe('kinetic_platformer', 'loved');
      }
      if (elapsedSec >= 33.5 && elapsedSec < 35.0) {
        onSimulateProbes();
      }

      const activeProbeId: MicroDemoVariant['id'] =
        elapsedSec < 28
          ? 'kinetic_platformer'
          : elapsedSec < 33
          ? 'tactical_isometric'
          : 'arcade_arena';

      onDirectorStateChange({
        isActive: true,
        elapsedSec,
        selectedNodeId: allNodes[allNodes.length - 1].id,
        activeProbeId,
        fullGameCamera: 'third_person_chase',
        fullGameViewMode: 'play_native',
        evalTab: 'leaderboard',
      });
      return;
    }

    // 38s - 52s: Stage 3 — Synthesized Full 3D Game Studio
    if (elapsedSec >= 38 && elapsedSec < 52) {
      onSetStage('full_game');

      const fullGameCamera: CameraPerspective =
        elapsedSec >= 46 && elapsedSec < 49.5
          ? 'isometric_tactical'
          : 'third_person_chase';

      const fullGameViewMode: 'play_native' | 'code_inspector' =
        elapsedSec >= 49.5 && elapsedSec < 51.3
          ? 'code_inspector'
          : 'play_native';

      onDirectorStateChange({
        isActive: true,
        elapsedSec,
        selectedNodeId: null,
        activeProbeId: 'kinetic_platformer',
        fullGameCamera,
        fullGameViewMode,
        evalTab: 'leaderboard',
      });
      return;
    }

    // 52s - 60s: Stage 4 — Google Model Arsenal Evaluation Suite
    onSetStage('eval_suite');
    const evalTab: 'leaderboard' | 'side_by_side' =
      elapsedSec < 56 ? 'leaderboard' : 'side_by_side';

    onDirectorStateChange({
      isActive: true,
      elapsedSec,
      selectedNodeId: null,
      activeProbeId: 'kinetic_platformer',
      fullGameCamera: 'third_person_chase',
      fullGameViewMode: 'play_native',
      evalTab,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(elapsedSec * 5), isActive]);

  if (!isActive) return null;

  const currentCaption =
    CAPTION_STEPS.find(
      (c) => elapsedSec >= c.startSec && elapsedSec < c.endSec
    ) || CAPTION_STEPS[CAPTION_STEPS.length - 1];

  // Dynamically target the newly placed node on the canvas between 3.5s and 19.2s
  let cursorX = currentCaption.cursorX;
  let cursorY = currentCaption.cursorY;
  let cursorLabel = currentCaption.cursorLabel;

  if (elapsedSec >= 3.5 && elapsedSec < 19.2) {
    const allNodes = PRESET_SCENES[0].nodes;
    const buildProgress = Math.min(1, (elapsedSec - 3.5) / 15.2);
    const count = Math.max(1, Math.round(buildProgress * allNodes.length));
    const latestNode = allNodes[count - 1];
    if (latestNode) {
      cursorX = Math.round(
        18.75 + ((latestNode.x + latestNode.width * 0.5) / 800) * 62.5
      );
      cursorY = Math.round(
        12.5 + ((latestNode.y + latestNode.height * 0.5) / 540) * 75
      );
      cursorLabel = `+ ${latestNode.name} (Z+${latestNode.elevation})`;
    }
  }

  const progressPct = Math.min(100, (elapsedSec / DEMO_DURATION_SEC) * 100);
  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Animated Studio Pointer Cursor */}
      <div
        style={{
          left: `${cursorX}%`,
          top: `${cursorY}%`,
        }}
        className="transition-all duration-300 ease-out absolute -translate-x-1 -translate-y-1 z-50 flex items-start gap-1.5"
      >
        <div className="relative">
          {currentCaption.clicking && (
            <span className="absolute -inset-2 rounded-full bg-[var(--studio-accent)]/35 animate-ping" />
          )}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
            fill="none"
          >
            <path
              d="M4 3L19 10.5L11.5 13L9 20.5L4 3Z"
              fill="#142420"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {cursorLabel && (
          <span className="mt-3 px-2 py-0.5 rounded-md bg-[#142420]/90 text-white text-[10px] font-medium shadow-md whitespace-nowrap border border-white/15">
            {cursorLabel}
          </span>
        )}
      </div>

      {/* Subtle Lower-Third Written Instruction Overlay Card */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[750px] px-4 pointer-events-auto">
        <div className="bg-[#142420]/92 backdrop-blur-md text-white rounded-2xl shadow-[0_14px_40px_rgba(10,20,18,0.28)] border border-white/15 overflow-hidden">
          <div className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0d9488]/25 border border-[#2dd4bf]/40 flex items-center justify-center shrink-0 mt-0.5 text-[#2dd4bf]">
                <ArgonPrismLogo className="w-4 h-4" accentColor="#2dd4bf" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2dd4bf]/20 text-[#5eead4] font-semibold shrink-0 whitespace-nowrap">
                    {currentCaption.stepBadge}
                  </span>
                  <span className="text-[12.5px] font-semibold text-white">
                    {currentCaption.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200/90 mt-0.5 leading-snug">
                  {currentCaption.instruction}
                </p>
              </div>
            </div>

            {/* Playback Controls & Timer */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-slate-300 mr-1">
                {formatTime(elapsedSec)} / 1:00
              </span>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={isPaused ? 'Resume Demo' : 'Pause Demo'}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setElapsedSec(0);
                  setIsPaused(false);
                  onRestart();
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Restart 1-Min Demo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onStop}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/40 text-white transition cursor-pointer"
                title="Exit Guided Demo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Smooth 60-Second Timeline Progress Bar */}
          <div className="h-1 w-full bg-white/10">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full bg-[#2dd4bf] transition-all duration-150"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
