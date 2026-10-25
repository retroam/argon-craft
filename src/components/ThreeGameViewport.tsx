import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CameraPerspective,
  CanvasScene,
  GameplayTelemetry,
  MicroDemoVariant,
  PhysicsProfile,
} from '../types';
import { sfx } from '../utils/soundEffects';
import {
  Bot,
  Compass,
  Flame,
  Maximize2,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface ThreeGameViewportProps {
  scene: CanvasScene;
  variantId: MicroDemoVariant['id'];
  variantTitle: string;
  cameraMode: CameraPerspective;
  physics: PhysicsProfile;
  durationSeconds?: number; // e.g., 20 for micro-demos, undefined/0 for full game
  isFullGame?: boolean;
  autoBotEnabled?: boolean;
  onTelemetryUpdate?: (telemetry: GameplayTelemetry) => void;
  onDemoComplete?: (telemetry: GameplayTelemetry) => void;
  onReadyCapture?: (capturePng: () => string) => void;
}

export const ThreeGameViewport: React.FC<ThreeGameViewportProps> = ({
  scene,
  variantId,
  variantTitle,
  cameraMode,
  physics,
  durationSeconds = 20,
  isFullGame = false,
  autoBotEnabled = false,
  onTelemetryUpdate,
  onDemoComplete,
  onReadyCapture,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds || 0);
  const [score, setScore] = useState<number>(0);
  const totalShards = scene.nodes.filter(
    (n) => n.visible && n.role === 'collectible'
  ).length;
  const [shieldHp, setShieldHp] = useState<number>(100);
  const [combo, setCombo] = useState<number>(1);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [goalReached, setGoalReached] = useState<boolean>(false);
  const [botActive, setBotActive] = useState<boolean>(autoBotEnabled);
  const [muted, setMuted] = useState<boolean>(false);
  const [runKey, setRunKey] = useState<number>(0);
  const [liveApm, setLiveApm] = useState<number>(0);
  const [lastEventBanner, setLastEventBanner] = useState<string>(
    'Move with WASD/Arrows • SPACE to Jump • SHIFT to Dash/Pulse'
  );

  const botActiveRef = useRef<boolean>(autoBotEnabled);
  useEffect(() => {
    botActiveRef.current = botActive;
  }, [botActive]);

  const toggleMute = () => {
    sfx.muted = !muted;
    setMuted(!muted);
  };

  const restartRun = () => {
    setIsFinished(false);
    setGoalReached(false);
    setScore(0);
    setShieldHp(100);
    setCombo(1);
    setTimeLeft(durationSeconds || 0);
    setRunKey((prev) => prev + 1);
  };

  useEffect(() => {
    restartRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, scene.id, scene.nodes.length, cameraMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    onReadyCapture?.(() => {
      try {
        return renderer.domElement.toDataURL('image/png');
      } catch {
        return '';
      }
    });

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(scene.backgroundColor || '#090d16');
    threeScene.fog = new THREE.FogExp2(scene.fogColor || '#0f172a', 0.0075);

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 900);

    // Lighting
    const ambient = new THREE.AmbientLight(scene.ambientLight || '#38bdf8', 0.7);
    threeScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(45, 85, 55);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    threeScene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 1.5, 60);
    pointLight.position.set(0, 20, 0);
    threeScene.add(pointLight);

    // Floor Grid & Starfield Particles
    const grid = new THREE.GridHelper(130, 36, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.05;
    threeScene.add(grid);

    const starGeo = new THREE.BufferGeometry();
    const starCount = isFullGame ? 320 : 140;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 160;
      starPositions[i + 1] = Math.random() * 55 + 2;
      starPositions[i + 2] = (Math.random() - 0.5) * 160;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.45,
      transparent: true,
      opacity: 0.7,
    });
    const stars = new THREE.Points(starGeo, starMat);
    threeScene.add(stars);

    // Coordinate mapping from 2D Figma canvas (800x540) -> 3D world (-48..48, -32..32)
    const scale = 0.12;
    const offsetX = -scene.width * scale * 0.5;
    const offsetZ = -scene.height * scale * 0.5;

    const textureLoader = new THREE.TextureLoader();

    interface PlatformBody {
      mesh: THREE.Mesh;
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      topY: number;
      bottomY: number;
      role: string;
      isDynamicCrate?: boolean;
      halfW: number;
      halfD: number;
    }

    const platforms: PlatformBody[] = [];
    const collectibles: Array<{
      mesh: THREE.Mesh;
      ring: THREE.Mesh;
      collected: boolean;
      baseY: number;
    }> = [];
    const hazards: Array<{
      mesh: THREE.Mesh;
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      topY: number;
    }> = [];
    const jumpPads: Array<{
      mesh: THREE.Mesh;
      x: number;
      y: number;
      z: number;
      radius: number;
      boost: number;
    }> = [];
    const enemies: Array<{
      mesh: THREE.Mesh;
      originX: number;
      originZ: number;
      y: number;
      speed: number;
      phase: number;
      stunTimer: number;
    }> = [];
    const projectiles: Array<{
      mesh: THREE.Mesh;
      vx: number;
      vz: number;
      life: number;
    }> = [];

    let goalPortalMesh: THREE.Mesh | null = null;
    let goalCoreMesh: THREE.Mesh | null = null;
    const spawnPos = new THREE.Vector3(-25, 4, 15);

    scene.nodes.forEach((node) => {
      if (!node.visible) return;
      const w = Math.max(1.2, node.width * scale);
      const d = Math.max(1.2, node.height * scale);
      const h = Math.max(0.5, (node.extrudeHeight || 16) * 0.12);
      const elev = (node.elevation || 0) * 0.12;
      const cx = (node.x + node.width * 0.5) * scale + offsetX;
      const cz = (node.y + node.height * 0.5) * scale + offsetZ;

      let customMap: THREE.Texture | undefined;
      if (node.textureUrl) {
        customMap = textureLoader.load(node.textureUrl);
        customMap.wrapS = THREE.RepeatWrapping;
        customMap.wrapT = THREE.RepeatWrapping;
      }

      if (node.role === 'player_spawn') {
        spawnPos.set(cx, elev + 2.6, cz);
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(w * 0.5, w * 0.65, 0.45, 24),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.75,
          })
        );
        pad.position.set(cx, elev + 0.22, cz);
        threeScene.add(pad);
      } else if (
        node.role === 'platform' ||
        node.role === 'wall' ||
        node.role === 'movable_crate' ||
        node.role === 'decoration'
      ) {
        const geo =
          node.type === 'circle'
            ? new THREE.CylinderGeometry(w * 0.5, w * 0.5, h, 28)
            : new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
          color: customMap ? 0xffffff : node.fill || '#334155',
          ...(customMap ? { map: customMap } : {}),
          roughness: 0.35,
          metalness: 0.35,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, elev + h * 0.5, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        threeScene.add(mesh);

        // Subtle glowing wireframe rim for readability
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: node.stroke || '#38bdf8',
            transparent: true,
            opacity: 0.85,
          })
        );
        mesh.add(line);

        // If this is a Woodland Pine Tree decoration, add 3 stacked emerald pine foliage cones!
        if (node.role === 'decoration') {
          const foliageMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a,
            emissive: 0x14532d,
            emissiveIntensity: 0.35,
            roughness: 0.55,
          });
          [0, 1, 2].forEach((tier) => {
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(
                Math.max(1.8, w * (0.65 - tier * 0.14)),
                3.6 - tier * 0.4,
                12
              ),
              foliageMat
            );
            cone.position.y = h * 0.5 + 1.4 + tier * 2.1;
            cone.castShadow = true;
            mesh.add(cone);
          });
        }

        platforms.push({
          mesh,
          minX: cx - w * 0.5,
          maxX: cx + w * 0.5,
          minZ: cz - d * 0.5,
          maxZ: cz + d * 0.5,
          topY: elev + h,
          bottomY: elev,
          role: node.role,
          isDynamicCrate: node.role === 'movable_crate',
          halfW: w * 0.5,
          halfD: d * 0.5,
        });
      } else if (node.role === 'collectible') {
        // 3D Golden Acorn / Nut (Golden Nut Body + Dark Oak Acorn Cap + Stem)
        const nutGeo = new THREE.SphereGeometry(0.78, 20, 20);
        nutGeo.scale(1.0, 1.25, 1.0);
        const nutMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.75,
          metalness: 0.68,
          roughness: 0.18,
        });
        const mesh = new THREE.Mesh(nutGeo, nutMat);
        mesh.position.set(cx, elev + 1.85, cz);
        mesh.castShadow = true;

        // Oak Acorn Cap (Beret)
        const capGeo = new THREE.CylinderGeometry(0.58, 0.92, 0.52, 18);
        const capMat = new THREE.MeshStandardMaterial({
          color: 0x78350f,
          roughness: 0.7,
          metalness: 0.15,
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.y = 0.62;
        mesh.add(capMesh);

        // Acorn Wooden Stem
        const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.42, 8);
        const stemMesh = new THREE.Mesh(stemGeo, capMat);
        stemMesh.position.set(0.05, 0.98, 0);
        stemMesh.rotation.z = -0.22;
        mesh.add(stemMesh);

        threeScene.add(mesh);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.05, 1.35, 24),
          new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
          })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(cx, elev + 0.35, cz);
        threeScene.add(ring);

        collectibles.push({
          mesh,
          ring,
          collected: false,
          baseY: elev + 1.85,
        });
      } else if (node.role === 'hazard') {
        const geo = new THREE.BoxGeometry(w, 0.55, d);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 0.95,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, elev + 0.28, cz);
        threeScene.add(mesh);
        hazards.push({
          mesh,
          minX: cx - w * 0.5,
          maxX: cx + w * 0.5,
          minZ: cz - d * 0.5,
          maxZ: cz + d * 0.5,
          topY: elev + 0.9,
        });
      } else if (node.role === 'jump_pad') {
        // Sonic-style Star / Mushroom Bounce Spring Pad
        const geo = new THREE.CylinderGeometry(w * 0.52, w * 0.42, 0.68, 24);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xe11d48,
          emissive: 0xbe123c,
          emissiveIntensity: 0.75,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, elev + 0.42, cz);

        // Golden Star Ring on top of Bounce Pad
        const starRing = new THREE.Mesh(
          new THREE.TorusGeometry(w * 0.34, 0.12, 10, 24),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        starRing.rotation.x = Math.PI / 2;
        starRing.position.y = 0.36;
        mesh.add(starRing);

        threeScene.add(mesh);
        jumpPads.push({
          mesh,
          x: cx,
          y: elev + 0.7,
          z: cz,
          radius: Math.max(2.0, w * 0.58),
          boost: (node.bounciness || 1.9) * (physics.bouncinessMultiplier || 1.15),
        });
      } else if (node.role === 'enemy_patrol') {
        // Sonic-style Mecha-Pinecone Badnik Patrol Bot
        const geo = new THREE.ConeGeometry(1.2, 2.4, 8);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 0.75,
          metalness: 0.45,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, elev + 1.4, cz);
        mesh.castShadow = true;
        threeScene.add(mesh);
        enemies.push({
          mesh,
          originX: cx,
          originZ: cz,
          y: elev + 1.4,
          speed: node.speed || 1.4,
          phase: Math.random() * Math.PI * 2,
          stunTimer: 0,
        });
      } else if (node.role === 'goal_portal') {
        // Giant Sonic-Style Golden Goal Ring + Acorn Shrine
        const torusGeo = new THREE.TorusGeometry(2.35, 0.42, 18, 44);
        const torusMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xd97706,
          emissiveIntensity: 1.05,
          metalness: 0.8,
          roughness: 0.15,
        });
        goalPortalMesh = new THREE.Mesh(torusGeo, torusMat);
        goalPortalMesh.position.set(cx, elev + 2.8, cz);
        threeScene.add(goalPortalMesh);

        const coreGeo = new THREE.CircleGeometry(1.95, 32);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });
        goalCoreMesh = new THREE.Mesh(coreGeo, coreMat);
        goalCoreMesh.position.set(cx, elev + 2.8, cz);
        threeScene.add(goalCoreMesh);

        // Tall vertical golden beacon beam so player can spot the Goal Ring across the canyon
        const beaconGeo = new THREE.CylinderGeometry(0.35, 1.6, 26, 20, 1, true);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(cx, elev + 13, cz);
        threeScene.add(beaconMesh);
        pointLight.position.set(cx, elev + 6, cz);
      }
    });

    // 3D Turbo Squirrel Avatar + Sonic Spin-Dash Ball
    const playerGroup = new THREE.Group();
    const squirrelVisualGroup = new THREE.Group();

    const furMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0x9a3412,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.5,
    });
    const darkFurMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.55,
    });

    // Squirrel Torso
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 20), furMat);
    bodyMesh.scale.set(0.95, 1.15, 1.15);
    bodyMesh.position.set(0, -0.05, 0);
    bodyMesh.castShadow = true;
    squirrelVisualGroup.add(bodyMesh);

    // Cream Belly Patch
    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 16), creamMat);
    bellyMesh.scale.set(0.8, 1.0, 0.75);
    bellyMesh.position.set(0, -0.08, 0.38);
    squirrelVisualGroup.add(bellyMesh);

    // Squirrel Head
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 20), furMat);
    headMesh.position.set(0, 0.78, 0.28);
    headMesh.castShadow = true;
    squirrelVisualGroup.add(headMesh);

    // Pointed Squirrel Ears (Left & Right)
    const earGeo = new THREE.ConeGeometry(0.22, 0.55, 10);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(-0.36, 1.32, 0.18);
    leftEar.rotation.z = 0.22;
    squirrelVisualGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(0.36, 1.32, 0.18);
    rightEar.rotation.z = -0.22;
    squirrelVisualGroup.add(rightEar);

    // Cute Snout & Nose + Eyes
    const noseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x1c1917 })
    );
    noseMesh.position.set(0, 0.78, 0.88);
    squirrelVisualGroup.add(noseMesh);

    const eyeGeo = new THREE.SphereGeometry(0.1, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.23, 0.9, 0.78);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.23, 0.9, 0.78);
    squirrelVisualGroup.add(leftEye, rightEye);

    // Sonic-style Cobalt Speed Headband / Visor
    const headband = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.08, 10, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    headband.rotation.x = Math.PI / 2 - 0.2;
    headband.position.set(0, 1.02, 0.28);
    squirrelVisualGroup.add(headband);

    // Giant Fluffy Curled 3D Squirrel Tail (3 overlapping segments curving up in back)
    const squirrelTailGroup = new THREE.Group();
    const tailBase = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 16), furMat);
    tailBase.position.set(0, 0.15, -0.75);
    const tailMid = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 18), furMat);
    tailMid.position.set(0, 0.82, -1.15);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 16), darkFurMat);
    tailTip.position.set(0, 1.48, -0.92);
    squirrelTailGroup.add(tailBase, tailMid, tailTip);
    squirrelVisualGroup.add(squirrelTailGroup);

    playerGroup.add(squirrelVisualGroup);

    // Sonic Spin-Dash Ball (shown when jumping / spin-dashing)
    const spinBallMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        wireframe: false,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
    spinBallMesh.visible = false;
    playerGroup.add(spinBallMesh);

    const playerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.09, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xfde047 })
    );
    playerHalo.rotation.x = Math.PI / 2;
    playerGroup.add(playerHalo);

    playerGroup.position.copy(spawnPos);
    threeScene.add(playerGroup);

    // Initialize camera position immediately so frame 1 frames the entire 3D arena
    if (cameraMode === 'isometric_tactical') {
      camera.position.set(spawnPos.x - 16, spawnPos.y + 28, spawnPos.z + 24);
    } else if (cameraMode === 'top_down_action') {
      camera.position.set(spawnPos.x * 0.5, spawnPos.y + 38, spawnPos.z * 0.5 + 18);
    } else {
      camera.position.set(spawnPos.x - 12, spawnPos.y + 14, spawnPos.z + 18);
    }
    camera.lookAt(spawnPos.x * 0.35, spawnPos.y + 2.5, spawnPos.z * 0.35);

    // Telemetry state
    const startTime = performance.now();
    let totalKeyPresses = 0;
    let jumpCount = 0;
    let dashOrActionCount = 0;
    let projectilesFired = 0;
    let airborneTimeSec = 0;
    let totalTimeSec = 0;
    let collectiblesGathered = 0;
    let hazardCollisions = 0;
    let jumpPadUses = 0;
    let enemiesEvadedOrHit = 0;
    let finishTriggered = false;
    let timeToGoalSec: number | null = null;
    let distanceTraveled = 0;
    const visitedCells = new Set<string>();
    const heatmapMap = new Map<string, { x: number; z: number; weight: number }>();
    const actionTimeline: GameplayTelemetry['actionTimeline'] = [];

    const recordEvent = (
      event: string,
      type: GameplayTelemetry['actionTimeline'][number]['type']
    ) => {
      const tSec = Number(((performance.now() - startTime) / 1000).toFixed(1));
      actionTimeline.push({ timeSec: tSec, event, type });
      setLastEventBanner(event);
    };

    // Physics state
    const keys: Record<string, boolean> = {};
    let velY = 0;
    let dashBoostTimer = 0;
    let invulnTimer = 0;
    let jumpsRemaining = physics.doubleJump ? 2 : 1;
    let lastFacing = new THREE.Vector2(1, 0);

    const triggerJump = () => {
      if (finishTriggered) return;
      if (jumpsRemaining > 0) {
        velY = physics.jumpForce || 12.5;
        jumpsRemaining--;
        jumpCount++;
        sfx.playJump();
        recordEvent(
          jumpsRemaining === 0 && physics.doubleJump
            ? 'Double-Jump Boost Activated!'
            : 'Jump Impulse',
          'jump'
        );
      }
    };

    const triggerDashOrPulse = () => {
      if (finishTriggered) return;
      dashOrActionCount++;
      dashBoostTimer = 0.26;
      sfx.playDashOrPulse();

      // Fire a plasma pulse projectile in facing direction
      const projMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      projMesh.position.copy(playerGroup.position);
      threeScene.add(projMesh);
      projectiles.push({
        mesh: projMesh,
        vx: lastFacing.x * 34,
        vz: lastFacing.y * 34,
        life: 1.4,
      });
      projectilesFired++;
      recordEvent('Air-Dash + Plasma Pulse Fired!', 'dash');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (!keys[e.code]) {
        totalKeyPresses++;
      }
      keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyE'
      ) {
        e.preventDefault();
        triggerDashOrPulse();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const buildTelemetrySnapshot = (hasReachedGoal: boolean): GameplayTelemetry => {
      const elapsed = Math.max(1, (performance.now() - startTime) / 1000);
      const apm = Math.round((totalKeyPresses / elapsed) * 60);
      const explorationCoverage = Math.min(100, Math.round((visitedCells.size / 38) * 100));
      const airborneRatio = Number(Math.min(1, airborneTimeSec / elapsed).toFixed(2));
      const engagementScore = Math.min(
        100,
        Math.round(
          25 +
            Math.min(25, apm * 0.2) +
            collectiblesGathered * 12 +
            jumpCount * 3 +
            dashOrActionCount * 4 +
            (hasReachedGoal ? 22 : 0)
        )
      );

      return {
        variantId,
        variantTitle,
        playDurationSec: Number(elapsed.toFixed(1)),
        totalKeyPresses,
        apm,
        jumpCount,
        dashOrActionCount,
        projectilesFired,
        airborneRatio,
        explorationCoverage,
        collectiblesGathered,
        totalCollectibles: collectibles.length,
        hazardCollisions,
        jumpPadUses,
        enemiesEvadedOrHit,
        goalReached: hasReachedGoal,
        timeToGoalSec,
        averageSpeed: Number((distanceTraveled / elapsed).toFixed(1)),
        heatmapPoints: Array.from(heatmapMap.values()),
        actionTimeline: actionTimeline.slice(-14),
        userRating: null,
        engagementScore,
      };
    };

    let animId = 0;
    let prevTime = performance.now();
    let lastTelemetryEmit = prevTime;
    let botDecisionTimer = 0;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;

      if (!finishTriggered) {
        totalTimeSec += dt;
        if (durationSeconds && durationSeconds > 0 && !isFullGame) {
          const rem = Math.max(0, durationSeconds - totalTimeSec);
          setTimeLeft( Number(rem.toFixed(1)) );
          if (rem <= 0) {
            finishTriggered = true;
            setIsFinished(true);
            const finalSnap = buildTelemetrySnapshot(false);
            onTelemetryUpdate?.(finalSnap);
            onDemoComplete?.(finalSnap);
          }
        } else {
          setTimeLeft(Number(totalTimeSec.toFixed(1)));
        }
      }

      if (!finishTriggered) {
        let moveX = 0;
        let moveZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        // If Auto-Play Bot Assist is enabled and user isn't pressing keys, steer toward nearest shard or goal
        if (botActiveRef.current && moveX === 0 && moveZ === 0) {
          const uncollected = collectibles.find((c) => !c.collected);
          const targetPos = uncollected
            ? uncollected.mesh.position
            : goalPortalMesh
            ? goalPortalMesh.position
            : new THREE.Vector3(0, 2, 0);

          const dx = targetPos.x - playerGroup.position.x;
          const dz = targetPos.z - playerGroup.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.5) {
            moveX = dx / dist;
            moveZ = dz / dist;
          }
          botDecisionTimer += dt;
          if (botDecisionTimer > 1.15) {
            botDecisionTimer = 0;
            totalKeyPresses += 3;
            if (targetPos.y > playerGroup.position.y + 0.8 || Math.random() < 0.45) {
              triggerJump();
            }
            if (Math.random() < 0.35) {
              triggerDashOrPulse();
            }
          }
        }

        if (dashBoostTimer > 0) dashBoostTimer -= dt;
        if (invulnTimer > 0) invulnTimer -= dt;

        const currentSpeed =
          (physics.moveSpeed || 12) *
          (dashBoostTimer > 0 ? physics.dashMultiplier || 2.0 : 1.0);

        if (moveX !== 0 || moveZ !== 0) {
          const len = Math.hypot(moveX, moveZ);
          const nx = moveX / len;
          const nz = moveZ / len;
          lastFacing.set(nx, nz);

          const stepX = nx * currentSpeed * dt;
          const stepZ = nz * currentSpeed * dt;
          playerGroup.position.x += stepX;
          playerGroup.position.z += stepZ;
          distanceTraveled += Math.hypot(stepX, stepZ);
        }

        // Apply Gravity
        velY -= (physics.gravity || 22) * dt;
        playerGroup.position.y += velY * dt;

        // Platform & Crate Collisions
        let grounded = false;
        for (const p of platforms) {
          if (p.isDynamicCrate) {
            // Push crate if close horizontally
            const dx = p.mesh.position.x - playerGroup.position.x;
            const dz = p.mesh.position.z - playerGroup.position.z;
            if (
              Math.abs(dx) < p.halfW + 1.05 &&
              Math.abs(dz) < p.halfD + 1.05 &&
              Math.abs(playerGroup.position.y - p.mesh.position.y) < 1.8
            ) {
              p.mesh.position.x += Math.sign(dx) * 6 * dt;
              p.mesh.position.z += Math.sign(dz) * 6 * dt;
              p.minX = p.mesh.position.x - p.halfW;
              p.maxX = p.mesh.position.x + p.halfW;
              p.minZ = p.mesh.position.z - p.halfD;
              p.maxZ = p.mesh.position.z + p.halfD;
            }
          }

          if (
            playerGroup.position.x >= p.minX - 0.85 &&
            playerGroup.position.x <= p.maxX + 0.85 &&
            playerGroup.position.z >= p.minZ - 0.85 &&
            playerGroup.position.z <= p.maxZ + 0.85
          ) {
            if (p.role === 'wall' && playerGroup.position.y < p.topY - 0.5) {
              // Push out of tall wall
              const centerX = (p.minX + p.maxX) * 0.5;
              const centerZ = (p.minZ + p.maxZ) * 0.5;
              if (Math.abs(playerGroup.position.x - centerX) > Math.abs(playerGroup.position.z - centerZ)) {
                playerGroup.position.x += Math.sign(playerGroup.position.x - centerX) * 0.4;
              } else {
                playerGroup.position.z += Math.sign(playerGroup.position.z - centerZ) * 0.4;
              }
            } else if (
              playerGroup.position.y - 1.0 <= p.topY &&
              playerGroup.position.y - 1.0 >= p.topY - 2.4 &&
              velY <= 0
            ) {
              playerGroup.position.y = p.topY + 1.0;
              velY = 0;
              grounded = true;
            }
          }
        }

        // Base floor clamp
        if (playerGroup.position.y <= 1.0) {
          playerGroup.position.y = 1.0;
          velY = 0;
          grounded = true;
        }

        if (grounded) {
          jumpsRemaining = physics.doubleJump ? 2 : 1;
        } else {
          airborneTimeSec += dt;
        }

        // Record Spatial Heatmap Cell
        const cellX = Math.round(playerGroup.position.x / 4);
        const cellZ = Math.round(playerGroup.position.z / 4);
        const cellKey = `${cellX},${cellZ}`;
        visitedCells.add(cellKey);
        const existingHeat = heatmapMap.get(cellKey);
        if (existingHeat) {
          existingHeat.weight += dt;
        } else {
          heatmapMap.set(cellKey, {
            x: playerGroup.position.x,
            z: playerGroup.position.z,
            weight: dt,
          });
        }

        // Jump Pads
        for (const jp of jumpPads) {
          jp.mesh.rotation.y += dt * 2.5;
          const distXZ = Math.hypot(
            playerGroup.position.x - jp.x,
            playerGroup.position.z - jp.z
          );
          if (distXZ < jp.radius && Math.abs(playerGroup.position.y - jp.y) < 2.6) {
            velY = (physics.jumpForce || 12) * Math.min(2.1, jp.boost * 0.85);
            jumpsRemaining = physics.doubleJump ? 2 : 1;
            jumpPadUses++;
            sfx.playJumpPad();
            recordEvent('Kinetic Jump Pad Launch!', 'jump');
          }
        }

        // Collectibles + Magnet Pull
        const magnetRadius = physics.magnetRadius || 4.0;
        for (const c of collectibles) {
          if (c.collected) continue;
          c.mesh.rotation.y += dt * 3.2;
          c.mesh.position.y = c.baseY + Math.sin(now * 0.0045) * 0.35;
          const dist = playerGroup.position.distanceTo(c.mesh.position);
          if (dist < magnetRadius) {
            c.mesh.position.lerp(playerGroup.position, dt * 6.5);
          }
          if (dist < 1.85) {
            c.collected = true;
            c.mesh.visible = false;
            c.ring.visible = false;
            collectiblesGathered++;
            setScore((s) => s + 100 * combo);
            setCombo((cb) => cb + 1);
            sfx.playCollect();
            recordEvent(`Collected Energy Shard (${collectiblesGathered}/${collectibles.length})`, 'collect');
          }
        }

        // Hazards
        for (const h of hazards) {
          if (
            playerGroup.position.x >= h.minX &&
            playerGroup.position.x <= h.maxX &&
            playerGroup.position.z >= h.minZ &&
            playerGroup.position.z <= h.maxZ &&
            playerGroup.position.y <= h.topY + 1.1 &&
            invulnTimer <= 0
          ) {
            invulnTimer = 1.1;
            hazardCollisions++;
            velY = 9.5;
            setShieldHp((hp) => Math.max(10, hp - 18));
            setCombo(1);
            sfx.playHazardHit();
            recordEvent('Plasma Hazard Contact — Shield Absorbed Impact', 'hazard');
          }
        }

        // Projectiles vs Enemies
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.life -= dt;
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.z += p.vz * dt;
          if (p.life <= 0) {
            threeScene.remove(p.mesh);
            projectiles.splice(i, 1);
            continue;
          }
          for (const en of enemies) {
            if (p.mesh.position.distanceTo(en.mesh.position) < 2.2) {
              en.stunTimer = 3.5;
              enemiesEvadedOrHit++;
              sfx.playCollect();
              recordEvent('Sentinel Stunned with Plasma Pulse!', 'dash');
              threeScene.remove(p.mesh);
              projectiles.splice(i, 1);
              break;
            }
          }
        }

        // Enemies Patrol
        for (const en of enemies) {
          if (en.stunTimer > 0) {
            en.stunTimer -= dt;
            en.mesh.rotation.z = 0.6;
            continue;
          }
          en.mesh.rotation.z = 0;
          en.phase += dt * en.speed;
          en.mesh.position.x = en.originX + Math.sin(en.phase) * 5.5;
          en.mesh.position.z = en.originZ + Math.cos(en.phase * 0.7) * 2.5;
          en.mesh.rotation.y += dt * 4;

          if (
            playerGroup.position.distanceTo(en.mesh.position) < 2.1 &&
            invulnTimer <= 0
          ) {
            if (dashBoostTimer > 0) {
              en.stunTimer = 3.0;
              enemiesEvadedOrHit++;
              recordEvent('Dashed Through Sentinel — Sentinel Stunned!', 'dash');
            } else {
              invulnTimer = 1.1;
              hazardCollisions++;
              velY = 8;
              setShieldHp((hp) => Math.max(10, hp - 20));
              sfx.playHazardHit();
              recordEvent('Sentinel Intercept! Use Shift to Dash/Stun', 'hazard');
            }
          }
        }

        // Goal Portal Check
        if (goalPortalMesh && goalCoreMesh) {
          goalPortalMesh.rotation.z += dt * 2.4;
          goalCoreMesh.scale.setScalar(1 + Math.sin(now * 0.006) * 0.12);
          if (playerGroup.position.distanceTo(goalPortalMesh.position) < 3.0) {
            timeToGoalSec = Number(totalTimeSec.toFixed(1));
            setGoalReached(true);
            sfx.playGoalVictory();
            recordEvent(`Quantum Goal Portal Breached in ${timeToGoalSec}s!`, 'goal');

            if (!isFullGame) {
              finishTriggered = true;
              setIsFinished(true);
              const finalSnap = buildTelemetrySnapshot(true);
              onTelemetryUpdate?.(finalSnap);
              onDemoComplete?.(finalSnap);
            } else {
              // In full game mode, give bonus score and respawn or celebrate
              finishTriggered = true;
              setIsFinished(true);
              const finalSnap = buildTelemetrySnapshot(true);
              onTelemetryUpdate?.(finalSnap);
            }
          }
        }

        // Animate 3D Turbo Squirrel orientation, tail wag, and Sonic Spin-Dash Ball
        const targetYaw = Math.atan2(lastFacing.x, lastFacing.y);
        squirrelVisualGroup.rotation.y = targetYaw;
        squirrelTailGroup.rotation.z = Math.sin(now * 0.014) * 0.24;
        squirrelTailGroup.rotation.x = Math.cos(now * 0.01) * 0.14;

        const isSpinDashing = dashBoostTimer > 0 || (!grounded && Math.abs(velY) > 4.5);
        squirrelVisualGroup.visible = !isSpinDashing;
        spinBallMesh.visible = isSpinDashing;
        if (isSpinDashing) {
          spinBallMesh.rotation.x += dt * 22;
          spinBallMesh.rotation.z += dt * 14;
        }
        playerHalo.rotation.z += dt * (isSpinDashing ? 12 : 4);
      }

      // Camera Perspective Tracking (frames player + ahead toward the 3D arena center)
      const targetPos = playerGroup.position;
      if (cameraMode === 'isometric_tactical') {
        camera.position.lerp(
          new THREE.Vector3(targetPos.x - 14, targetPos.y + 26, targetPos.z + 22),
          0.09
        );
      } else if (cameraMode === 'top_down_action') {
        camera.position.lerp(
          new THREE.Vector3(targetPos.x * 0.7, targetPos.y + 35, targetPos.z * 0.7 + 14),
          0.11
        );
      } else {
        // third_person_chase angled toward the arena center
        camera.position.lerp(
          new THREE.Vector3(targetPos.x - 10, targetPos.y + 12.5, targetPos.z + 16.5),
          0.1
        );
      }
      camera.lookAt(targetPos.x * 0.45, targetPos.y + 1.8, targetPos.z * 0.45);

      renderer.render(threeScene, camera);

      // Periodic Telemetry Emit (every 300ms)
      if (!finishTriggered && now - lastTelemetryEmit > 300) {
        lastTelemetryEmit = now;
        const snap = buildTelemetrySnapshot(false);
        setLiveApm(snap.apm);
        onTelemetryUpdate?.(snap);
      }
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, scene, variantId, cameraMode]);

  return (
    <div className="relative w-full h-full bg-[#11141c] rounded-xl overflow-hidden border border-[#e2e8f0] shadow-xs select-none flex flex-col">
      {/* Clean Minimal Floating HUD Pill */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
        <div className="bg-white/95 backdrop-blur-md border border-black/10 rounded-lg px-3 py-1.5 shadow-sm pointer-events-auto flex items-center gap-4 text-[11px] text-[#1e1e1e]">
          <span className="font-semibold">{variantTitle}</span>
          <span className="text-[#757575]">
            Shards:{' '}
            <strong className="text-[#1e1e1e]">
              {score / 100 >= totalShards
                ? totalShards
                : Math.min(totalShards, Math.floor(score / 100))}
              /{totalShards}
            </strong>
          </span>
          <span className="text-[#757575]">
            Score: <strong className="text-[#1e1e1e]">{score}</strong>
          </span>
          <span className="text-[#757575]">
            Shield: <strong className="text-[#1e1e1e]">{shieldHp}%</strong>
          </span>
        </div>

        {/* Clean Right Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="px-2.5 py-1.5 rounded-lg bg-white/95 border border-black/10 text-[#1e1e1e] font-mono text-[11px] font-semibold shadow-sm">
            {isFullGame ? `${timeLeft.toFixed(1)}s` : `${timeLeft.toFixed(1)}s left`}
          </div>

          <button
            onClick={() => setBotActive(!botActive)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border shadow-sm transition cursor-pointer ${
              botActive
                ? 'bg-[var(--studio-accent)] border-[var(--studio-accent)] text-white'
                : 'bg-white/95 border-black/10 text-[var(--studio-text)] hover:bg-white'
            }`}
            title="Toggle AI Player Bot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{botActive ? 'Auto-Play: ON' : 'Auto-Play'}</span>
          </button>

          <button
            onClick={restartRun}
            className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-[#1e1e1e] border border-black/10 shadow-sm transition cursor-pointer"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-[#1e1e1e] border border-black/10 shadow-sm transition cursor-pointer"
            title="Mute / Unmute"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full flex-1 min-h-[340px]" />

      {/* Subtle Bottom Controls Hint */}
      <div className="bg-[var(--studio-panel)] border-t border-[var(--studio-border)] px-3.5 py-2 flex items-center justify-between text-[11px] text-[var(--studio-muted)]">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-[var(--studio-accent)]" />
          <span className="font-medium text-[var(--studio-text)]">Observed Input:</span>
          <span className="text-[var(--studio-muted)] truncate">{lastEventBanner}</span>
        </div>
        <div className="text-[11px] text-[var(--studio-muted)] hidden sm:block shrink-0">
          WASD / Arrows: Move • Space: Jump • Shift: Dash / Pulse
        </div>
      </div>

      {/* End-of-Demo / Victory Overlay */}
      {isFinished && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[var(--studio-panel)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[var(--studio-border)]">
            <h3 className="text-base font-semibold text-[var(--studio-text)]">
              {goalReached ? 'Level Completed!' : 'Demo Sample Recorded'}
            </h3>
            <p className="text-xs text-[var(--studio-muted)] mt-1.5 leading-relaxed">
              {isFullGame
                ? `Completed ${scene.title} with score ${score}.`
                : `Observed ${liveApm} APM and your movement preferences during "${variantTitle}".`}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={restartRun}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-xs font-semibold transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
