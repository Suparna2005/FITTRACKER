# Memory & State Management

## Frontend (React)
1. **React State (`useState`):** Used for standard UI interactions (modal toggles, active tabs, form inputs).
2. **React Refs (`useRef`):** Critically used for the high-frequency computer vision loops (MediaPipe). Storing `poseRef`, `handsRef`, `videoRef`, and `repCount` in refs allows the `processFrame` loop running at 60 FPS to execute without triggering expensive React re-renders.
3. **Local Storage:** `fitnessUserId` is stored in the browser's `localStorage` to persist user sessions without requiring a full JWT authentication flow for this MVP.

## Backend (FastAPI)
- **Stateless Architecture:** The backend API is completely stateless. Every request from the frontend carries the necessary context (like user ID or Base64 image data).
- **Transient Memory:** Model fallback arrays and API keys are stored in environment variables or configuration files.
