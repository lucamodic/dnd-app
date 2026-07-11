# Dragones & Principiantes 🐉

App Android (Expo / React Native) para jugar D&D con amigos principiantes: creá personajes,
mirá tu vida y stats, subí de nivel, tirá dados y llevá un turn tracker compartido.

## Arranque rápido

```bash
npm install
cp .env.example .env      # poné EXPO_PUBLIC_API_URL (IP de tu compu:4000 en dev)
npm start                 # escaneá el QR con Expo Go, o abrí un emulador
```

- Login con los usuarios del backend: `vero`, `gonza`, `theo`, `ory`, `insomnya` (pass `12345678`).
- `insomnya` es **admin**: controla el turn tracker (agrega/borra bichos, avanza turnos).
- Necesitás el backend `dnd-mongo-backend` corriendo y con datos importados.

## Funciones
- 🧝 **Crear personaje**: elegí raza y clase, se calcula la vida de nivel 1 automáticamente.
- ❤️ **Ficha clara**: vida grande con +/-, características con modificadores, CA, velocidad.
- ⬆️ **Subir de nivel**: tirás el dado de vida (en la mesa o en la app) y se suma con animación.
- 🔮 **Hechizos explicados simple** con botón "Lanzar 2d8" para tirar los dados.
- 🎲 **Tirador de dados** (d4 a d100) con animación y vibración.
- ⚔️ **Turn tracker compartido** (se actualiza solo cada 3s).

## Build del APK
Ver la sección "Build del APK" en **AGENTS.md** (usa `eas build -p android`).

## Documentación
Arquitectura y convenciones completas en **AGENTS.md**.
