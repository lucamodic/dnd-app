# CLAUDE.md

Esta app sigue las convenciones descritas en **@AGENTS.md**. Leé ese archivo primero:
tiene el stack (Expo + expo-router + react-query + zustand + moti), la estructura de carpetas,
la paleta y cómo correr/buildear.

## Recordatorios rápidos para Claude
- Todo el acceso a red va por `src/api/hooks.ts` (react-query); nunca `fetch` suelto en pantallas.
- Usá los tokens de `src/theme.ts` (`colors`, `radius`, `font`), no colores hex sueltos.
- Textos, comentarios y nombres visibles en **español**.
- Para tirar dados: `useDice().roll("2d8", "Etiqueta")` (modal global animado).
- Animaciones con `moti`. Componentes base: `Screen`, `Text`, `Button`, `Card`, `HpBar`, `RollButton`.
- `EXPO_PUBLIC_API_URL` apunta al backend; en dev usar la IP de la compu, no localhost.
- Antes de terminar un cambio: `npm run typecheck`.
