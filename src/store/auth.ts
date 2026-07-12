import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "@/api/queryClient";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: "dm" | "player" | "admin" | "user";
  createdBy?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = "dnd_token";
const USER_KEY = "dnd_user";

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  setSession: async (token, user) => {
    // Limpiamos el cache de react-query ANTES de guardar la sesión nueva: si no, al loguearse
    // como otro usuario se seguían viendo (por un instante, hasta que algo más invalidara la
    // query) los personajes/datos scoped al usuario anterior, porque el queryClient es un
    // singleton que sobrevive al logout/login.
    queryClient.clear();
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    queryClient.clear();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userRaw = await SecureStore.getItemAsync(USER_KEY);
      set({
        token: token || null,
        user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
        hydrated: true,
      });
    } catch {
      // Si SecureStore falla, arrancamos sin sesión en vez de quedar colgados en la splash.
      set({ token: null, user: null, hydrated: true });
    }
  },
}));
