import * as SecureStore from "expo-secure-store";

/**
 * Flags de onboarding, guardados en secure-store por usuario (así cada jugador ve su propio tutorial
 * aunque compartan el celular). Claves saneadas para cumplir el formato de secure-store.
 */
const sanitize = (username: string) => username.replace(/[^a-zA-Z0-9._-]/g, "_");

const introKey = (username: string) => `onb_intro_${sanitize(username)}`;
const heroTourKey = (username: string) => `onb_hero_${sanitize(username)}`;

async function getFlag(key: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(key)) === "1";
  } catch {
    return true; // ante un error de storage, no molestamos con el tutorial
  }
}

async function setFlag(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, "1");
  } catch {
    // si falla el guardado, peor caso: vuelve a mostrarse una vez
  }
}

export const hasSeenIntro = (username: string) => getFlag(introKey(username));
export const markIntroSeen = (username: string) => setFlag(introKey(username));

export const hasSeenHeroTour = (username: string) => getFlag(heroTourKey(username));
export const markHeroTourSeen = (username: string) => setFlag(heroTourKey(username));
