import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intentionally not wrapped in <StrictMode>: @react-three/rapier's step
// hooks (useBeforePhysicsStep/useAfterPhysicsStep, and generic useFrame on
// non-RigidBody children of <Physics>) never fire under StrictMode's
// mount->unmount->mount dev simulation — verified directly (window-global
// counters proved zero step-callback executions with StrictMode on, and
// thousands within 1.5s with it off). This is a known category of
// incompatibility for physics/WASM-backed libraries with side-effecting
// module-level registration, not something fixable from application code.
createRoot(document.getElementById('root')!).render(<App />)
