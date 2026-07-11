# AGENTS.md — dnd-app

Guía de ingeniería para agentes de IA (y humanos) que trabajen en la app.

## Qué es
App **Android** (Expo / React Native) para que jugadores **principiantes** de D&D creen personajes,
vean su vida y stats, suban de nivel, tiren dados y usen un **turn tracker compartido**.
Consume el backend `dnd-mongo-backend`.

## Stack
- **Expo SDK 54** (React 19, React Native 0.81, Reanimated 4) + **expo-router** (carpeta `app/`)
- **TypeScript** (paths `@/*` → `src/*`)
- **@tanstack/react-query** (datos del backend + polling del tracker)
- **zustand** (sesión/auth) + **expo-secure-store** (token persistido)
- **moti** + **react-native-reanimated 4** (+ `react-native-worklets`, peer de reanimated 4), **expo-haptics**
- **expo-linear-gradient**, **@expo/vector-icons** (Ionicons)
- Fuentes: **Cinzel** (títulos) e **Inter** (cuerpo) vía `@expo-google-fonts`

## Estructura
```
app/                       # rutas (expo-router)
  _layout.tsx              # providers: QueryClient, DiceProvider, fuentes, auth hydrate
  index.tsx                # redirige a /login o /(tabs) según sesión
  login.tsx
  (tabs)/                  # tab bar: Héroes / Dados / Combate / Perfil
    _layout.tsx
    index.tsx              # lista de personajes
    dice.tsx               # tirador de dados
    tracker.tsx            # turn tracker (polling 3s)
    profile.tsx
  character/
    new.tsx                # wizard: raza -> clase -> características (4d6, reroll) -> nombre
    [id].tsx               # ficha: HP/stats/CA/iniciativa editables, DC salvación, hechizos conocidos
  spells/[id].tsx          # gestionar hechizos conocidos (todos los de la clase, por nivel)
src/
  theme.ts                 # paleta y tokens de diseño
  api/client.ts            # fetch wrapper (token, {data}/{error})
  api/hooks.ts             # hooks de react-query + tipos (espejo del backend)
  store/auth.ts            # zustand + secure-store
  lib/dice.ts              # parseo/tirada de notación de dados ("2d8", "1d6+3")
  lib/format.ts            # modificadores, labels de características, etc.
  lib/sheet.ts             # skills, salvaciones, progresión por nivel (slots/recursos/features)
  components/              # Screen, Text, Button, Card, HpBar, RollButton
    dice/DiceProvider.tsx  # modal global de dados (useDice().roll("2d8"))
    sheet/                 # secciones de la ficha: Section, Pips, sections.tsx
                           # (monedas, competencias, salvaciones, rasgos, habilidades, recursos, slots)
```

## Paleta (definida en `src/theme.ts`)
`#060407` fondo · `#221932` superficies · `#541533` primario · `#722548` secundario ·
`#775E88` bordes/atenuado · `#9882B9` acentos. Usar SIEMPRE los tokens de `colors`, no hex sueltos.

## Convenciones
- **Todo el acceso a red** pasa por `src/api/hooks.ts` (react-query). No usar `fetch` suelto en pantallas.
- Textos de cara al usuario, comentarios y nombres visibles en **español**.
- Componentes de UI reutilizables viven en `src/components`; nada de estilos ad-hoc repetidos.
- Para tirar dados desde cualquier lado: `const { roll } = useDice(); roll("2d8", "Etiqueta")`.
- Animaciones con `moti` (`MotiView`), no con Animated crudo.
- El token se guarda en secure-store; si el backend responde 401, `client.ts` desloguea solo.

## Config del backend
`EXPO_PUBLIC_API_URL` en `.env` (o `app.json` → extra). En desarrollo, usar la **IP de la compu**
(no `localhost`) para que el celular alcance el server. En prod, la URL de Vercel.

## Correr
```bash
npm install
cp .env.example .env      # completá EXPO_PUBLIC_API_URL
npm start                 # abrí con Expo Go (QR) o emulador
npm run typecheck         # tsc --noEmit
```

## Probar en desarrollo
- **Expo Go (recomendado)**: `npm start`, escaneá el QR con la app Expo Go en un Android real.
  El celular y la compu deben estar en la misma red Wi-Fi. `EXPO_PUBLIC_API_URL` debe apuntar a
  la IP local de la compu (`ifconfig | grep "inet "` en Mac), no a `localhost`.
- **Emulador Android en Mac**: instalá Android Studio, creá un AVD, y con `npm start` corriendo
  apretá `a` en la terminal (o `npm run android`).

## Build del APK (para compartir con amigos, sin Expo Go)
El perfil `preview` de `eas.json` genera un **APK instalable** (no el AAB de Play Store).
**Importante**: `EXPO_PUBLIC_API_URL` se hornea en el build. Se configura en el dashboard de
Expo (expo.dev → tu proyecto → **Environment Variables** → agregar `EXPO_PUBLIC_API_URL` en el
ambiente **Preview**, apuntando al backend **deployado** en Vercel, no a tu IP local).

```bash
npm install -g eas-cli
eas login                                 # cuenta de Expo
eas init                                  # vincula el proyecto a tu organización (una vez)
eas build -p android --profile preview    # compila en la nube, ~10-15 min
```
Al terminar te da un link de descarga del `.apk`. Se lo pasás a tus amigos: en el Android tienen
que permitir "instalar apps de origen desconocido" y abrir el archivo.

Después, `eas update` permite pushear cambios de JS sin recompilar el APK entero.

## Reglas para cambios
- Pantallas nuevas = archivo en `app/` (expo-router las enruta solo).
- Datos nuevos del backend = agregá el hook en `api/hooks.ts` (con su tipo).
- Antes de terminar, corré `npm run typecheck`.
- Mantené la coherencia visual: tokens del tema, `Card`/`Button`/`Text`, animaciones sutiles.
