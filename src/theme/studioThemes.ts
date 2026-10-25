export type StudioThemeId = 'mineral_teal' | 'alabaster_terracotta' | 'porcelain_iris';

export interface StudioTheme {
  id: StudioThemeId;
  name: string;
  tagline: string;
  swatchColor: string;
  canvasBackdrop: string;      // Outer infinite workspace color (replaces Figma #e5e5e5)
  shellBg: string;             // App sub-pages background (replaces #f5f5f5)
  panelBg: string;             // Floating card/panel surface
  panelMutedBg: string;        // Subtle input/pill fill (replaces #f5f5f5)
  panelHoverBg: string;        // Subtle hover state
  borderColor: string;         // Crisp architectural border
  dividerColor: string;        // Subtle section divider
  textPrimary: string;         // Main ink color
  textSecondary: string;       // Muted label color
  accent: string;              // Primary brand action color (replaces Figma #0d99ff)
  accentHover: string;         // Darker hover state for primary buttons
  accentSoft: string;          // Soft selection tint (replaces Figma #e5f4ff)
  accentBorder: string;        // Selection border tint
  artboardBg: string;          // 2D blueprint stage background
  artboardGrid: string;        // Blueprint dot/cross grid color
  platformFill: string;        // Default clean platform fill on blueprint
  platformStroke: string;      // Default clean platform border on blueprint
}

export const STUDIO_THEMES: Record<StudioThemeId, StudioTheme> = {
  mineral_teal: {
    id: 'mineral_teal',
    name: 'Nordic Mineral & Teal',
    tagline: 'Soft sage-stone workspace with deep verdigris teal accents',
    swatchColor: '#0d9488',
    canvasBackdrop: '#e9efec',
    shellBg: '#f1f5f3',
    panelBg: '#ffffff',
    panelMutedBg: '#f3f7f5',
    panelHoverBg: '#e8efec',
    borderColor: '#d8e2dd',
    dividerColor: '#e9efec',
    textPrimary: '#142420',
    textSecondary: '#5c706a',
    accent: '#0d9488',
    accentHover: '#0f766e',
    accentSoft: '#e6f7f5',
    accentBorder: '#99f6e4',
    artboardBg: '#fcfefd',
    artboardGrid: '#dbe5e0',
    platformFill: '#eef4f1',
    platformStroke: '#b8ccc2',
  },
  alabaster_terracotta: {
    id: 'alabaster_terracotta',
    name: 'Warm Alabaster & Craft Orange',
    tagline: 'Architectural limestone paper with industrial terracotta accents',
    swatchColor: '#e04f16',
    canvasBackdrop: '#efeae2',
    shellBg: '#f6f3ee',
    panelBg: '#fffdfa',
    panelMutedBg: '#f5f1ea',
    panelHoverBg: '#ebe5dc',
    borderColor: '#e2d9cc',
    dividerColor: '#efeae2',
    textPrimary: '#221d17',
    textSecondary: '#73685b',
    accent: '#e04f16',
    accentHover: '#c2410c',
    accentSoft: '#fff1eb',
    accentBorder: '#fdba74',
    artboardBg: '#fffefb',
    artboardGrid: '#e6dfd3',
    platformFill: '#f5f0e6',
    platformStroke: '#d4c8b4',
  },
  porcelain_iris: {
    id: 'porcelain_iris',
    name: 'Cool Porcelain & Studio Iris',
    tagline: 'Crisp pearl-slate surface with electric indigo-violet accents',
    swatchColor: '#4f46e5',
    canvasBackdrop: '#eaecf4',
    shellBg: '#f3f4f9',
    panelBg: '#ffffff',
    panelMutedBg: '#f4f5fa',
    panelHoverBg: '#e9ebf5',
    borderColor: '#dce0ee',
    dividerColor: '#ecedf6',
    textPrimary: '#16192b',
    textSecondary: '#646982',
    accent: '#4f46e5',
    accentHover: '#4338ca',
    accentSoft: '#eef2ff',
    accentBorder: '#c7d2fe',
    artboardBg: '#fcfcff',
    artboardGrid: '#dfe2f0',
    platformFill: '#f1f3f9',
    platformStroke: '#c5cbe0',
  },
};
