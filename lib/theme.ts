/**
 * Tandem design tokens — thème sombre tiré du logo.
 * Fond bleu nuit, cartes ardoise, deux dégradés de marque :
 * turquoise → menthe (toi / l'action principale) et corail → pêche (ton partenaire / l'accent).
 * Titres en Outfit (géométrique, comme le logo), texte en Inter.
 */
export const theme = {
  // Surfaces
  bg: '#182038',
  bgDeep: '#111830',
  card: '#222D47',
  cardTint: '#273453',
  field: '#1B2440',
  line: '#34415F',
  hairline: 'rgba(255,255,255,0.07)',

  // Texte
  ink: '#F8F8F8',
  inkSoft: '#C6CEDC',
  muted: '#8F9BB5',
  onGradient: '#10172B',

  // Marque
  primary: '#2098B8',
  mint: '#62D4B2',
  accent: '#F06880',
  peach: '#F8A070',
  primarySoft: 'rgba(98,212,178,0.14)',
  accentSoft: 'rgba(240,104,128,0.16)',
  // Alias conservés pour le code existant
  primaryDeep: '#111830',
  sand: '#F8A070',
  sandDeep: '#F8A070',
  gold: '#F5C451',

  // Typo
  display: 'Outfit_600SemiBold',
  displayItalic: 'Outfit_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',

  radius: 24,
  radiusSm: 16,
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

export const GRADIENT = {
  me: ['#2098B8', '#62D4B2'] as const,
  partner: ['#F06880', '#F8A070'] as const,
  brand: ['#2098B8', '#62D4B2', '#F8A070', '#F06880'] as const,
  screen: ['#1F2A4C', '#182038'] as const,
};

export const CATEGORY_STYLE = {
  sante: { bg: 'rgba(240,104,128,0.16)', fg: '#F58A9C', label: 'Santé', emoji: '🩺' },
  ecole: { bg: 'rgba(111,168,255,0.16)', fg: '#8DB9FF', label: 'École', emoji: '🎒' },
  logistique: { bg: 'rgba(248,160,112,0.16)', fg: '#F8A070', label: 'Logistique', emoji: '🗓️' },
  maison: { bg: 'rgba(98,212,178,0.16)', fg: '#62D4B2', label: 'Maison', emoji: '🏡' },
  social: { bg: 'rgba(183,156,255,0.16)', fg: '#C3ADFF', label: 'Social', emoji: '🎈' },
  admin: { bg: 'rgba(198,206,220,0.14)', fg: '#C6CEDC', label: 'Admin', emoji: '📎' },
} as const;
