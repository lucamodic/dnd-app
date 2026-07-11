/**
 * Sistema de diseño. Paleta pedida por el usuario:
 * #541533 #722548 #221932 #060407 #775E88 #9882B9
 */
export const colors = {
  bg: "#060407", // fondo casi negro
  surface: "#221932", // cards / superficies
  surfaceAlt: "#2b2140", // superficie un poco más clara
  primary: "#541533", // vino oscuro (acento principal)
  secondary: "#722548", // vino (gradientes / secundario)
  muted: "#775E88", // púrpura apagado (bordes / texto atenuado)
  accent: "#9882B9", // lavanda claro (highlights / texto destacado)

  text: "#F3EEFA",
  textDim: "#B7A9CE",
  textFaint: "#775E88",

  success: "#5FC28A",
  danger: "#E0556B",
  warning: "#E8C25A",

  hp: "#E0556B",
  hpTrack: "#3a2440",

  border: "rgba(152,130,185,0.18)",
  overlay: "rgba(6,4,7,0.7)",
} as const;

export const gradients = {
  wine: ["#722548", "#541533"] as const,
  royal: ["#541533", "#221932"] as const,
  lavender: ["#9882B9", "#722548"] as const,
  night: ["#221932", "#060407"] as const,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const font = {
  display: "Cinzel_700Bold",
  displaySemi: "Cinzel_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
};
