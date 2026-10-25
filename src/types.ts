export type GameRole =
  | 'player_spawn'
  | 'platform'
  | 'wall'
  | 'hazard'
  | 'enemy_patrol'
  | 'collectible'
  | 'jump_pad'
  | 'goal_portal'
  | 'movable_crate'
  | 'decoration';

export type NodeShapeType = 'rect' | 'circle' | 'polygon' | 'path' | 'text';

export type PhysicsType = 'static' | 'dynamic' | 'kinematic' | 'sensor';

export interface CanvasNode {
  id: string;
  name: string;
  type: NodeShapeType;
  role: GameRole;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  extrudeHeight: number;
  elevation: number;
  physics: PhysicsType;
  bounciness: number;
  speed: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  textureUrl?: string;
  texturePrompt?: string;
  behaviorNote?: string;
  visible: boolean;
  locked: boolean;
}

export interface CanvasScene {
  id: string;
  title: string;
  theme: 'cyberpunk' | 'sky_isles' | 'dungeon' | 'custom';
  width: number;
  height: number;
  backgroundColor: string;
  ambientLight: string;
  fogColor: string;
  gravity: number;
  designNotes: string;
  nodes: CanvasNode[];
}

export type CameraPerspective =
  | 'third_person_chase'
  | 'isometric_tactical'
  | 'top_down_action';

export interface PhysicsProfile {
  gravity: number;
  moveSpeed: number;
  jumpForce: number;
  dashMultiplier: number;
  doubleJump: boolean;
  projectileEnabled: boolean;
  enemyAggroRadius: number;
  magnetRadius: number;
  bouncinessMultiplier: number;
}

export interface MicroDemoVariant {
  id: 'kinetic_platformer' | 'tactical_isometric' | 'arcade_arena';
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  cameraMode: CameraPerspective;
  physicsProfile: PhysicsProfile;
  durationSeconds: number;
  hypothesis: string;
  controlsHint: string;
  generatedByModel: string;
}

export interface GameplayTelemetry {
  variantId: MicroDemoVariant['id'];
  variantTitle: string;
  playDurationSec: number;
  totalKeyPresses: number;
  apm: number;
  jumpCount: number;
  dashOrActionCount: number;
  projectilesFired: number;
  airborneRatio: number;
  explorationCoverage: number;
  collectiblesGathered: number;
  totalCollectibles: number;
  hazardCollisions: number;
  jumpPadUses: number;
  enemiesEvadedOrHit: number;
  goalReached: boolean;
  timeToGoalSec: number | null;
  averageSpeed: number;
  heatmapPoints: Array<{ x: number; z: number; weight: number }>;
  actionTimeline: Array<{ timeSec: number; event: string; type: 'move' | 'jump' | 'dash' | 'collect' | 'hazard' | 'goal' }>;
  userRating: 'loved' | 'neutral' | 'disliked' | null;
  engagementScore: number;
}

export interface InferredGameSpec {
  playerArchetype: string;
  archetypeBadge: string;
  observedBehaviorSummary: string[];
  implicitDesiresDiscovered: string[];
  selectedCameraMode: CameraPerspective;
  winningProbeId: MicroDemoVariant['id'];
  tunedPhysics: PhysicsProfile;
  coreMechanics: string[];
  winCondition: string;
  loseCondition: string;
  dynamicDifficultyAdjustment: string;
  levelEnhancements: Array<{
    targetRole: GameRole;
    enhancement: string;
    multiplier: number;
  }>;
  audioVisualDirection: {
    skyboxTheme: string;
    particleDensity: 'low' | 'medium' | 'high';
    announcerVoiceLine: string;
    announcerStyle: string;
  };
  confidenceScore: number;
  reasoningSummary?: string;
  interactionId?: string;
  modelUsed: string;
  latencyMs: number;
}

export interface VerificationCheck {
  id: string;
  name: string;
  category: 'syntax' | 'webgl' | 'entities' | 'controls' | 'performance';
  passed: boolean;
  detail: string;
  metric?: string;
}

export interface Generated3DGame {
  id: string;
  title: string;
  subtitle: string;
  spec: InferredGameSpec;
  scene: CanvasScene;
  standaloneHtmlCode: string;
  verificationChecks: VerificationCheck[];
  announcerAudioBase64?: string;
  announcerMimeType?: string;
  interactionId?: string;
  modelUsed: string;
  thinkingLevel: 'low' | 'medium' | 'high';
  generationLatencyMs: number;
  totalTokens: number;
  createdAt: string;
}

export type ThinkingLevel = 'low' | 'medium' | 'high';

export interface ArsenalModelConfig {
  id: string;
  modelId: string;
  displayName: string;
  category: 'frontier_orchestrator' | 'fast_subagent' | 'low_latency_router' | 'open_weights' | 'multimodal_companion';
  thinkingLevel?: ThinkingLevel;
  description: string;
  recommendedJob: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: string;
  badgeColor: string;
}

export interface ModelEvalResult {
  configId: string;
  modelId: string;
  displayName: string;
  thinkingLevel?: ThinkingLevel;
  status: 'idle' | 'running' | 'completed' | 'failed';
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  // Rubric metrics (0-100)
  spatialFidelityScore: number;
  specAlignmentScore: number;
  codeCompilationScore: number;
  botPlayabilityScore: number;
  visualPolishScore: number;
  overallScore: number;
  fpsMeasured: number;
  entityCountRendered: number;
  runtimeErrors: number;
  botTelemetrySummary: {
    simulatedDurationSec: number;
    framesRendered: number;
    collectiblesPickedByBot: number;
    goalReachedByBot: boolean;
  };
  argonJudgeVerdict: string;
  generatedHtmlSnippet: string;
  generatedPhysics: PhysicsProfile;
  cameraMode: CameraPerspective;
  isLiveApiCall: boolean;
}

export interface ManagedAgentStepLog {
  index: number;
  type:
    | 'thought'
    | 'code_execution_call'
    | 'code_execution_result'
    | 'google_search_call'
    | 'model_output';
  title: string;
  content: string;
  language?: string;
  isError?: boolean;
}

export interface ManagedAgentRunResult {
  interactionId: string;
  environmentId?: string;
  agentUsed: string;
  status: string;
  outputText: string;
  steps: ManagedAgentStepLog[];
  verificationChecks: VerificationCheck[];
  tunedPhysicsPatch?: Partial<PhysicsProfile>;
  latencyMs: number;
  tokensUsed?: number;
  isLiveApiCall: boolean;
}

export interface InteractionLogEntry {
  id: string;
  timestamp: string;
  model: string;
  thinkingLevel?: string;
  stage:
    | 'canvas_vision'
    | 'micro_demo_gen'
    | 'telemetry_inference'
    | 'full_game_synth'
    | 'texture_gen'
    | 'tts_voice'
    | 'eval_benchmark'
    | 'managed_agent_sandbox'
    | 'deep_research_bg'
    | 'custom_agent_create';
  interactionId?: string;
  previousInteractionId?: string;
  latencyMs: number;
  status: 'success' | 'fallback_simulated' | 'error';
  summary: string;
  tokensUsed?: number;
}
