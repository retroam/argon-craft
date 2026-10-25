import React, { useEffect, useRef, useState } from 'react';
import {
  CanvasNode,
  CanvasScene,
  GameRole,
  InteractionLogEntry,
  NodeShapeType,
} from '../types';
import { PRESET_SCENES, ROLE_METADATA } from '../data/presets';
import { generateNanoBananaTexture } from '../services/geminiService';
import { STUDIO_THEMES, StudioTheme, StudioThemeId } from '../theme/studioThemes';
import {
  AiSynthIcon,
  ArgonPrismLogo,
  BenchmarkScaleIcon,
  LaunchCubeIcon,
  RoleGlyph,
  StageBlueprintIcon,
  ThemePaletteIcon,
  ToolNavigateIcon,
  ToolOrbIcon,
  ToolPlatformIcon,
  ToolSelectIcon,
  ToolSentinelIcon,
} from './StudioIcons';
import {
  Box,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import { UnitySceneEditor } from './UnitySceneEditor';

interface FigmaCanvasStudioProps {
  scene: CanvasScene;
  onChangeScene: (scene: CanvasScene) => void;
  onLaunchMicroDemos: (canvasPngDataUrl: string | null) => void;
  onOpenEvalSuite: () => void;
  onOpenKeyModal: () => void;
  hasKey: boolean;
  onLog: (entry: InteractionLogEntry) => void;
  theme: StudioTheme;
  onChangeTheme: (themeId: StudioThemeId) => void;
  externalSelectedNodeId?: string | null;
  onStartGuidedDemo?: () => void;
}

type ToolMode = 'select' | 'draw_rect' | 'draw_circle' | 'draw_polygon' | 'hand';

export const FigmaCanvasStudio: React.FC<FigmaCanvasStudioProps> = ({
  scene,
  onChangeScene,
  onLaunchMicroDemos,
  onOpenEvalSuite,
  onOpenKeyModal,
  hasKey,
  onLog,
  theme,
  onChangeTheme,
  externalSelectedNodeId,
  onStartGuidedDemo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    scene.nodes[0]?.id || null
  );

  useEffect(() => {
    if (externalSelectedNodeId !== undefined) {
      setSelectedNodeId(externalSelectedNodeId);
    }
  }, [externalSelectedNodeId]);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [leftTab, setLeftTab] = useState<'scene' | 'prefabs'>('scene');
  const [rightTab, setRightTab] = useState<'spatial' | 'physics'>('spatial');
  const [editorViewportMode, setEditorViewportMode] = useState<
    'blueprint_2d' | 'unity_3d'
  >('blueprint_2d');
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showTexturePopover, setShowTexturePopover] = useState<boolean>(false);
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);
  const [texturePrompt, setTexturePrompt] = useState<string>(
    'Clean minimal geometric grid surface'
  );
  const [isGeneratingTexture, setIsGeneratingTexture] = useState<boolean>(false);

  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize' | 'create' | 'pan' | null;
    nodeId: string | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    mode: null,
    nodeId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });

  const selectedNode =
    scene.nodes.find((n) => n.id === selectedNodeId) || null;

  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    scene.nodes.forEach((n) => {
      if (n.textureUrl && !loadedImagesRef.current[n.textureUrl]) {
        const img = new Image();
        img.src = n.textureUrl;
        img.onload = () => {
          loadedImagesRef.current[n.textureUrl!] = img;
          renderSpatialBlueprint();
        };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.nodes]);

  // Keyboard shortcuts (V, R, O, P, H, Backspace/Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'r' || e.key === 'R') setActiveTool('draw_rect');
      if (e.key === 'o' || e.key === 'O') setActiveTool('draw_circle');
      if (e.key === 'p' || e.key === 'P') setActiveTool('draw_polygon');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
        const remaining = scene.nodes.filter((n) => n.id !== selectedNodeId);
        onChangeScene({ ...scene, nodes: remaining });
        setSelectedNodeId(remaining[0]?.id || null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, scene, onChangeScene]);

  const updateNode = (id: string, patch: Partial<CanvasNode>) => {
    onChangeScene({
      ...scene,
      nodes: scene.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const addNodeByRole = (role: GameRole) => {
    const meta = ROLE_METADATA[role];
    const shapeType: NodeShapeType =
      role === 'player_spawn' ||
      role === 'collectible' ||
      role === 'jump_pad' ||
      role === 'goal_portal'
        ? 'circle'
        : role === 'enemy_patrol'
        ? 'polygon'
        : 'rect';

    const defaultSize =
      role === 'platform'
        ? { w: 160, h: 100 }
        : role === 'wall'
        ? { w: 36, h: 120 }
        : role === 'goal_portal'
        ? { w: 64, h: 64 }
        : role === 'collectible'
        ? { w: 32, h: 32 }
        : { w: 48, h: 48 };

    const newNode: CanvasNode = {
      id: `node-${Date.now().toString(36)}`,
      name: `${meta.label} ${scene.nodes.filter((n) => n.role === role).length + 1}`,
      type: shapeType,
      role,
      x: Math.round(scene.width * 0.5 - defaultSize.w * 0.5),
      y: Math.round(scene.height * 0.5 - defaultSize.h * 0.5),
      width: defaultSize.w,
      height: defaultSize.h,
      rotation: 0,
      fill: meta.color,
      stroke: meta.stroke,
      strokeWidth: 1.5,
      opacity: 1,
      cornerRadius: shapeType === 'circle' ? Math.round(defaultSize.w / 2) : 8,
      extrudeHeight: meta.defaultExtrude,
      elevation: meta.defaultElevation,
      physics:
        role === 'platform' || role === 'wall'
          ? 'static'
          : role === 'enemy_patrol'
          ? 'kinematic'
          : role === 'movable_crate' || role === 'player_spawn'
          ? 'dynamic'
          : 'sensor',
      bounciness: role === 'jump_pad' ? 1.9 : 0.1,
      speed: role === 'enemy_patrol' ? 1.5 : 0,
      visible: true,
      locked: false,
    };

    onChangeScene({
      ...scene,
      nodes: [...scene.nodes, newNode],
    });
    setSelectedNodeId(newNode.id);
    setLeftTab('scene');
  };

  const duplicateSelected = () => {
    if (!selectedNode) return;
    const copy: CanvasNode = {
      ...selectedNode,
      id: `node-${Date.now().toString(36)}`,
      name: `${selectedNode.name} Copy`,
      x: selectedNode.x + 24,
      y: selectedNode.y + 24,
    };
    onChangeScene({
      ...scene,
      nodes: [...scene.nodes, copy],
    });
    setSelectedNodeId(copy.id);
  };

  const deleteSelected = () => {
    if (!selectedNode) return;
    const remaining = scene.nodes.filter((n) => n.id !== selectedNode.id);
    onChangeScene({
      ...scene,
      nodes: remaining,
    });
    setSelectedNodeId(remaining[0]?.id || null);
  };

  const handleGenerateTexture = async () => {
    if (!selectedNode) return;
    setIsGeneratingTexture(true);
    try {
      const dataUrl = await generateNanoBananaTexture(
        texturePrompt,
        selectedNode.role,
        'gemini-nano-banana-2.1',
        onLog
      );
      updateNode(selectedNode.id, {
        textureUrl: dataUrl,
        texturePrompt,
      });
      setShowTexturePopover(false);
    } finally {
      setIsGeneratingTexture(false);
    }
  };

  // Render clean Architectural 2.5D Spatial Blueprint Stage
  const renderSpatialBlueprint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Architectural Blueprint Surface
    ctx.fillStyle = theme.artboardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle 24px architectural cross-grid inside the stage
    ctx.strokeStyle = theme.artboardGrid;
    ctx.lineWidth = 1;
    for (let x = 24; x < canvas.width; x += 24) {
      for (let y = 24; y < canvas.height; y += 24) {
        if (x % 96 === 0 && y % 96 === 0) {
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x, y + 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = theme.artboardGrid;
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    }

    // Role priority so actors, coins, pads, and portals always sit cleanly above platforms
    const rolePriority: Record<GameRole, number> = {
      platform: 1,
      hazard: 2,
      wall: 3,
      decoration: 4,
      movable_crate: 5,
      jump_pad: 6,
      collectible: 7,
      enemy_patrol: 8,
      goal_portal: 9,
      player_spawn: 10,
    };

    const sortedNodes = [...scene.nodes].sort((a, b) => {
      const pa = rolePriority[a.role] || 5;
      const pb = rolePriority[b.role] || 5;
      if (pa !== pb) return pa - pb;
      return a.elevation - b.elevation;
    });

    if (sortedNodes.length === 0) {
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.34, canvas.width * 0.5, canvas.height * 0.32);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = theme.textPrimary;
      ctx.font = '600 13px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Blank 2.5D Stage Blueprint (800 × 540)', canvas.width / 2, canvas.height / 2 - 8);
      ctx.fillStyle = theme.textSecondary;
      ctx.font = '400 11px Inter, -apple-system, sans-serif';
      ctx.fillText('Draw 3D platforms or place prefabs (Spawn, Jump Pads, Crystals, Goal Portal)', canvas.width / 2, canvas.height / 2 + 14);
      ctx.restore();
    }

    sortedNodes.forEach((node) => {
      if (!node.visible) return;
      ctx.save();
      ctx.globalAlpha = node.opacity ?? 1;

      const isPlatform = node.role === 'platform';
      const depthOffset = Math.min(8, Math.max(3, Math.round((node.extrudeHeight || 16) * 0.16)));

      // Subtle 2.5D Isometric Extrusion Depth Rim for rectangles/platforms
      if (node.type === 'rect') {
        ctx.fillStyle = isPlatform
          ? theme.platformStroke
          : 'rgba(15, 23, 42, 0.22)';
        ctx.beginPath();
        ctx.roundRect(
          node.x,
          node.y + depthOffset,
          node.width,
          node.height,
          node.cornerRadius || 8
        );
        ctx.fill();
      }

      // Soft ambient drop shadow
      ctx.shadowColor = 'rgba(15, 23, 42, 0.07)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;

      ctx.fillStyle = isPlatform
        ? theme.platformFill
        : node.role === 'wall'
        ? '#283548'
        : node.fill || '#38bdf8';
      ctx.strokeStyle = isPlatform
        ? theme.platformStroke
        : node.stroke || '#94a3b8';
      ctx.lineWidth = isPlatform ? 1.5 : 2;

      ctx.beginPath();
      if (node.type === 'circle') {
        ctx.ellipse(
          node.x + node.width / 2,
          node.y + node.height / 2,
          node.width / 2,
          node.height / 2,
          0,
          0,
          Math.PI * 2
        );
      } else if (node.type === 'polygon') {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        ctx.moveTo(cx, node.y);
        ctx.lineTo(node.x + node.width, cy);
        ctx.lineTo(cx, node.y + node.height);
        ctx.lineTo(node.x, cy);
        ctx.closePath();
      } else {
        ctx.roundRect(
          node.x,
          node.y,
          node.width,
          node.height,
          node.cornerRadius || 8
        );
      }
      ctx.fill();

      // Reset shadow before stroke & text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (node.textureUrl && loadedImagesRef.current[node.textureUrl]) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(
          loadedImagesRef.current[node.textureUrl],
          node.x,
          node.y,
          node.width,
          node.height
        );
        ctx.restore();
      }

      ctx.stroke();

      // Clean architectural typography + elevation tag inside platforms
      const isCompact =
        node.type === 'circle' || node.type === 'polygon' || node.width < 80;

      if (!isCompact) {
        ctx.fillStyle = isPlatform ? theme.textPrimary : '#ffffff';
        ctx.font = '600 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(node.name, node.x + 11, node.y + 20);

        // Elevation badge in top-right of large platforms
        if (node.width >= 130) {
          const elevText = `Z+${node.elevation}`;
          ctx.font = '500 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = isPlatform ? theme.textSecondary : 'rgba(255,255,255,0.8)';
          ctx.textAlign = 'right';
          ctx.fillText(elevText, node.x + node.width - 10, node.y + 19);
          ctx.textAlign = 'start';
        }
      } else {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 10px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const glyph =
          node.role === 'player_spawn'
            ? 'P1'
            : node.role === 'jump_pad'
            ? '⇈'
            : node.role === 'collectible'
            ? '◆'
            : node.role === 'goal_portal'
            ? '◎'
            : node.role === 'enemy_patrol'
            ? '❖'
            : '';
        ctx.fillText(glyph, cx, cy);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      // Custom Architectural Selection Reticle + Diamond Handles (Non-Figma style)
      if (node.id === selectedNodeId) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.75;
        ctx.strokeRect(node.x - 1, node.y - 1, node.width + 2, node.height + 2);

        const corners = [
          [node.x - 1, node.y - 1],
          [node.x + node.width + 1, node.y - 1],
          [node.x - 1, node.y + node.height + 1],
          [node.x + node.width + 1, node.y + node.height + 1],
        ];
        corners.forEach(([cx, cy]) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.6;
          ctx.fillRect(-3.5, -3.5, 7, 7);
          ctx.strokeRect(-3.5, -3.5, 7, 7);
          ctx.restore();
        });

        // Spatial dimension + 3D height badge centered below selection
        const dimText = `${Math.round(node.width)} × ${Math.round(node.height)} • H:${node.extrudeHeight}`;
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        const tw = ctx.measureText(dimText).width;
        const pw = tw + 14;
        const ph = 18;
        const px = node.x + node.width / 2 - pw / 2;
        const py = node.y + node.height + 8;
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dimText, node.x + node.width / 2, py + ph / 2 + 0.5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      ctx.restore();
    });
  };

  useEffect(() => {
    renderSpatialBlueprint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, selectedNodeId, zoom, theme]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand') {
      setDragState({
        mode: 'pan',
        nodeId: null,
        startX: e.clientX,
        startY: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y,
        origW: 0,
        origH: 0,
      });
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (activeTool !== 'select') {
      const role: GameRole =
        activeTool === 'draw_circle'
          ? 'collectible'
          : activeTool === 'draw_polygon'
          ? 'enemy_patrol'
          : 'platform';
      const meta = ROLE_METADATA[role];
      const shapeType: NodeShapeType =
        activeTool === 'draw_circle'
          ? 'circle'
          : activeTool === 'draw_polygon'
          ? 'polygon'
          : 'rect';
      const newNode: CanvasNode = {
        id: `node-${Date.now().toString(36)}`,
        name: `${meta.label} ${scene.nodes.length + 1}`,
        type: shapeType,
        role,
        x,
        y,
        width: 60,
        height: 60,
        rotation: 0,
        fill: meta.color,
        stroke: meta.stroke,
        strokeWidth: 1.5,
        opacity: 1,
        cornerRadius: shapeType === 'circle' ? 30 : 8,
        extrudeHeight: meta.defaultExtrude,
        elevation: meta.defaultElevation,
        physics: role === 'platform' ? 'static' : 'sensor',
        bounciness: 0.1,
        speed: role === 'enemy_patrol' ? 1.5 : 0,
        visible: true,
        locked: false,
      };
      onChangeScene({
        ...scene,
        nodes: [...scene.nodes, newNode],
      });
      setSelectedNodeId(newNode.id);
      setDragState({
        mode: 'create',
        nodeId: newNode.id,
        startX: x,
        startY: y,
        origX: x,
        origY: y,
        origW: 60,
        origH: 60,
      });
      return;
    }

    // Check bottom-right resize handle of selected node
    if (selectedNode && !selectedNode.locked && selectedNode.visible) {
      const hx = selectedNode.x + selectedNode.width;
      const hy = selectedNode.y + selectedNode.height;
      if (Math.abs(x - hx) <= 10 && Math.abs(y - hy) <= 10) {
        setDragState({
          mode: 'resize',
          nodeId: selectedNode.id,
          startX: x,
          startY: y,
          origX: selectedNode.x,
          origY: selectedNode.y,
          origW: selectedNode.width,
          origH: selectedNode.height,
        });
        return;
      }
    }

    // Hit test top-most node (using same visual priority order in reverse)
    const rolePriority: Record<GameRole, number> = {
      platform: 1,
      hazard: 2,
      wall: 3,
      decoration: 4,
      movable_crate: 5,
      jump_pad: 6,
      collectible: 7,
      enemy_patrol: 8,
      goal_portal: 9,
      player_spawn: 10,
    };
    const hitOrder = [...scene.nodes].sort((a, b) => {
      const pa = rolePriority[a.role] || 5;
      const pb = rolePriority[b.role] || 5;
      if (pa !== pb) return pb - pa;
      return b.elevation - a.elevation;
    });

    for (const n of hitOrder) {
      if (!n.visible) continue;
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        setSelectedNodeId(n.id);
        if (!n.locked) {
          setDragState({
            mode: 'move',
            nodeId: n.id,
            startX: x,
            startY: y,
            origX: n.x,
            origY: n.y,
            origW: n.width,
            origH: n.height,
          });
        }
        return;
      }
    }

    setSelectedNodeId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.mode) return;
    if (dragState.mode === 'pan') {
      setPanOffset({
        x: dragState.origX + (e.clientX - dragState.startX),
        y: dragState.origY + (e.clientY - dragState.startY),
      });
      return;
    }
    if (!dragState.nodeId) return;
    const { x, y } = getCanvasCoords(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;

    if (dragState.mode === 'move') {
      updateNode(dragState.nodeId, {
        x: Math.max(0, Math.min(scene.width - 20, Math.round(dragState.origX + dx))),
        y: Math.max(0, Math.min(scene.height - 20, Math.round(dragState.origY + dy))),
      });
    } else if (dragState.mode === 'resize' || dragState.mode === 'create') {
      updateNode(dragState.nodeId, {
        width: Math.max(20, Math.round(dragState.origW + dx)),
        height: Math.max(20, Math.round(dragState.origH + dy)),
      });
    }
  };

  const handleMouseUp = () => {
    if (dragState.mode === 'create') {
      setActiveTool('select');
    }
    setDragState({
      mode: null,
      nodeId: null,
      startX: 0,
      startY: 0,
      origX: 0,
      origY: 0,
      origW: 0,
      origH: 0,
    });
  };

  const handleTriggerGenerateGame = () => {
    const pngDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
    onLaunchMicroDemos(pngDataUrl);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--studio-backdrop)] select-none font-sans text-[var(--studio-text)] transition-colors duration-200">
      {/* Subtle Ambient Radial Highlight on Light Workspace */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${theme.panelBg} 0%, transparent 72%)`,
        }}
      />

      {/* Top Center Viewport Mode Switcher: 2.5D Figma Blueprint vs Unity 3D Engine Editor */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[var(--studio-panel)]/95 backdrop-blur-md p-1 rounded-xl border border-[var(--studio-border)] shadow-sm text-[11px]">
        <button
          onClick={() => setEditorViewportMode('blueprint_2d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            editorViewportMode === 'blueprint_2d'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          <StageBlueprintIcon className="w-3.5 h-3.5" />
          <span>2.5D Stage Blueprint</span>
        </button>
        <button
          onClick={() => setEditorViewportMode('unity_3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            editorViewportMode === 'unity_3d'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Unity 3D Engine View (W/E/R Gizmos)</span>
        </button>
      </div>

      {/* Infinite Spatial Blueprint Canvas Area or Unity 3D Scene View */}
      {editorViewportMode === 'unity_3d' ? (
        <div className="absolute top-14 bottom-16 left-[268px] right-[276px] z-10">
          <UnitySceneEditor
            scene={scene}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNode={updateNode}
            showInspectorSidebar={false}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="transition-transform duration-75"
          >
            {/* Stage Blueprint Header Bar above top-left corner */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-accent)] cursor-pointer transition-colors">
                <StageBlueprintIcon className="w-3.5 h-3.5 text-[var(--studio-accent)]" />
                <span>{scene.title}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--studio-panel)]/80 border border-[var(--studio-border)] text-[var(--studio-muted)]">
                  2.5D Stage Blueprint
                </span>
              </div>
              <span className="text-[10px] text-[var(--studio-muted)] font-mono bg-[var(--studio-panel)]/80 px-2 py-0.5 rounded border border-[var(--studio-border)]">
                {scene.width} × {scene.height}u • G:{scene.gravity}
              </span>
            </div>

            {/* The Stage Blueprint Frame */}
            <div className="bg-[var(--studio-panel)] rounded-xl overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.08)] ring-1 ring-[var(--studio-border)]">
              <canvas
                ref={canvasRef}
                width={scene.width}
                height={scene.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`block ${
                  activeTool === 'hand'
                    ? 'cursor-grab active:cursor-grabbing'
                    : activeTool === 'select'
                    ? 'cursor-default'
                    : 'cursor-crosshair'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Left Panel — ArgonCraft Spatial Studio Outliner */}
      <aside className="absolute top-3 left-3 bottom-3 w-[248px] bg-[var(--studio-panel)]/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-[var(--studio-border)] flex flex-col z-20 overflow-hidden">
        {/* Top Studio Brand Identity Header (Custom Isometric Prism Mark) */}
        <div className="px-3.5 py-3 border-b border-[var(--studio-divider)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: theme.accentSoft,
                borderColor: theme.accentBorder,
                color: theme.accent,
              }}
            >
              <ArgonPrismLogo className="w-4 h-4" accentColor={theme.accent} />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[var(--studio-text)] truncate tracking-tight">
                ArgonCraft 3D
              </div>
              <div className="text-[10px] text-[var(--studio-muted)] truncate">
                Spatial Level Studio
              </div>
            </div>
          </div>

          {/* Light Studio Color Theme Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] border border-[var(--studio-border)] text-[10px] font-medium text-[var(--studio-text)] cursor-pointer transition"
              title="Switch Light Studio Palette"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.swatchColor }}
              />
              <ThemePaletteIcon className="w-3 h-3 text-[var(--studio-muted)]" />
            </button>

            {showThemeMenu && (
              <div className="absolute left-0 top-8 w-52 bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-xl shadow-xl p-1.5 z-50 space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-[var(--studio-muted)] uppercase tracking-wider">
                  Studio Light Theme
                </div>
                {(Object.keys(STUDIO_THEMES) as StudioThemeId[]).map((tid) => {
                  const tOption = STUDIO_THEMES[tid];
                  const isActive = tid === theme.id;
                  return (
                    <button
                      key={tid}
                      onClick={() => {
                        onChangeTheme(tid);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2 cursor-pointer transition ${
                        isActive
                          ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold'
                          : 'text-[var(--studio-text)] hover:bg-[var(--studio-muted-bg)]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: tOption.swatchColor }}
                      />
                      <span className="truncate">{tOption.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Scene / 3D Prefabs Segmented Pill Switcher */}
        <div className="p-2 border-b border-[var(--studio-divider)]">
          <div className="grid grid-cols-2 gap-1 bg-[var(--studio-muted-bg)] p-1 rounded-xl text-[11px] font-medium">
            <button
              onClick={() => setLeftTab('scene')}
              className={`py-1 rounded-lg cursor-pointer transition ${
                leftTab === 'scene'
                  ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] font-semibold shadow-2xs'
                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Scene Graph
            </button>
            <button
              onClick={() => setLeftTab('prefabs')}
              className={`py-1 rounded-lg cursor-pointer transition ${
                leftTab === 'prefabs'
                  ? 'bg-[var(--studio-panel)] text-[var(--studio-text)] font-semibold shadow-2xs'
                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              3D Prefabs
            </button>
          </div>
        </div>

        {leftTab === 'scene' ? (
          <>
            {/* World Presets Section */}
            <div className="px-2.5 py-2 border-b border-[var(--studio-divider)]">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-muted)] flex items-center justify-between">
                <span>World Templates</span>
              </div>
              <div className="space-y-0.5">
                {PRESET_SCENES.map((preset) => {
                  const isCurrent = scene.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onChangeScene(preset);
                        setSelectedNodeId(preset.nodes[0]?.id || null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between cursor-pointer transition ${
                        isCurrent
                          ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold'
                          : 'text-[var(--studio-text)] hover:bg-[var(--studio-muted-bg)]'
                      }`}
                    >
                      <span className="truncate">{preset.title}</span>
                      <span className="text-[9px] font-mono opacity-75">
                        {preset.nodes.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spatial Nodes Tree Section with Custom Role Glyphs */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-muted)] flex items-center justify-between">
                <span>Stage Objects ({scene.nodes.length})</span>
                <button
                  onClick={() => setLeftTab('prefabs')}
                  className="text-[var(--studio-muted)] hover:text-[var(--studio-accent)] cursor-pointer"
                  title="Add 3D Game Object"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-0.5">
                {scene.nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const roleColor = ROLE_METADATA[node.role]?.color || theme.accent;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] cursor-pointer transition ${
                        isSelected
                          ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold'
                          : 'text-[var(--studio-text)] hover:bg-[var(--studio-muted-bg)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <RoleGlyph
                          role={node.role}
                          className="w-3.5 h-3.5 shrink-0"
                          color={isSelected ? theme.accent : roleColor}
                        />
                        <span className="truncate">{node.name}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNode(node.id, { visible: !node.visible });
                          }}
                          className="p-0.5 text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                        >
                          {node.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNode(node.id, { locked: !node.locked });
                          }}
                          className="p-0.5 text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                        >
                          {node.locked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* 3D Prefabs Tab: Custom Architectural Role Glyphs */
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-muted)] mb-2">
              3D Game Prefabs (Click to place)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_METADATA) as GameRole[]).map((role) => {
                const meta = ROLE_METADATA[role];
                return (
                  <button
                    key={role}
                    onClick={() => addNodeByRole(role)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-muted-bg)]/50 hover:border-[var(--studio-accent)] hover:bg-[var(--studio-accent-soft)]/50 transition cursor-pointer text-center gap-1.5 group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${meta.color}18`,
                        border: `1px solid ${meta.color}40`,
                      }}
                    >
                      <RoleGlyph
                        role={role}
                        className="w-4 h-4"
                        color={meta.color}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--studio-text)] leading-tight">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Floating Bottom Center Spatial Dock — Light Architectural Dock (Not Figma's Dark Bar) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[var(--studio-panel)]/95 backdrop-blur-md text-[var(--studio-text)] p-1.5 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.12)] border border-[var(--studio-border)]">
        <button
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)] hover:text-[var(--studio-text)]'
          }`}
          title="Select & Transform (V)"
        >
          <ToolSelectIcon className="w-4 h-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Select</span>
        </button>

        <button
          onClick={() => setActiveTool('draw_rect')}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
            activeTool === 'draw_rect'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)] hover:text-[var(--studio-text)]'
          }`}
          title="3D Platform Slab (R)"
        >
          <ToolPlatformIcon className="w-4 h-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Platform</span>
        </button>

        <button
          onClick={() => setActiveTool('draw_circle')}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
            activeTool === 'draw_circle'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)] hover:text-[var(--studio-text)]'
          }`}
          title="Orb / Pad / Crystal (O)"
        >
          <ToolOrbIcon className="w-4 h-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Orb</span>
        </button>

        <button
          onClick={() => setActiveTool('draw_polygon')}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
            activeTool === 'draw_polygon'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)] hover:text-[var(--studio-text)]'
          }`}
          title="Sentinel / Prism (P)"
        >
          <ToolSentinelIcon className="w-4 h-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Sentinel</span>
        </button>

        <button
          onClick={() => setActiveTool('hand')}
          className={`p-2 rounded-xl transition cursor-pointer ${
            activeTool === 'hand'
              ? 'bg-[var(--studio-accent)] text-white shadow-xs'
              : 'text-[var(--studio-muted)] hover:bg-[var(--studio-muted-bg)] hover:text-[var(--studio-text)]'
          }`}
          title="Pan Stage (H)"
        >
          <ToolNavigateIcon className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-[var(--studio-border)] mx-1" />

        {/* Primary Launch 3D Probes CTA */}
        <button
          onClick={handleTriggerGenerateGame}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-[12px] font-semibold shadow-xs transition cursor-pointer"
        >
          <LaunchCubeIcon className="w-3.5 h-3.5" />
          <span>Generate 3D Game</span>
        </button>
      </div>

      {/* Floating Right Panel — Spatial & 3D Extrusion Inspector */}
      <aside className="absolute top-3 right-3 bottom-3 w-[268px] bg-[var(--studio-panel)]/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-[var(--studio-border)] flex flex-col z-20 overflow-hidden">
        {/* Top Action Bar inside Right Panel */}
        <div className="px-3 py-2.5 border-b border-[var(--studio-divider)] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {onStartGuidedDemo && (
              <button
                onClick={onStartGuidedDemo}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--studio-accent-soft)] hover:opacity-90 text-[var(--studio-accent)] text-[11px] font-semibold transition cursor-pointer"
                title="Watch 1-Minute Guided Demo from Blank Canvas to Full Game"
              >
                <LaunchCubeIcon className="w-3 h-3" />
                <span>1-Min Demo</span>
              </button>
            )}

            <button
              onClick={onOpenEvalSuite}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-text)] text-[11px] font-medium transition cursor-pointer"
              title="Open Google Model Arsenal Evaluation Suite"
            >
              <BenchmarkScaleIcon className="w-3 h-3 text-[var(--studio-accent)]" />
              <span>Eval</span>
            </button>

            <button
              onClick={onOpenKeyModal}
              className="p-1.5 rounded-lg bg-[var(--studio-muted-bg)] hover:bg-[var(--studio-hover-bg)] text-[var(--studio-muted)] transition cursor-pointer"
              title={hasKey ? 'Gemini API Key Active' : 'Set Gemini API Key'}
            >
              <KeyRound
                className={`w-3.5 h-3.5 ${
                  hasKey ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleTriggerGenerateGame}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-[11px] font-semibold transition cursor-pointer"
          >
            <LaunchCubeIcon className="w-3 h-3" />
            <span>Play 3D</span>
          </button>
        </div>

        {/* Spatial / Physics Tabs + Zoom */}
        <div className="px-3 py-2 border-b border-[var(--studio-divider)] flex items-center justify-between text-[11px] font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRightTab('spatial')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                rightTab === 'spatial'
                  ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold'
                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Spatial 3D
            </button>
            <button
              onClick={() => setRightTab('physics')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${
                rightTab === 'physics'
                  ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent)] font-semibold'
                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Physics
            </button>
          </div>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="text-[11px] font-mono text-[var(--studio-muted)] bg-[var(--studio-muted-bg)] px-1.5 py-0.5 rounded-md focus:outline-none cursor-pointer"
          >
            <option value={0.75}>75%</option>
            <option value={0.9}>90%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
          </select>
        </div>

        {/* Inspector Body */}
        {selectedNode ? (
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--studio-divider)] text-[11px]">
            {/* Node Name & Quick Actions */}
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[var(--studio-muted-bg)] rounded-lg px-2 py-1 focus-within:ring-1 focus-within:ring-[var(--studio-accent)]">
                <RoleGlyph
                  role={selectedNode.role}
                  className="w-3.5 h-3.5 shrink-0"
                  color={ROLE_METADATA[selectedNode.role]?.color || theme.accent}
                />
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { name: e.target.value })
                  }
                  className="w-full bg-transparent text-[11px] font-medium text-[var(--studio-text)] focus:outline-none"
                />
              </div>
              <button
                onClick={duplicateSelected}
                className="p-1.5 rounded-lg hover:bg-[var(--studio-muted-bg)] text-[var(--studio-muted)] hover:text-[var(--studio-text)] cursor-pointer"
                title="Duplicate Object"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={deleteSelected}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-[var(--studio-muted)] hover:text-rose-600 cursor-pointer"
                title="Delete Object"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {rightTab === 'spatial' ? (
              <>
                {/* Coordinates & Footprint */}
                <div className="p-3 space-y-2">
                  <div className="font-semibold text-[var(--studio-text)]">
                    Stage Coordinates
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono">
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] w-5 font-sans">X</span>
                      <input
                        type="number"
                        value={selectedNode.x}
                        onChange={(e) =>
                          updateNode(selectedNode.id, { x: Number(e.target.value) })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] w-5 font-sans">Z</span>
                      <input
                        type="number"
                        value={selectedNode.y}
                        onChange={(e) =>
                          updateNode(selectedNode.id, { y: Number(e.target.value) })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] w-5 font-sans">W</span>
                      <input
                        type="number"
                        value={selectedNode.width}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            width: Math.max(16, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] w-5 font-sans">D</span>
                      <input
                        type="number"
                        value={selectedNode.height}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            height: Math.max(16, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                {/* 3D Extrusion & Game Role */}
                <div className="p-3 space-y-2.5">
                  <div className="font-semibold text-[var(--studio-text)]">
                    3D Role & Volume
                  </div>
                  <div>
                    <div className="text-[var(--studio-muted)] mb-1">Semantic Role</div>
                    <select
                      value={selectedNode.role}
                      onChange={(e) => {
                        const newRole = e.target.value as GameRole;
                        const meta = ROLE_METADATA[newRole];
                        updateNode(selectedNode.id, {
                          role: newRole,
                          fill: meta.color,
                          stroke: meta.stroke,
                          extrudeHeight: meta.defaultExtrude,
                        });
                      }}
                      className="w-full bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5 text-[var(--studio-text)] font-medium focus:outline-none"
                    >
                      {(Object.keys(ROLE_METADATA) as GameRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_METADATA[role].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono">
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] mr-1 font-sans">
                        Height
                      </span>
                      <input
                        type="number"
                        value={selectedNode.extrudeHeight}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            extrudeHeight: Number(e.target.value),
                          })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                      <span className="text-[var(--studio-muted)] mr-1 font-sans">
                        Elev Y
                      </span>
                      <input
                        type="number"
                        value={selectedNode.elevation}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            elevation: Number(e.target.value),
                          })
                        }
                        className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Surface Material & Nano Banana AI Texture */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--studio-text)]">
                      Surface Material
                    </span>
                    <button
                      onClick={() => setShowTexturePopover(!showTexturePopover)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[var(--studio-accent)] hover:underline cursor-pointer"
                    >
                      <AiSynthIcon className="w-3 h-3" />
                      <span>AI Texture</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                    <input
                      type="color"
                      value={selectedNode.fill}
                      onChange={(e) =>
                        updateNode(selectedNode.id, { fill: e.target.value })
                      }
                      className="w-4 h-4 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[var(--studio-text)] uppercase flex-1">
                      {selectedNode.fill}
                    </span>
                    <span className="text-[var(--studio-muted)] font-mono">
                      {Math.round((selectedNode.opacity ?? 1) * 100)}%
                    </span>
                  </div>

                  {showTexturePopover && (
                    <div className="p-2.5 rounded-xl bg-[var(--studio-muted-bg)] border border-[var(--studio-border)] space-y-2">
                      <input
                        type="text"
                        value={texturePrompt}
                        onChange={(e) => setTexturePrompt(e.target.value)}
                        placeholder="Describe 3D surface texture..."
                        className="w-full bg-[var(--studio-panel)] border border-[var(--studio-border)] rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[var(--studio-accent)]"
                      />
                      <button
                        onClick={handleGenerateTexture}
                        disabled={isGeneratingTexture}
                        className="w-full py-1.5 rounded-lg bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] text-white text-[11px] font-medium cursor-pointer"
                      >
                        {isGeneratingTexture
                          ? 'Synthesizing...'
                          : 'Apply Nano Banana Texture'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Rim Highlight Section */}
                <div className="p-3 space-y-2">
                  <div className="font-semibold text-[var(--studio-text)]">
                    Wireframe Rim
                  </div>
                  <div className="flex items-center gap-2 bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                    <input
                      type="color"
                      value={selectedNode.stroke}
                      onChange={(e) =>
                        updateNode(selectedNode.id, { stroke: e.target.value })
                      }
                      className="w-4 h-4 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[var(--studio-text)] uppercase flex-1">
                      {selectedNode.stroke}
                    </span>
                    <span className="text-[var(--studio-muted)] font-mono">
                      {selectedNode.strokeWidth}px
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Physics Inspector Tab */
              <div className="p-3 space-y-3">
                <div>
                  <div className="text-[var(--studio-muted)] mb-1">Collider Body</div>
                  <select
                    value={selectedNode.physics}
                    onChange={(e) =>
                      updateNode(selectedNode.id, {
                        physics: e.target.value as CanvasNode['physics'],
                      })
                    }
                    className="w-full bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5 text-[var(--studio-text)] font-medium focus:outline-none"
                  >
                    <option value="static">Static Collider</option>
                    <option value="dynamic">Dynamic Physics Body</option>
                    <option value="kinematic">Kinematic Patrol</option>
                    <option value="sensor">Trigger Sensor</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                    <span className="text-[var(--studio-muted)] mr-1 font-sans">
                      Bounce
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedNode.bounciness}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          bounciness: Number(e.target.value),
                        })
                      }
                      className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
                    <span className="text-[var(--studio-muted)] mr-1 font-sans">
                      Speed
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedNode.speed}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          speed: Number(e.target.value),
                        })
                      }
                      className="w-full bg-transparent text-right text-[var(--studio-text)] focus:outline-none"
                    />
                  </label>
                </div>

                <p className="text-[var(--studio-muted)] leading-relaxed">
                  {ROLE_METADATA[selectedNode.role]?.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-[11px] text-[var(--studio-muted)] space-y-3">
            <div className="font-semibold text-[var(--studio-text)]">
              World Stage Settings
            </div>
            <div className="flex items-center justify-between bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
              <span>3D Skybox</span>
              <span className="font-mono uppercase">{scene.backgroundColor}</span>
            </div>
            <div className="flex items-center justify-between bg-[var(--studio-muted-bg)] rounded-lg px-2.5 py-1.5">
              <span>Base Gravity</span>
              <span className="font-mono">{scene.gravity} m/s²</span>
            </div>
            <p className="leading-relaxed">
              Select any object on the stage blueprint to edit its 3D extrusion volume,
              elevation, or physics role. Click <strong>Generate 3D Game</strong> to
              launch playable probes.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};
