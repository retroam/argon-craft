import React from 'react';
import { GameRole } from '../types';

interface IconProps {
  className?: string;
  accentColor?: string;
}

/**
 * ArgonCraft 3D Brand Emblem — Isometric Split-Prism & Extruded Plane
 * Replaces the 4-dot Figma logo with a signature 2D-to-3D architectural mark.
 */
export const ArgonPrismLogo: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  accentColor = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top Isometric Diamond Plane */}
    <path
      d="M12 2.5L20.5 7.25L12 12L3.5 7.25L12 2.5Z"
      fill={accentColor}
      fillOpacity="0.22"
      stroke={accentColor}
      strokeWidth="1.65"
      strokeLinejoin="round"
    />
    {/* Left Extruded Facet */}
    <path
      d="M3.5 7.25V16.25L12 21V12"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right Extruded Facet */}
    <path
      d="M20.5 7.25V16.25L12 21"
      stroke={accentColor}
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Floating Core Vertex */}
    <circle cx="12" cy="7.25" r="1.4" fill={accentColor} />
  </svg>
);

/**
 * Stage Blueprint Icon — Isometric Grid Plane (replaces Figma's "#" Frame icon)
 */
export const StageBlueprintIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M8 2L14.5 5.6L8 9.2L1.5 5.6L8 2Z"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinejoin="round"
    />
    <path
      d="M1.5 8.8L8 12.4L14.5 8.8"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.65"
    />
    <path
      d="M1.5 11.4L8 15L14.5 11.4"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.35"
    />
  </svg>
);

/**
 * Tool 1: Spatial Vector Select Cursor (with precision crosshair)
 */
export const ToolSelectIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 18 18" fill="none" className={className}>
    <path
      d="M3.5 2.75L14.25 7.6L9.4 9.4L7.6 14.25L3.5 2.75Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M9.6 9.6L14.25 14.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Tool 2: 3D Extruded Platform Slab Tool (replaces flat Figma rectangle icon)
 */
export const ToolPlatformIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 18 18" fill="none" className={className}>
    <rect
      x="2.5"
      y="3"
      width="13"
      height="8.5"
      rx="2"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M2.5 9.5V12.5C2.5 13.6 3.4 14.5 4.5 14.5H13.5C14.6 14.5 15.5 13.6 15.5 12.5V9.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.5 11.5V14.5M11.5 11.5V14.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeOpacity="0.6"
    />
  </svg>
);

/**
 * Tool 3: Orbital Node / Emitter Tool (replaces flat Figma circle icon)
 */
export const ToolOrbIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 18 18" fill="none" className={className}>
    <circle
      cx="9"
      cy="9"
      r="5.75"
      fill="currentColor"
      fillOpacity="0.15"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <ellipse
      cx="9"
      cy="9"
      rx="7.5"
      ry="2.6"
      transform="rotate(-22 9 9)"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeOpacity="0.75"
    />
    <circle cx="9" cy="9" r="1.6" fill="currentColor" />
  </svg>
);

/**
 * Tool 4: Faceted Prism / Sentinel Tool (replaces flat Figma triangle icon)
 */
export const ToolSentinelIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 18 18" fill="none" className={className}>
    <path
      d="M9 2.25L15.5 9L9 15.75L2.5 9L9 2.25Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M9 2.25V15.75M2.5 9H15.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeOpacity="0.65"
    />
  </svg>
);

/**
 * Tool 5: Spatial Orbit / Pan Compass Tool (replaces Figma hand icon)
 */
export const ToolNavigateIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 18 18" fill="none" className={className}>
    <path
      d="M9 2.25V15.75M2.25 9H15.75"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
    <path
      d="M6.75 4.25L9 2L11.25 4.25M6.75 13.75L9 16L11.25 13.75M4.25 6.75L2 9L4.25 11.25M13.75 6.75L16 9L13.75 11.25"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Launch 3D Cube-Play Icon
 */
