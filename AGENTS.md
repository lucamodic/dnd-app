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
  lib/conditions.ts        # estados/conditions D&D en español para el tracker
  lib/format.ts            # modificadores, labels de características, etc.
  lib/sheet.ts             # skills, salvaciones, progresión por nivel (slots/recursos/features)
  components/              # Screen, Text, Button, Card, HpBar, RollButton
    Skeleton.tsx           # skeletons reutilizables para cargas de listas/cards
    dice/DiceProvider.tsx  # modal global de dados (useDice().roll("2d8"))
    sheet/                 # secciones de la ficha: Section, Pips, sections.tsx
                           # (monedas, competencias, salvaciones, rasgos, habilidades, recursos, slots)
```

## Paleta (definida en `src/theme.ts`)
`#060407` fondo · `#221932` superficies · `#541533` primario · `#722548` secundario ·
`#775E88` bordes/atenuado · `#9882B9` acentos. Usar SIEMPRE los tokens de `colors`, no hex sueltos.

## Convenciones
- **Todo el acceso a red** pasa por `src/api/hooks.ts` (react-query). No usar `fetch` suelto en pantallas.
- Catálogos del backend (razas, clases, hechizos, armas) se consumen con hooks de `src/api/hooks.ts`.
  Las armas tienen fallback local en `src/data/weapons.ts` para no romper combate si `/weapons` todavía no cargó.
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
- Razas agregadas/curadas: goblin, aarakocra, orc, kenku, kobold, shifter, dragonborn, satyr, tabaxi, firbolg,
  fairy, changeling, aasimar, githyanki, harengon, sea-elf y tortle. Las fotos locales se convierten a base64
  y se suben directo a Mongo (`imageBase64`) desde el backend; no dependen de una URL pública. Si una raza
  nueva no tiene archivo local, debe usar fallback visual hasta que se agregue la imagen.
- Razas MPMM usan `flexibleAbilityBonuses`: la app muestra "Aumento: +2/+1 flexible según clase" en el wizard,
  y el backend aplica el bono al crear.
- Usar skeletons (`SkeletonCard`) cuando cargan listas grandes o críticas: selección de razas, selección de clases
  y `Gestionar hechizos`.
- En creación de personaje, al pasar de raza a clase el scroll debe volver arriba.
- La ficha muestra salvaciones dentro de habilidades/características, arma visible sin desplegable, combate cerca
  de vida, e información avanzada agrupada en rasgos de raza y habilidades de clase.
- Los hechizos conocidos se limitan por nivel/clase. `Proyectil Mágico` debe tirarse como `1d4+1` por dardo,
  no como `3d4+3`.
- Los hechizos conocidos que tengan `higherLevel` deben mostrar una sección **A niveles más altos** al desplegar
  la card en la ficha, para explicar qué mejora si se usan con un espacio de hechizo superior.
- Al tocar **Lanzar hechizo** en la ficha, los hechizos de nivel 1+ deben abrir un modal para elegir el nivel
  del espacio disponible. Al confirmar, se tira el daño ajustado por `higherLevel` cuando el texto permite inferir
  dados extra (`aumenta 1d6`, `dardo adicional`, `rayo adicional`, etc.) y se marca automáticamente ese espacio
  como usado en `spellSlotsUsed`. Si el personaje solo tiene espacios del nivel base del hechizo, o si el hechizo
  no tiene mejora aplicable a niveles más altos, debe tirar directo con botón `Lanzar XdY` y consumir el primer
  espacio disponible sin abrir selector. Los trucos tiran directo y no consumen espacios.
- `Armadura de Mago` se activa/desactiva desde el hechizo y usa `armor: "mage-armor"` para CA `13 + DEX`.
- La vida temporal se guarda como `tempHp`, se ve junto con la vida normal, pinta azul en `HpBar`, y el daño
  descuenta primero temporal. En la ficha, el control de vida temporal está debajo de los botones `-5 -1 +1 +5`,
  junto a un botón `Full vida`.
- El tracker también recibe `tempHp` y sincroniza vida/vida temporal entre ficha y combate.
- El tracker también tiene `conditions` por participante. Se muestran como chips en el tracker principal y en la
  pestaña Tracker de la ficha. DM/admin puede editar estados de cualquier héroe/bicho; Players solo de sus héroes.
  La lista estándar está en `src/lib/conditions.ts`.
- El botón para entrar al tracker desde la ficha debe decir **Combatir**. La pestaña Tracker dentro de la
  ficha usa filas visualmente equivalentes al tracker principal y permite editar la iniciativa de participantes
  propios (también DM/admin). Si el backend oculta HP de monstruos u otros PJs, la app no debe mostrar textos
  tipo "PV ocultos" ni la CA de esos participantes.
- Al borrar un personaje, invalidar también la query `tracker` para que desaparezca de iniciativa sin esperar
  el siguiente polling.
- Las habilidades destacadas con borde dorado se calculan con `classHighlightsAbility` y dependen SOLO de
  `class.savingThrows` (2 por clase, regla oficial). Antes también miraba el texto libre `primaryAbility`
  ("Fuerza o Destreza" en Guerrero), lo que hacía que clases con característica principal flexible mostraran
  3 destacadas en vez de 2 — se sacó esa parte porque confundía. `primaryAbility` se sigue mostrando aparte
  como texto informativo. Esto aplica a la ficha y al resumen del wizard de creación.
- El ojito de concentración en hechizos es tocable: al tocarlo debe abrir un modal explicando concentración sin
  desplegar/cerrar la card del hechizo.
