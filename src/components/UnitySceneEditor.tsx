import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  CanvasNode,
  CanvasScene,
  InferredGameSpec,
  PhysicsProfile,
} from '../types';
import {
  UNITY_SCALE,
  generateUnityCSharpScripts,
  generateUnitySceneYaml,
  nodeToUnityTransform,
  unityTransformToNodePatch,
} from '../services/unityExporter';
import {
  Box,
  Code2,
  Download,
  Layers,
  Move,
  RotateCw,
  Scaling,
  Sparkles,
} from 'lucide-react';

interface UnitySceneEditorProps {
  scene: CanvasScene;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (id: string, patch: Partial<CanvasNode>) => void;
  spec?: InferredGameSpec;
  physics?: PhysicsProfile;
  showInspectorSidebar?: boolean;
}

export const UnitySceneEditor: React.FC<UnitySceneEditorProps> = ({
  scene,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  spec,
  physics,
  showInspectorSidebar = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>(
    'translate'
  );
  const [spaceMode, setSpaceMode] = useState<'world' | 'local'>('world');
  const [gridSnap, setGridSnap] = useState<boolean>(false);
  const [activeExportPreview, setActiveExportPreview] = useState<
    null | 'unity_yaml' | 'csharp_scripts'
  >(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const isDraggingGizmoRef = useRef<boolean>(false);
  const latestSceneRef = useRef<CanvasScene>(scene);
  const onUpdateNodeRef = useRef(onUpdateNode);
  const onSelectNodeRef = useRef(onSelectNode);

  useEffect(() => {
    latestSceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    onUpdateNodeRef.current = onUpdateNode;
    onSelectNodeRef.current = onSelectNode;
  }, [onUpdateNode, onSelectNode]);

  const defaultPhysics: PhysicsProfile = physics ||
    spec?.tunedPhysics || {
      gravity: scene.gravity || 24,
      moveSpeed: 14,
      jumpForce: 13.5,
      dashMultiplier: 2.1,
      doubleJump: true,
      projectileEnabled: true,
      enemyAggroRadius: 12,
      magnetRadius: 5,
      bouncinessMultiplier: 1.35,
    };

  const selectedNode =
    scene.nodes.find((n) => n.id === selectedNodeId) || null;

  // Initialize Three.js Unity Scene View with OrbitControls + TransformControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color('#191b1f');
    threeScene.fog = new THREE.FogExp2('#191b1f', 0.0045);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 600);
    camera.position.set(0, 44, 62);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Unity Scene View Grid & Axes
    const grid = new THREE.GridHelper(120, 40, 0x3b82f6, 0x2c3038);
    grid.position.y = 0.01;
    threeScene.add(grid);

    const axes = new THREE.AxesHelper(8);
    axes.position.set(-46, 0.1, -30);
    threeScene.add(axes);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    threeScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(32, 64, 28);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    threeScene.add(dirLight);

    // OrbitControls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI * 0.49;

    // TransformControls (Unity W / E / R Gizmos)
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.9);
    const gizmoHelper = transform.getHelper();
    threeScene.add(gizmoHelper);
    transformRef.current = transform;

    transform.addEventListener('dragging-changed', (event: any) => {
      const dragging = Boolean(event.value);
      orbit.enabled = !dragging;
      isDraggingGizmoRef.current = dragging;
    });

    transform.addEventListener('objectChange', () => {
      const obj = transform.object as THREE.Mesh | undefined;
      if (!obj || !obj.userData?.nodeId) return;
      const nodeId = obj.userData.nodeId as string;
      const rotYDeg = THREE.MathUtils.radToDeg(-obj.rotation.y);
      const patch = unityTransformToNodePatch(
        {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z,
        },
        rotYDeg,
        {
          x: Math.max(0.4, obj.scale.x),
          y: Math.max(0.3, obj.scale.y),
          z: Math.max(0.4, obj.scale.z),
        },
        latestSceneRef.current.width,
        latestSceneRef.current.height
      );
      onUpdateNodeRef.current(nodeId, patch);
    });

    // Click Raycasting to select GameObjects in the 3D scene
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDraggingGizmoRef.current) return;
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const meshes = Array.from(meshMapRef.current.values());
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        if (hitMesh.userData?.nodeId) {
          onSelectNodeRef.current(hitMesh.userData.nodeId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Unity keyboard shortcuts (W = Move, E = Rotate, R = Scale)
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'w' || e.key === 'W') setGizmoMode('translate');
      if (e.key === 'e' || e.key === 'E') setGizmoMode('rotate');
      if (e.key === 'r' || e.key === 'R') setGizmoMode('scale');
    };
    window.addEventListener('keydown', onKeyDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(threeScene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync gizmo mode, coordinate space, and grid snap
  useEffect(() => {
    const transform = transformRef.current;
    if (!transform) return;
    transform.setMode(gizmoMode);
    transform.setSpace(spaceMode);
    transform.setTranslationSnap(gridSnap ? 1.0 : null);
    transform.setRotationSnap(gridSnap ? THREE.MathUtils.degToRad(15) : null);
    transform.setScaleSnap(gridSnap ? 0.5 : null);
  }, [gizmoMode, spaceMode, gridSnap]);

  // Synchronize CanvasScene nodes -> 3D Unity GameObjects
  useEffect(() => {
    const threeScene = sceneRef.current;
    const transform = transformRef.current;
    if (!threeScene || !transform) return;

    const currentIds = new Set(scene.nodes.filter((n) => n.visible).map((n) => n.id));

    // Remove deleted or hidden meshes
    for (const [id, mesh] of meshMapRef.current.entries()) {
      if (!currentIds.has(id)) {
        if (transform.object === mesh) {
          transform.detach();
        }
        threeScene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        meshMapRef.current.delete(id);
      }
    }

    // Create or update visible GameObjects
    scene.nodes
      .filter((n) => n.visible)
      .forEach((node) => {
        let mesh = meshMapRef.current.get(node.id);
        const shapeKind =
          node.type === 'circle'
            ? 'cylinder'
            : node.type === 'polygon'
            ? 'octa'
            : 'box';

        if (!mesh || mesh.userData.shapeKind !== shapeKind) {
          if (mesh) {
            if (transform.object === mesh) transform.detach();
            threeScene.remove(mesh);
            mesh.geometry.dispose();
          }
          const geom =
            shapeKind === 'cylinder'
              ? new THREE.CylinderGeometry(0.5, 0.5, 1, 24)
              : shapeKind === 'octa'
              ? new THREE.OctahedronGeometry(0.55, 0)
              : new THREE.BoxGeometry(1, 1, 1);

          const mat = new THREE.MeshStandardMaterial({
            color: node.fill || '#38bdf8',
            roughness: node.role === 'platform' ? 0.7 : 0.35,
            metalness: node.role === 'wall' ? 0.5 : 0.2,
          });

          mesh = new THREE.Mesh(geom, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { nodeId: node.id, shapeKind };

          // Subtle wireframe selection cage
          const edges = new THREE.EdgesGeometry(geom);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.22,
            })
          );
          mesh.add(line);

          threeScene.add(mesh);
          meshMapRef.current.set(node.id, mesh);
        }

        // Update color & emissive highlight when selected
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(node.fill || '#38bdf8');
        if (node.id === selectedNodeId) {
          mat.emissive.set('#1d4ed8');
          mat.emissiveIntensity = 0.25;
        } else {
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }

        // Avoid fighting the user's active gizmo drag
        if (!isDraggingGizmoRef.current) {
          const t = nodeToUnityTransform(node, scene.width, scene.height);
          mesh.position.set(t.position.x, t.position.y, t.position.z);
          mesh.scale.set(t.scale.x, t.scale.y, t.scale.z);
          mesh.rotation.set(0, THREE.MathUtils.degToRad(-t.rotation.y), 0);
        }
      });

    // Attach TransformControls gizmo to the active selected GameObject
    if (selectedNodeId && meshMapRef.current.has(selectedNodeId)) {
      const targetMesh = meshMapRef.current.get(selectedNodeId)!;
      if (transform.object !== targetMesh) {
        transform.attach(targetMesh);
      }
    } else {
      transform.detach();
    }
  }, [scene, selectedNodeId]);

  const handleDownloadUnityScene = () => {
    const yaml = generateUnitySceneYaml(scene, defaultPhysics);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.id}.unity`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSharp = () => {
    const fallbackSpec: InferredGameSpec = spec || {
      playerArchetype: 'Kinetic Aerial Vanguard',
      archetypeBadge: 'Unity 3D Controller',
      observedBehaviorSummary: [],
      implicitDesiresDiscovered: [],
      selectedCameraMode: 'third_person_chase',
      winningProbeId: 'kinetic_platformer',
      tunedPhysics: defaultPhysics,
      coreMechanics: [],
      winCondition: 'Reach Goal Portal',
      loseCondition: 'Hazard Collision',
      dynamicDifficultyAdjustment: 'Balanced',
      levelEnhancements: [],
      audioVisualDirection: {
        skyboxTheme: 'Cyberpunk',
        particleDensity: 'high',
        announcerVoiceLine: '',
        announcerStyle: '',
      },
      confidenceScore: 95,
      modelUsed: 'gemini-4-argon',
      latencyMs: 320,
    };
    const scripts = generateUnityCSharpScripts(scene, fallbackSpec);
    const bundle = `${scripts.playerControllerCs}\n\n// ==========================================\n\n${scripts.sceneManagerCs}\n\n// ==========================================\n\n${scripts.webglBridgeJslib}`;
    const blob = new Blob([bundle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ArgonUnityScripts-${scene.id}.cs`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedTransform = selectedNode
    ? nodeToUnityTransform(selectedNode, scene.width, scene.height)
    : null;

  return (
    <div className="h-full w-full flex min-h-0 bg-[#191b1f] text-[#e5e7eb] rounded-xl overflow-hidden border border-[#2e323b] relative">
      {/* Main 3D Unity Scene Viewport */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Unity Editor Top Gizmo & Export Toolbar */}
        <div className="h-10 bg-[#23262d] border-b border-[#323640] px-3 flex items-center justify-between gap-2 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px]">
              Unity 3D Engine Mode (0 MB Local Disk)
            </span>

            <div className="h-4 w-px bg-[#363b47] mx-1" />

            {/* W / E / R Transform Gizmo Buttons */}
            <button
              onClick={() => setGizmoMode('translate')}
              title="Move Tool (W)"
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                gizmoMode === 'translate'
                  ? 'bg-[#0d99ff] text-white font-semibold'
                  : 'bg-[#2c303a] text-gray-300 hover:bg-[#363b47]'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>Move (W)</span>
            </button>
            <button
              onClick={() => setGizmoMode('rotate')}
              title="Rotate Tool (E)"
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                gizmoMode === 'rotate'
                  ? 'bg-[#0d99ff] text-white font-semibold'
                  : 'bg-[#2c303a] text-gray-300 hover:bg-[#363b47]'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>Rotate (E)</span>
            </button>
            <button
              onClick={() => setGizmoMode('scale')}
              title="Scale / Extrude Tool (R)"
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer ${
                gizmoMode === 'scale'
                  ? 'bg-[#0d99ff] text-white font-semibold'
                  : 'bg-[#2c303a] text-gray-300 hover:bg-[#363b47]'
              }`}
            >
              <Scaling className="w-3 h-3" />
              <span>Scale (R)</span>
            </button>

            <button
              onClick={() =>
                setSpaceMode(spaceMode === 'world' ? 'local' : 'world')
              }
              className="px-2 py-1 rounded bg-[#2c303a] hover:bg-[#363b47] text-gray-300 font-mono text-[10px] cursor-pointer"
            >
              {spaceMode === 'world' ? 'Global' : 'Local'}
            </button>

            <button
              onClick={() => setGridSnap(!gridSnap)}
              className={`px-2 py-1 rounded font-mono text-[10px] cursor-pointer ${
                gridSnap
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#2c303a] text-gray-400 hover:bg-[#363b47]'
              }`}
            >
              Snap: {gridSnap ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Right Unity Scene (.unity) & C# MonoBehaviour Exporters */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setActiveExportPreview(
                  activeExportPreview === 'unity_yaml' ? null : 'unity_yaml'
                )
              }
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2c303a] hover:bg-[#363b47] text-gray-200 text-[10px] cursor-pointer"
            >
              <Code2 className="w-3 h-3 text-sky-400" />
              <span>Inspect .unity / C#</span>
            </button>
            <button
              onClick={handleDownloadUnityScene}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0d99ff] hover:bg-[#0b84de] text-white font-medium text-[10px] cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export .unity Scene</span>
            </button>
            <button
              onClick={handleDownloadCSharp}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export C# Scripts</span>
            </button>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div ref={mountRef} className="flex-1 w-full h-full relative" />

        {/* Bottom HUD Hint */}
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 bg-black/65 backdrop-blur-xs border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-gray-300">
          <span>
            <strong>Left-Click</strong> GameObject to attach Unity Gizmo •{' '}
            <strong>W/E/R</strong> Move/Rotate/Scale •{' '}
            <strong>Right-Drag / Scroll</strong> Orbit & Zoom • Syncs live with 2D Figma
          </span>
        </div>

        {/* Code Preview Overlay for .unity YAML and C# MonoBehaviour Scripts */}
        {activeExportPreview && (
          <div className="absolute inset-x-4 top-12 bottom-12 bg-[#141619]/95 backdrop-blur-md border border-[#363b47] rounded-xl flex flex-col z-20 shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#20232a] border-b border-[#323640] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveExportPreview('unity_yaml')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeExportPreview === 'unity_yaml'
                      ? 'bg-[#0d99ff] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {scene.id}.unity (YAML Scene)
                </button>
                <button
                  onClick={() => setActiveExportPreview('csharp_scripts')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeExportPreview === 'csharp_scripts'
                      ? 'bg-[#0d99ff] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ArgonPlayerController.cs & ArgonSceneManager.cs
                </button>
              </div>
              <button
                onClick={() => setActiveExportPreview(null)}
                className="px-2.5 py-1 rounded bg-[#2c303a] hover:bg-[#363b47] text-gray-200 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
            <pre className="flex-1 p-4 overflow-auto font-mono text-[11px] text-emerald-300 leading-relaxed select-text">
              {activeExportPreview === 'unity_yaml'
                ? generateUnitySceneYaml(scene, defaultPhysics)
                : (() => {
                    const fallbackSpec: InferredGameSpec = spec || {
                      playerArchetype: 'Kinetic Aerial Vanguard',
                      archetypeBadge: 'Unity 3D Controller',
                      observedBehaviorSummary: [],
                      implicitDesiresDiscovered: [],
                      selectedCameraMode: 'third_person_chase',
                      winningProbeId: 'kinetic_platformer',
                      tunedPhysics: defaultPhysics,
                      coreMechanics: [],
                      winCondition: 'Reach Goal Portal',
                      loseCondition: 'Hazard Collision',
                      dynamicDifficultyAdjustment: 'Balanced',
                      levelEnhancements: [],
                      audioVisualDirection: {
                        skyboxTheme: 'Cyberpunk',
                        particleDensity: 'high',
                        announcerVoiceLine: '',
                        announcerStyle: '',
                      },
                      confidenceScore: 95,
                      modelUsed: 'gemini-4-argon',
                      latencyMs: 320,
                    };
                    const s = generateUnityCSharpScripts(scene, fallbackSpec);
                    return `${s.playerControllerCs}\n\n${s.sceneManagerCs}\n\n${s.webglBridgeJslib}`;
                  })()}
            </pre>
          </div>
        )}
      </div>

      {/* Right Unity Hierarchy + Component Inspector Sidebar */}
      {showInspectorSidebar && (
        <aside className="w-[270px] bg-[#21242b] border-l border-[#323640] flex flex-col overflow-y-auto shrink-0 text-[11px] divide-y divide-[#2e323b]">
          {/* GameObject Hierarchy */}
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0d99ff]" />
                <span>Unity Hierarchy ({scene.nodes.length})</span>
              </span>
              <span className="font-mono text-[9px] text-emerald-400">
                Scene.unity
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
              {scene.nodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onSelectNode(n.id)}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between text-[11px] transition cursor-pointer ${
                    n.id === selectedNodeId
                      ? 'bg-[#0d99ff] text-white font-medium'
                      : 'text-gray-300 hover:bg-[#2c303a]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Box className="w-3 h-3 shrink-0 opacity-75" />
                    <span className="truncate">{n.name}</span>
                  </span>
                  <span className="text-[9px] font-mono opacity-75 ml-1 shrink-0">
                    {n.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected GameObject Component Inspector */}
          {selectedNode && selectedTransform ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white truncate">
                  {selectedNode.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#2c303a] text-sky-300">
                  Tag: {selectedNode.role === 'player_spawn' ? 'Player' : 'GameObject'}
                </span>
              </div>

              {/* Transform Component */}
              <div className="p-2.5 rounded-lg bg-[#191b1f] border border-[#2e323b] space-y-2">
                <div className="text-[10px] font-semibold text-gray-300 flex items-center justify-between">
                  <span>Transform (Unity World)</span>
                  <span className="font-mono text-[9px] text-gray-500">!u!4</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="bg-[#23262d] px-2 py-1 rounded">
                    <span className="text-rose-400 font-mono mr-1">X</span>
                    <span className="font-mono">{selectedTransform.position.x}</span>
                  </div>
                  <div className="bg-[#23262d] px-2 py-1 rounded">
                    <span className="text-emerald-400 font-mono mr-1">Y</span>
                    <span className="font-mono">{selectedTransform.position.y}</span>
                  </div>
                  <div className="bg-[#23262d] px-2 py-1 rounded">
                    <span className="text-sky-400 font-mono mr-1">Z</span>
                    <span className="font-mono">{selectedTransform.position.z}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <label className="space-y-0.5">
                    <span className="text-[9px] text-gray-400">
                      Elevation Y ({selectedNode.elevation}px)
                    </span>
                    <input
                      type="number"
                      value={selectedNode.elevation}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          elevation: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full bg-[#23262d] border border-[#323640] rounded px-2 py-1 text-[10px] font-mono text-white"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[9px] text-gray-400">
                      Extrude H ({selectedNode.extrudeHeight}px)
                    </span>
                    <input
                      type="number"
                      value={selectedNode.extrudeHeight}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          extrudeHeight: Math.max(4, Number(e.target.value) || 4),
                        })
                      }
                      className="w-full bg-[#23262d] border border-[#323640] rounded px-2 py-1 text-[10px] font-mono text-white"
                    />
                  </label>
                </div>
              </div>

              {/* Collider + Rigidbody Component */}
              <div className="p-2.5 rounded-lg bg-[#191b1f] border border-[#2e323b] space-y-1.5">
                <div className="text-[10px] font-semibold text-gray-300 flex items-center justify-between">
                  <span>
                    {selectedNode.type === 'circle'
                      ? 'SphereCollider & Rigidbody'
                      : 'BoxCollider & Rigidbody'}
                  </span>
                  <span className="font-mono text-[9px] text-gray-500">!u!65 / !u!54</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Physics Body:</span>
                  <span className="font-mono text-emerald-300 uppercase">
                    {selectedNode.physics}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Is Trigger (Sensor):</span>
                  <span className="font-mono text-gray-200">
                    {selectedNode.physics === 'sensor' ? 'true' : 'false'}
                  </span>
                </div>
              </div>

              {/* Attached C# MonoBehaviour */}
              <div className="p-2.5 rounded-lg bg-[#191b1f] border border-[#2e323b] space-y-1">
                <div className="text-[10px] font-semibold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>MonoBehaviour (C#)</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {selectedNode.role === 'player_spawn'
                    ? 'ArgonPlayerController.cs'
                    : 'ArgonSceneManager.cs'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-gray-400 text-center">
              Click any 3D GameObject in the viewport to inspect its Unity Transform & Components.
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
