import React, { useEffect, useRef, useState } from 'react';
import {
  CameraPerspective,
  CanvasNode,
  CanvasScene,
  GameplayTelemetry,
  Generated3DGame,
  InteractionLogEntry,
  ManagedAgentRunResult,
} from '../types';
import { ThreeGameViewport } from './ThreeGameViewport';
import { UnitySceneEditor } from './UnitySceneEditor';
import { VisualSelfCritiqueLoopPanel } from './VisualSelfCritiqueLoopPanel';
import {
  ensureArgonCraftCustomAgent,
  generateGameAnnouncerTTS,
  runAntigravitySandboxAgent,
  runDeepResearchLevelAgent,
} from '../services/geminiService';
import {
  VisualCritiqueIterationResult,
  runVisualSelfCritiqueAndFixLoop,
} from '../services/selfCritiqueLoopService';
import { AiSynthIcon, BenchmarkScaleIcon } from './StudioIcons';
import {
  ArrowLeft,
  Bot,
  Box,
  CheckCircle2,
  Code2,
  Download,
  Play,
  Terminal,
  Volume2,
} from 'lucide-react';

interface FullGameStudioProps {
  game: Generated3DGame;
  onUpdateGameCode: (newHtml: string) => void;
  onUpdateGame?: (updatedGame: Generated3DGame) => void;
  onBackToDemos: () => void;
  onBackToCanvas: () => void;
  onOpenEvalSuite: () => void;
  onLog: (entry: InteractionLogEntry) => void;
  externalCameraMode?: CameraPerspective;
  externalViewMode?: 'play_native' | 'generated_demo' | 'unity_studio' | 'agent_sandbox' | 'code_inspector';
  autoBotEnabled?: boolean;
}

