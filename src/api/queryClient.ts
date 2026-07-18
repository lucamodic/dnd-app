import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";
import { showGlobalToast } from "@/components/Toast";

/** Mensaje de toast para un error de query/mutation, o `null` si no hace falta avisar (ej. 401: ya desloguea solo). */
function toastMessageFor(error: unknown): string | null {
  if (error instanceof ApiError) {
    if (error.status === 401) return null;
    return error.message || "No se pudo completar la acción.";
  }
  return "No se pudo conectar con el servidor. Revisá tu conexión.";
}

/**
 * Instancia única, importada tanto por el provider (`app/_layout.tsx`) como por el store de auth
 * (`src/store/auth.ts`). La necesitamos ahí para limpiar el cache al cambiar de sesión: sin esto,
 * los datos scoped a usuario (como "characters") quedaban en cache entre logout/login y un usuario
 * veía por un instante los personajes del usuario anterior hasta que algo más invalidaba la query.
 *
 * `queryCache`/`mutationCache` con `onError` global: sin esto, la mayoría de las mutaciones (vida,
 * hechizos, descanso, notas...) fallaban en silencio si el backend no respondía. Ahora avisan con un
 * toast (ver `src/components/Toast.tsx`), sin tener que repetir manejo de error en cada pantalla.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const msg = toastMessageFor(error);
      if (msg) showGlobalToast(msg, "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = toastMessageFor(error);
      if (msg) showGlobalToast(msg, "error");
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});
