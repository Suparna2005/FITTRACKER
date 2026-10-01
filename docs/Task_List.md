# Task List

## Completed Tasks
- [x] **Fix "Mock Data" Bug:** Resolved the issue where the Groq Vision API returned hardcoded mock data by updating the user-agent string to bypass Cloudflare and removing decommissioned models from the fallback list.
- [x] **Add Finger Signal Detection:** Implemented real-time finger counting using MediaPipe Hands.
- [x] **Dynamic Set Scaling:** Upgraded the finger signaling to dynamically scale (1 finger for Set 1, 3 fingers for Set 3, capped at 5).
- [x] **Thumb Detection:** Replaced basic y-axis checking with distance-based geometric calculations to properly detect thumbs and allow orientation-independent signaling.
- [x] **Bad Form Detection:** Added logic to detect bicep curl swinging and squat chest-caving, turning the on-screen skeleton red to provide instant visual feedback.
- [x] **Universal Mesh UI:** Replaced basic dots with a highly advanced, universally applied animated 3D mesh structure for all Vision Hub camera overlays.
- [x] **Immersive Full-Screen Camera:** Refactored the UI to allow the camera interface to break out of its container and fill the entire viewport seamlessly.

## Pending / Future Tasks
- [ ] **Add User Voice Commands:** Integrate browser SpeechRecognition API to allow users to start sets via voice instead of fingers.
- [ ] **Expanded Exercise Library:** Add specific angle thresholds for Deadlifts, Overhead Presses, and Lunges.
- [ ] **Database Integration for Vision Hub:** Ensure that the sets and macros detected by the Vision Hub are successfully persisted to the postgresql database via the `/log_workout` and `/log_food` backend endpoints.
- [ ] **Mobile Optimization:** While the camera is full-screen, ensure touch targets on mobile for the "Save to Profile" buttons are large enough.