export const FullGameStudio: React.FC<FullGameStudioProps> = ({
  game,
  onUpdateGameCode,
  onUpdateGame,
  onBackToDemos,
  onBackToCanvas,
  onOpenEvalSuite,
  onLog,
  externalCameraMode,
  externalViewMode,
  autoBotEnabled = false,
}) => {
  const [viewMode, setViewMode] = useState<
    'play_native' | 'generated_demo' | 'unity_studio' | 'agent_sandbox' | 'code_inspector'
  >('play_native');
  const [activeCamera, setActiveCamera] = useState<CameraPerspective>(
    game.spec.selectedCameraMode
  );

  useEffect(() => {
    if (externalCameraMode) {
      setActiveCamera(externalCameraMode);
    }
  }, [externalCameraMode]);

  useEffect(() => {
    if (externalViewMode) {
      setViewMode(externalViewMode);
    }
  }, [externalViewMode]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const captureWebglFrameRef = useRef<(() => string) | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<GameplayTelemetry | null>(
    null
  );

  // Local editable Unity 3D scene copy synced with game.scene
  const [localScene, setLocalScene] = useState<CanvasScene>(game.scene);
  const [selectedUnityNodeId, setSelectedUnityNodeId] = useState<string | null>(
    game.scene.nodes[0]?.id || null
  );

  // Managed Agent Sandbox state
  const [isRunningSandbox, setIsRunningSandbox] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] =
    useState<ManagedAgentRunResult | null>(null);
  const [customAgentStatus, setCustomAgentStatus] = useState<string | null>(
    null
  );
  const [isRunningDeepResearch, setIsRunningDeepResearch] =
    useState<boolean>(false);
  const [deepResearchProgress, setDeepResearchProgress] = useState<string>('');
  const [deepResearchReport, setDeepResearchReport] = useState<string | null>(
    null
  );

  // Render -> Watch -> Critique -> Fix Loop state (Kimi K3.1 Pro / Gemini 4 Argon Vision-in-the-Loop)
  const [loopIteration, setLoopIteration] = useState<number>(1);
  const [isRunningCritiqueLoop, setIsRunningCritiqueLoop] =
    useState<boolean>(false);
  const [critiqueHistory, setCritiqueHistory] = useState<
    VisualCritiqueIterationResult[]
  >([]);

  const handleRunVisualCritiqueLoop = async () => {
    setIsRunningCritiqueLoop(true);
    try {
      const canvasEl = document.querySelector('canvas');
      let frameDataUrl: string | null = null;
      try {
        frameDataUrl = canvasEl ? canvasEl.toDataURL('image/png') : null;
      } catch {
        frameDataUrl = null;
      }

      const res = await runVisualSelfCritiqueAndFixLoop(
        {
          ...game,
          scene: localScene,
        },
        loopIteration,
        frameDataUrl,
        null,
        onLog
      );
      setLoopIteration(res.iteration);
      setLocalScene(res.patchedScene);
      onUpdateGameCode(res.patchedHtmlCode);
      setCritiqueHistory((prev) => [res, ...prev]);
    } finally {
      setIsRunningCritiqueLoop(false);
    }
  };

  const handleUpdateUnityNode = (id: string, patch: Partial<CanvasNode>) => {
    setLocalScene((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  };

  const handlePlayAnnouncer = async () => {
    setIsSpeaking(true);
    try {
      const res = await generateGameAnnouncerTTS(
        game.spec.audioVisualDirection.announcerVoiceLine,
        game.spec.audioVisualDirection.announcerStyle,
        onLog
      );
      if (res.audioDataUrl) {
        const audio = new Audio(res.audioDataUrl);
        await audio.play();
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([game.standaloneHtmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.scene.id}-argon-3d-game.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunSandboxAgent = async () => {
    setIsRunningSandbox(true);
    try {
      const res = await runAntigravitySandboxAgent(
        localScene,
        game.spec,
        game.standaloneHtmlCode,
        game.interactionId,
        sandboxResult?.environmentId,
        onLog
      );
      setSandboxResult(res);
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleProvisionCustomAgent = async () => {
    const res = await ensureArgonCraftCustomAgent(localScene, onLog);
    setCustomAgentStatus(res.summary);
  };

  const handleRunDeepResearch = async () => {
    setIsRunningDeepResearch(true);
    setDeepResearchProgress('Initializing background Deep Research agent...');
    try {
      const res = await runDeepResearchLevelAgent(
        localScene,
        game.spec,
        (status) => setDeepResearchProgress(status),
        onLog
      );
      setDeepResearchReport(res.reportText);
      setDeepResearchProgress(
        `Completed (${res.interactionId.slice(0, 12)}... • status: ${res.status})`
      );
    } finally {
      setIsRunningDeepResearch(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--studio-shell)] text-[var(--studio-text)] font-sans select-none">
      {/* Clean Studio Header Bar */}
      <header className="h-12 bg-[var(--studio-panel)] border-b border-[var(--studio-border)] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBackToCanvas}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--studio-muted-bg)] text-[12px] font-medium text-[var(--studio-text)] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Stage</span>
          </button>
          <button
            onClick={onBackToDemos}
            className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--studio-muted-bg)] text-[12px] font-medium text-[var(--studio-muted)] transition cursor-pointer"
          >
            Probes
          </button>
          <div className="h-4 w-px bg-[var(--studio-border)]" />
          <span className="text-[12px] font-semibold text-[var(--studio-text)] truncate">
            {game.title}
          </span>
          <span className="hidden xl:inline-block text-[10px] px-2 py-0.5 rounded-full bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold shrink-0">
            Gemini 4 Argon ({game.thinkingLevel})
          </span>
        </div>

        {/* Center Mode Switcher: Play 3D | Unity 3D Engine | Managed Agents | HTML Code */}
        <div className="flex items-center gap-1 bg-[var(--studio-muted-bg)] p-1 rounded-xl border border-[var(--studio-border)] text-[11px]">
          <button
            onClick={() => setViewMode('play_native')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              viewMode === 'play_native'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>Play 3D</span>
          </button>
          <button
            onClick={() => setViewMode('generated_demo')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${viewMode === 'generated_demo' ? 'bg-[var(--studio-panel)] text-[var(--studio-text)]' : 'text-[var(--studio-muted)]'}`}
          >
            Generated Demo
          </button>
          <button
            onClick={() => setViewMode('unity_studio')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              viewMode === 'unity_studio'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Box className="w-3 h-3 text-emerald-600" />
            <span>Unity 3D & C#</span>
          </button>
          <button
            onClick={() => setViewMode('agent_sandbox')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              viewMode === 'agent_sandbox'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
            <span>Managed Agents</span>
          </button>
          <button
            onClick={() => setViewMode('code_inspector')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              viewMode === 'code_inspector'
                ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-2xs font-semibold'
                : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>HTML5 Code</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {viewMode === 'generated_demo' && (
            <iframe
              title="Generated playable game demo"
              srcDoc={game.standaloneHtmlCode}
              sandbox="allow-scripts"
              className="w-full h-full border-0 rounded-xl bg-black"
            />
          )}
          {viewMode === 'play_native' && (
            <div className="hidden lg:flex items-center gap-1 bg-[var(--studio-muted-bg)] p-1 rounded-xl border border-[var(--studio-border)] text-[10px]">
              {(
                [
                  ['third_person_chase', 'Chase'],
                  ['isometric_tactical', 'Iso'],
                  ['top_down_action', 'Top'],
                ] as Array<[CameraPerspective, string]>
              ).map(([cam, label]) => (
                <button
                  key={cam}
                  onClick={() => setActiveCamera(cam)}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    activeCamera === cam
                      ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] font-semibold'
                      : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handlePlayAnnouncer}
            disabled={isSpeaking}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-text)] text-[11px] font-medium transition cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
            <span>{isSpeaking ? 'Speaking...' : 'Voice Intro'}</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-text)] text-[11px] font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export HTML</span>
          </button>

          <button
            onClick={onOpenEvalSuite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-[11px] font-semibold transition cursor-pointer"
          >
            <BenchmarkScaleIcon className="w-3.5 h-3.5" />
            <span>Models Eval</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 p-3 gap-3 overflow-hidden">
        <div className="flex-1 h-full min-w-0">
          {viewMode === 'play_native' && (
            <ThreeGameViewport
              scene={localScene}
              variantId={game.spec.winningProbeId}
              variantTitle={game.title}
              cameraMode={activeCamera}
              physics={game.spec.tunedPhysics}
              durationSeconds={0}
              isFullGame={true}
              autoBotEnabled={autoBotEnabled}
              onTelemetryUpdate={(t) => setLiveTelemetry(t)}
              onReadyCapture={(fn) => {
                captureWebglFrameRef.current = fn;
              }}
            />
          )}

          {viewMode === 'unity_studio' && (
            <UnitySceneEditor
              scene={localScene}
              selectedNodeId={selectedUnityNodeId}
              onSelectNode={setSelectedUnityNodeId}
              onUpdateNode={handleUpdateUnityNode}
              spec={game.spec}
              physics={game.spec.tunedPhysics}
              showInspectorSidebar={true}
            />
          )}

          {viewMode === 'agent_sandbox' && (
            <div className="h-full flex flex-col bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl overflow-hidden shadow-2xs p-4 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-divider)] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--studio-text)]">
                      Gemini Managed Agents Hub (`@google/genai` v2.31)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold">
                      environment: &quot;remote&quot;
                    </span>
                  </div>
                  <p className="text-xs text-[var(--studio-muted)] mt-0.5">
                    Execute code in Google-hosted Linux sandboxes (`antigravity-preview-09-2026`), provision custom agents (`client.agents.create`), or run background Deep Research (`deep-research-preview-04-2026`).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleProvisionCustomAgent}
                    className="px-3 py-1.5 rounded-xl bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] cursor-pointer transition"
                  >
                    Provision Custom Agent (`client.agents.create`)
                  </button>
                  <button
                    onClick={handleRunDeepResearch}
                    disabled={isRunningDeepResearch}
                    className="px-3 py-1.5 rounded-xl bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] border border-[var(--studio-border)] text-xs font-medium text-[var(--studio-text)] cursor-pointer transition disabled:opacity-50"
                  >
                    {isRunningDeepResearch
                      ? 'Polling Deep Research...'
                      : 'Run Deep Research (`background: true`)'}
                  </button>
                  <button
                    onClick={handleRunSandboxAgent}
                    disabled={isRunningSandbox}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>
                      {isRunningSandbox
                        ? 'Executing in Remote Sandbox...'
                        : 'Run Antigravity Sandbox Verifier'}
                    </span>
                  </button>
                </div>
              </div>

              {customAgentStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 flex items-center justify-between">
                  <span>
                    <strong>Custom Managed Agent:</strong> {customAgentStatus}
                  </span>
                  <span className="font-mono text-[10px]">
                    base_agent: antigravity-preview-09-2026
                  </span>
                </div>
              )}

              {(deepResearchProgress || deepResearchReport) && (
                <div className="p-3.5 rounded-xl bg-[var(--studio-muted-bg)] border border-[var(--studio-border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--studio-text)]">
                      Background Deep Research Agent (`deep-research-preview-04-2026`)
                    </span>
                    <span className="font-mono text-[10px] text-[var(--studio-accent)]">
                      {deepResearchProgress}
                    </span>
                  </div>
                  {deepResearchReport && (
                    <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--studio-muted)] leading-relaxed">
                      {deepResearchReport}
                    </pre>
                  )}
                </div>
              )}

              {/* Antigravity Remote Linux Sandbox Execution Timeline */}
              {sandboxResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#191b1f] text-gray-200 px-3.5 py-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">
                        Sandbox Run: {sandboxResult.agentUsed}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400">
                      <span>env: {sandboxResult.environmentId}</span>
                      <span>{sandboxResult.latencyMs}ms</span>
                      <span className="text-emerald-400 uppercase">
                        {sandboxResult.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {sandboxResult.steps.map((step) => (
                      <div
                        key={step.index}
                        className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-muted-bg)] overflow-hidden text-xs"
                      >
                        <div className="px-3 py-1.5 bg-[var(--studio-panel)] border-b border-[var(--studio-border)] flex items-center justify-between">
                          <span className="font-semibold text-[var(--studio-text)]">
                            Step {step.index + 1}: {step.title}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--studio-muted)]">
                            {step.type}
                          </span>
                        </div>
                        <pre className="p-3 font-mono text-[11px] text-[var(--studio-text)] whitespace-pre-wrap overflow-x-auto leading-relaxed select-text">
                          {step.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--studio-border)] rounded-2xl space-y-2">
                  <Bot className="w-8 h-8 text-[var(--studio-accent)]" />
                  <div className="text-xs font-semibold text-[var(--studio-text)]">
                    Ready to Launch Managed Agent Sandbox
                  </div>
                  <p className="text-xs text-[var(--studio-muted)] max-w-md">
                    Click <strong>Run Antigravity Sandbox Verifier</strong> above to mount{' '}
                    <code>/workspace/game.html</code> and{' '}
                    <code>/workspace/scene_spec.json</code> in a remote Linux container and execute kinematic trajectory verification.
                  </p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'code_inspector' && (
            <div className="h-full flex flex-col bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-[var(--studio-muted-bg)] border-b border-[var(--studio-border)] flex items-center justify-between text-[11px]">
                <span className="font-mono font-medium text-[var(--studio-text)]">
                  synthesized-3d-game.html
                </span>
                <span className="text-[var(--studio-muted)]">
                  Self-contained Three.js HTML5 bundle
                </span>
              </div>
              <textarea
                value={game.standaloneHtmlCode}
                onChange={(e) => onUpdateGameCode(e.target.value)}
                className="flex-1 w-full bg-[var(--studio-panel)] text-[var(--studio-text)] font-mono text-xs p-4 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Clean Right Panel: Render-Watch-Critique Loop, Inferred Spec & Verification */}
        <aside className="w-[300px] bg-[var(--studio-panel)] rounded-2xl border border-[var(--studio-border)] shadow-2xs flex flex-col overflow-y-auto shrink-0 divide-y divide-[var(--studio-divider)] text-[11px]">
          <VisualSelfCritiqueLoopPanel
            game={{ ...game, scene: localScene }}
            captureWebglFrame={() => captureWebglFrameRef.current?.() || ''}
            latestTelemetry={liveTelemetry}
            onApplyPatchedGame={(patchedGame) => {
              setLocalScene(patchedGame.scene);
              onUpdateGameCode(patchedGame.standaloneHtmlCode);
              onUpdateGame?.(patchedGame);
            }}
            onLog={onLog}
          />

          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)]">
                Inferred Game Specification
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-semibold">
                {game.spec.confidenceScore}% Match
              </span>
            </div>
            <p className="text-[var(--studio-muted)] leading-relaxed">
              {game.spec.reasoningSummary}
            </p>
          </div>

          <div className="p-3.5 space-y-2">
            <div className="font-semibold text-[var(--studio-text)]">
              Unspoken Preferences Discovered
            </div>
            <div className="space-y-1.5">
              {game.spec.implicitDesiresDiscovered.map((item, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-[var(--studio-muted-bg)] text-[var(--studio-text)] flex items-start gap-2 leading-snug"
                >
                  <AiSynthIcon className="w-3.5 h-3.5 text-[var(--studio-accent)] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 space-y-2">
            <div className="font-semibold text-[var(--studio-text)]">
              Observed Telemetry Summary
            </div>
            <ul className="space-y-1 text-[var(--studio-muted)]">
              {game.spec.observedBehaviorSummary.map((obs, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[var(--studio-accent)]">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)]">
                Vision-in-the-Loop Polish
              </span>
              <span className="text-[10px] font-mono text-[var(--studio-accent)] bg-[var(--studio-accent-soft)] px-1.5 py-0.5 rounded-md font-semibold">
                Build v{loopIteration}
              </span>
            </div>
            <p className="text-[var(--studio-muted)] leading-relaxed">
              Captures the live WebGL frame, critiques spatial layout &amp; jump arcs with Gemini 4 Argon, and patches the 3D scene in a loop.
            </p>
            <button
              onClick={handleRunVisualCritiqueLoop}
              disabled={isRunningCritiqueLoop}
              className="w-full py-1.5 px-2.5 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <AiSynthIcon className="w-3.5 h-3.5" />
              <span>
                {isRunningCritiqueLoop
                  ? 'Watching & Critiquing Frame...'
                  : `Render → Watch → Critique → Fix (v${loopIteration} → v${Math.min(3, loopIteration + 1)})`}
              </span>
            </button>

            {critiqueHistory.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {critiqueHistory[0].appliedDiffSummary.map((diff, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 font-mono text-[10px]"
                  >
                    {diff}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--studio-text)]">
                Verification Checks
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {game.verificationChecks.filter((c) => c.passed).length}/
                {game.verificationChecks.length} Passed
              </span>
            </div>
            <div className="space-y-1.5">
              {game.verificationChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-center justify-between bg-[var(--studio-muted-bg)] px-2.5 py-1.5 rounded-xl"
                >
                  <span className="flex items-center gap-1.5 text-[var(--studio-text)] font-medium truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{chk.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--studio-muted)] ml-2 shrink-0">
                    {chk.metric}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                await handleRunSandboxAgent();
                setViewMode('agent_sandbox');
              }}
              disabled={isRunningSandbox}
              className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] border border-[var(--studio-border)] text-[var(--studio-text)] text-[10px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Terminal className="w-3 h-3 text-[var(--studio-accent)]" />
              <span>
                {isRunningSandbox
                  ? 'Auditing in Linux Sandbox...'
                  : 'Managed Agent Audit (antigravity-preview-09-2026)'}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
