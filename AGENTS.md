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
- Cuando se hable de permisos de "insomnya", interpretarlo como permisos del **DM**. El resto de usuarios
  son **Players**.

## Estado funcional reciente
- Las imágenes de razas se consumen desde `imageBase64` cuando existe. En la ficha se usa `RaceImage` con
  `overflow: hidden` y foco superior de la imagen, no centrado.
- Razas agregadas/curadas recientemente: goblin, aarakocra, orc y dragonborn, con fotos locales convertidas
  a base64 en Mongo.
- En creación de personaje, al pasar de raza a clase el scroll debe volver arriba.
- La ficha muestra salvaciones dentro de habilidades/características, arma visible sin desplegable, combate cerca
  de vida, e información avanzada agrupada en rasgos de raza y habilidades de clase.
- Los hechizos conocidos se limitan por nivel/clase. `Proyectil Mágico` debe tirarse como `1d4+1` por dardo,
  no como `3d4+3`.
- `Armadura de Mago` se activa/desactiva desde el hechizo y usa `armor: "mage-armor"` para CA `13 + DEX`.
- La vida temporal se guarda como `tempHp`, se ve junto con la vida normal, pinta azul en `HpBar`, y el daño
  descuenta primero temporal. En la ficha, el control de vida temporal está debajo de los botones `-5 -1 +1 +5`,
  junto a un botón `Full vida`.
- El tracker también recibe `tempHp` y sincroniza vida/vida temporal entre ficha y combate.
- El botón para entrar al tracker desde la ficha debe decir **Combatir**. La pestaña Tracker dentro de la
  ficha usa filas visualmente equivalentes al tracker principal y permite editar la iniciativa de participantes
  propios (también DM/admin). Si el backend oculta HP de monstruos u otros PJs, la app no debe mostrar textos
  tipo "PV ocultos" ni la CA de esos participantes.
- Al borrar un personaje, invalidar también la query `tracker` para que desaparezca de iniciativa sin esperar
  el siguiente polling.
- Las habilidades destacadas con borde dorado se calculan con `classHighlightsAbility`: deben incluir tanto
  habilidades principales de la clase como salvaciones proficientes (`class.savingThrows`). Ejemplo: Druida
  debe destacar Inteligencia y Sabiduría. Esto aplica a la ficha y al resumen del wizard de creación.

## Backlog solicitado / checklist de QA móvil
Usar esta lista para validar en celular cuando se implementen los cambios pendientes:

- **Roles y usuarios**
  - `insomnya` figura como rol **DM**, no como `admin` visible al usuario.
  - Todos los demás usuarios figuran como **Players**.
  - Los Players existentes tienen `createdBy` apuntando al usuario de `insomnya`.
  - El DM puede crear usuarios nuevos eligiendo `username` y `password`.

- **Privacidad del tracker**
  - Players no ven la vida de bichos/monstruos.
  - Players solo ven vida de sus propios personajes.
  - Players no ven la CA de bichos/monstruos ni textos de placeholder como "PV ocultos".
  - Players sí ven iniciativa y quién tiene el turno.
  - En combate se ve la vida temporal, pero no se puede sumar/editar vida temporal desde ahí.
  - Al tocar `+` o `-` en vida desde combate, aparece un input/modal para indicar cuánto curar o cuánto daño sacar.

- **Vista del DM**
  - En Héroes, el DM ve los personajes de todos los usuarios.
  - En cada héroe visto por el DM se ve a qué usuario pertenece.
  - Las fotos custom de personajes se ven en lista de héroes tanto para el dueño como para el DM.

- **Perfil**
  - En Perfil no se muestra "Servidor" ni la URL/API.

- **Fotos de personaje**
  - En la ficha del personaje, tocar la foto permite subir/elegir una foto del personaje.
  - La foto elegida se guarda en base64.
  - La lista de héroes muestra la foto custom si existe; si no, muestra la foto de raza.

- **Wizard de creación**
  - El botón `Siguiente` aparece flotante.
  - Hay `marginBottom` suficiente para que el botón flotante no tape opciones al scrollear abajo.
  - Esto aplica en selección de raza y clase.
  - La descripción de raza se puede desplegar para leerla completa.

- **Ficha del héroe: Main**
  - La navegación inferior solo aparece dentro de la página del héroe.
  - Sección `Main`: contiene desde cabecera/vida hasta habilidades inclusive.
  - Donde diga "Características", cambiar a "Habilidades".
  - Usar nombres completos: Fuerza, Destreza, Constitución, Inteligencia, Sabiduría, Carisma.
  - Destacar habilidades principales y salvaciones proficientes de la clase con borde diferente.
  - Cualquier card de stat/resumen abre un mini modal explicando para qué sirve (velocidad, CA, tirada de salvación, etc.).
  - Botón de entrada al tracker debe decir `Combatir`.
  - `Información adicional` queda en esta primera sección del nav.
  - `Tracker` también aparece como sección dentro del nav del héroe.

- **Mochila / equipamiento**
  - Sección `Mochila` o `Equipamiento`: monedas + lista de ítems.
  - Se puede escribir un ítem de texto y tocar `+` para agregarlo.
  - Si no hay arma seleccionada, la sección arma muestra borde/estado de advertencia amarillo y texto indicando que falta seleccionar arma.

- **Combate, armas y hechizos**
  - Sección `Hechizos y armas`: armas, hechizos divididos por nivel, recursos como furias/rages y espacios de hechizos.
  - Cambiar el texto `Espacios de conjuro` por `Espacios de hechizos`.
  - `Gestionar hechizos` debe ser más visible.
  - Al seleccionar/deseleccionar hechizos, mostrar una mini animación/loading inmediata mientras espera la llamada al backend.
  - Revisar daño/atributo de armas: armas ligeras/finesse como daga deben usar Destreza o Fuerza según corresponda; no asumir siempre Fuerza.

- **Notas**
  - Sección `Notas` con apartados separados: generales de campaña, NPCs, lugares y otros.

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