- Las armas ahora vienen de Mongo por `GET /weapons` (`useWeapons`). La ficha mantiene fallback con
  `src/data/weapons.ts`, pero todo lo nuevo debe ir a DB.
- Si el usuario es DM/admin, en la sección de armas del héroe aparece `Crear arma`. Ese flujo llama `POST /weapons`,
  crea el arma custom en Mongo y la equipa/asigna al personaje actual. Players no ven ese botón.
- Las armas naturales/raciales (`natural-talons`, `dragonborn-breath`) existen en el catálogo y se suman por raza
  con `naturalWeaponIndexesForRace`.
- El `QueryClient` de react-query es un singleton exportado desde `src/api/queryClient.ts` (usado tanto por el
  `QueryClientProvider` en `app/_layout.tsx` como por `src/store/auth.ts`). `setSession`/`logout` llaman
  `queryClient.clear()`: sin eso, el cache (scoped a usuario, ej. "characters") sobrevivía entre sesiones y al
  cambiar de usuario se veían por un instante los personajes del usuario anterior.
- `WeaponSection` (`src/components/sheet/sections.tsx`) permite tener **varias armas a la vez**
  (`character.weapons`, sin concepto de "una equipada"): botón "Agregar arma" suma una nueva a la lista;
  tocar una card de arma existente abre `WeaponModal` para **reemplazar esa arma puntual** (no agrega otra);
  cada arma no racial tiene una `X` para eliminarla, oculta si es la única que queda (siempre debe quedar
  al menos una, salvo que tampoco tenga armas raciales). `WeaponModal` (`src/components/sheet/editors.tsx`)
  aplica al toque (sin botón "Guardar" aparte) y no sabe si está agregando o reemplazando — eso lo decide
  `WeaponSection` según qué slot disparó el picker (`pickerFor: string | "new" | null`). `character.weapon`
  (campo legacy singular) se sigue mandando como `weapons[0]` por compatibilidad, pero ya no se usa para
  mostrar un estado "equipada" en la UI.
- El toggle "Permitir que los players suban de nivel" (`Tracker.levelUpEnabled`) vive en la pestaña **DM**
  (`app/(tabs)/dm.tsx`), no en la ficha de cada héroe — antes estaba repetido en cada personaje, lo que
  no tenía sentido porque es una config global del tracker. La ficha solo muestra el aviso de "todavía no
  habilitado" a los Players cuando corresponde.
- La configuración global del DM ahora vive en la pestaña **DM** (`app/(tabs)/dm.tsx`), visible solo para
  `dm/admin`: toggle de subida de nivel, creación de Players, creación de armas custom y acceso a crear bichos
  desde el tracker. `Perfil` queda para datos de cuenta y logout, con un acceso a esa pestaña para DM.
- Descanso corto/largo: botones en la card de vida de la ficha (`app/character/[id].tsx`) abren `RestModal`
  (`src/components/sheet/editors.tsx`). Descanso largo llama `POST /characters/:id/full-rest` sin pedir nada
  más. Descanso corto deja elegir cuántos dados de golpe gastar (tope = `level - hitDiceUsed`) y cómo
  obtener cada resultado: "Tirar en la app" (usa `rollDie` de `src/lib/dice.ts`, no el modal global de
  `useDice` porque ahí no se puede leer el resultado numérico) o cargar a mano lo que salió tirando en la
  vida real; junto manda `POST /characters/:id/short-rest` con `{ rolls: number[] }`.
- Bono racial flexible (+2/+1 de razas MPMM) en el wizard de creación: `raceAbilityBonusPreview` en
  `src/lib/format.ts` muestra, ANTES de crear el personaje, en qué característica va a caer cada bono y por
  qué (evita desperdiciar puntos contra el tope de 20 — replica `pickFlexibleRaceBonusTargets` del backend).
- El modal de subir de nivel debe usar entrada sobria (`opacity`/`translateY` con timing corto), no spring con
  escala grande, porque en celular se siente saltarín.
- `noteSections` incluye la sección `characterInfo` ("Información del personaje") además de generales,
  campaña, NPCs, lugares y otros. Requiere el campo homónimo en el modelo Mongo para que no se pierda al guardar.
- Las filas expandibles de inventario/hechizos/rasgos no deben animar `height: "auto"`; en Android puede dejar
  espacio fantasma al cerrar. Usar fade simple o dimensiones medidas.
- Catálogos de backend (`races`, `classes`, `subclasses`, `spells`, `monsters`, `weapons`) usan cache de 24h
  con `placeholderData` para mostrar datos viejos mientras refetchean. La selección de hechizos actualiza cache
  optimista con objetos `Spell` desde el catálogo para evitar espera visual. En `Gestionar hechizos`, abrir/cerrar
  niveles debe ser estado local liviano: no disparar requests ni montar filas con `Card` animado. La animación va
  en el contenedor completo del nivel (fade/slide corto), no por fila. Los niveles bloqueados empiezan cerrados.
- En formularios de armas no usar abreviaturas como `C/C` o `Dist.`; mostrar categorías completas:
  "Simple cuerpo a cuerpo", "Simple a distancia", "Marcial cuerpo a cuerpo", "Marcial a distancia".
  Esos selectores deben responder con `onPressIn` y cerrar teclado (`Keyboard.dismiss`) para que el teclado
  no capture el primer toque al pasar desde un `TextInput` a otra categoría.

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
