import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @react-three/rapier pulls in its own dependency graph that can
    // otherwise resolve a second copy of three/react/@react-three/fiber —
    // observed once as "Multiple instances of Three.js being imported" plus
    // a fatal "Invalid hook call" (rapier's RigidBody/useFrame ending up on
    // a different React/Fiber instance than the rest of the app). Dedupe
    // forces one shared instance of each.
    dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
  },
})
