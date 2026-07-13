import { QueryClient } from "@tanstack/react-query";

/**
 * Instancia única, importada tanto por el provider (`app/_layout.tsx`) como por el store de auth
 * (`src/store/auth.ts`). La necesitamos ahí para limpiar el cache al cambiar de sesión: sin esto,
 * los datos scoped a usuario (como "characters") quedaban en cache entre logout/login y un usuario
 * veía por un instante los personajes del usuario anterior hasta que algo más invalidaba la query.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});
