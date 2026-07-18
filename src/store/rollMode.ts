import { create } from "zustand";
import { RollMode } from "@/lib/dice";

interface RollModeState {
  mode: RollMode;
  setMode: (mode: RollMode) => void;
  /** Devuelve el modo actual y lo resetea a "normal", para que no quede pegado tras una tirada. */
  consumeMode: () => RollMode;
}

/**
 * Modo de tirada (normal / ventaja / desventaja) compartido por los botones de tirar de la ficha.
 * Es un store zustand (no context) para que cambiar el modo re-renderice SOLO el selector y no toda
 * la ficha: los botones de tirar leen `consumeMode` (referencia estable, no se re-suscriben a `mode`).
 */
export const useRollMode = create<RollModeState>((set, get) => ({
  mode: "normal",
  setMode: (mode) => set({ mode }),
  consumeMode: () => {
    const current = get().mode;
    if (current !== "normal") set({ mode: "normal" });
    return current;
  },
}));
