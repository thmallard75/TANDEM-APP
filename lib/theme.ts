/**
 * Tandem design tokens.
 * Direction : "éditorial chaleureux" — papier crème, encre profonde, le turquoise et
 * le corail du logo, le navy du logo comme encre. Serif Fraunces pour les titres,
 * Inter pour le reste. Beaucoup d'air, coins très ronds, ombres douces.
 */
export const theme = {
  // Surfaces
  bg: '#F6F1E8',
  bgDeep: '#EFE7D9',
  card: '#FFFFFF',
  cardTint: '#FBF8F2',
  ink: '#19233C',
  inkSoft: '#46506B',
  muted: '#8A8378',
  line: '#E9E1D3',

  // Marque
  primary: '#1C9C8A',
  primaryDeep: '#19233C',
  primarySoft: '#D7F0EB',
  accent: '#F2744F',
  accentSoft: '#FDE4DA',
  sand: '#D9C5A5',
  sandDeep: '#BFA77F',
  gold: '#E2B23A',

  // Typo
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',

  radius: 22,
  radiusSm: 14,
  shadow: {
    shadowColor: '#2B2419',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
};

export const CATEGORY_STYLE = {
  sante: { bg: '#FDE4DA', fg: '#C2502F', label: 'Santé', emoji: '🩺' },
  ecole: { bg: '#DDE7F7', fg: '#2F4E8C', label: 'École', emoji: '🎒' },
  logistique: { bg: '#FBEBC9', fg: '#8A5A0E', label: 'Logistique', emoji: '🗓️' },
  maison: { bg: '#D7F0EB', fg: '#15756A', label: 'Maison', emoji: '🏡' },
  social: { bg: '#EBDDF5', fg: '#6B3F94', label: 'Social', emoji: '🎈' },
  admin: { bg: '#E8E6E1', fg: '#55514A', label: 'Admin', emoji: '📎' },
} as const;