export const LaunchCubeIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M4.5 2.75L13.25 8L4.5 13.25V2.75Z"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Benchmark Scale / Model Arsenal Icon
 */
export const BenchmarkScaleIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <rect x="2" y="8.5" width="2.8" height="5.5" rx="0.8" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.3" />
    <rect x="6.6" y="4.5" width="2.8" height="9.5" rx="0.8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.3" />
    <rect x="11.2" y="2" width="2.8" height="12" rx="0.8" fill="currentColor" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/**
 * AI Synth Prism / Texture Spark Icon
 */
export const AiSynthIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M8 1.5L9.65 6.35L14.5 8L9.65 9.65L8 14.5L6.35 9.65L1.5 8L6.35 6.35L8 1.5Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Palette Swatch Icon for Light Theme Switcher
 */
export const ThemePaletteIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 2A6 6 0 0 1 14 8H8V2Z" fill="currentColor" fillOpacity="0.28" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
);

/**
 * Bespoke 3D Game Role Icon — Distinct vector glyph for all 10 semantic roles
 */
export const RoleGlyph: React.FC<{
  role: GameRole;
  className?: string;
  color?: string;
}> = ({ role, className = 'w-4 h-4', color = 'currentColor' }) => {
  switch (role) {
    case 'player_spawn':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <ellipse
            cx="9"
            cy="13.2"
            rx="5.8"
            ry="2.3"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.45"
          />
          <circle cx="9" cy="6.2" r="2.6" fill={color} />
          <path
            d="M9 9.5V13"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'platform':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M9 3L15.8 6.6L9 10.2L2.2 6.6L9 3Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path
            d="M2.2 6.6V11.2L9 14.8L15.8 11.2V6.6"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M9 10.2V14.8" stroke={color} strokeWidth="1.35" />
        </svg>
      );
    case 'wall':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <rect
            x="4"
            y="2.5"
            width="10"
            height="13"
            rx="1.8"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.45"
          />
          <path
            d="M4 7H14M4 11.5H14M9 2.5V7M7 7V11.5M11 11.5V15.5"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
        </svg>
      );
    case 'hazard':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M2.5 13.5L5.8 5.5L9 12L12.2 5.5L15.5 13.5H2.5Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'enemy_patrol':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M9 2.2L15.2 9L9 15.8L2.8 9L9 2.2Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="9" r="2" fill={color} />
        </svg>
      );
    case 'collectible':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M9 2L13.8 7.2L9 16L4.2 7.2L9 2Z"
            fill={color}
            fillOpacity="0.25"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M4.2 7.2H13.8" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'jump_pad':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M5 8.5L9 4.5L13 8.5M5 12.5L9 8.5L13 12.5"
            stroke={color}
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 15H14.5"
            stroke={color}
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'goal_portal':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <circle
            cx="9"
            cy="9"
            r="6.2"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <circle
            cx="9"
            cy="9"
            r="3.6"
            fill={color}
            fillOpacity="0.25"
            stroke={color}
            strokeWidth="1.4"
          />
          <circle cx="9" cy="9" r="1.3" fill={color} />
        </svg>
      );
    case 'movable_crate':
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <rect
            x="3.2"
            y="3.2"
            width="11.6"
            height="11.6"
            rx="2.2"
            fill={color}
            fillOpacity="0.2"
            stroke={color}
            strokeWidth="1.45"
          />
          <path
            d="M3.5 3.5L14.5 14.5M14.5 3.5L3.5 14.5"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity="0.65"
          />
        </svg>
      );
    case 'decoration':
    default:
      return (
        <svg viewBox="0 0 18 18" fill="none" className={className}>
          <path
            d="M9 2.2L13 5.2V14.8H5V5.2L9 2.2Z"
            fill={color}
            fillOpacity="0.2"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M3 14.8H15" stroke={color} strokeWidth="1.45" strokeLinecap="round" />
        </svg>
      );
  }
};
