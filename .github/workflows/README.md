# COSMOTION — Move Beyond Limits. Explore Beyond Stars.
React + TypeScript + Vite + MediaPipe Tasks Vision.

    npm install
    npm run dev      # http://localhost:5173 (camera works on localhost / HTTPS)
    npm run build    # production build in dist/

Structure: src/App.tsx (screens), src/Game.tsx (ASTRA canvas game), src/camera.ts (hand tracking, camera released on exit),
src/i18n.ts (EN/KK/RU), src/store.ts (LocalStorage progress/settings), src/styles.css.
Hand model and WASM load from CDN at runtime (internet needed for camera mode). Video is never recorded or sent anywhere.
ORBIT and NOVA are marked "Coming soon". COSMOTION is a learning game, not a medical device.
