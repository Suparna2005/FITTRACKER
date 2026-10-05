# Task List

## Completed Tasks
- [x] **Fix "Mock Data" Bug:** Resolved the issue where the Groq Vision API returned hardcoded mock data by updating the user-agent string to bypass Cloudflare and removing decommissioned models from the fallback list.
- [x] **Add Finger Signal Detection:** Implemented real-time finger counting using MediaPipe Hands.
- [x] **Dynamic Set Scaling:** Upgraded the finger signaling to dynamically scale (1 finger for Set 1, 3 fingers for Set 3, capped at 5).
- [x] **Thumb Detection:** Replaced basic y-axis checking with distance-based geometric calculations to properly detect thumbs and allow orientation-independent signaling.
- [x] **Bad Form Detection:** Added logic to detect bicep curl swinging and squat chest-caving, turning the on-screen skeleton red to provide instant visual feedback.
- [x] **Universal Mesh UI:** Replaced basic dots with a highly advanced, universally applied animated 3D mesh structure for all Vision Hub camera overlays.
- [x] **Immersive Full-Screen Camera:** Refactored the UI to allow the camera interface to break out of its container and fill the entire viewport seamlessly.
- [x] **Add User Voice Commands:** Integrated browser SpeechRecognition API to allow users to start sets hands-free via voice commands ("start set", "begin", "go", "ready").
- [x] **Expanded Exercise Library:** Added specific angle thresholds and bad form detection for Deadlifts (hip hinge & neutral spine), Overhead Presses (overhead lockout & back arching), and Lunges (knee depth & knee-over-ankle alignment).
- [x] **Database Integration for Vision Hub:** Added `/log_food/` and `/log_workout/` backend endpoints and connected Vision Hub scan results to persist detected meals and sets/reps to the SQLite database.
- [x] **Mobile Optimization:** Optimized full-screen camera touch targets (`min-h-[48px]`, `touch-manipulation`, high-contrast mobile buttons) for mobile devices and gym usage.
- [x] **Scientific Food & Ingredient Gram Scanner:** Upgraded backend Vision prompts, mock fallbacks, database schemas, and frontend UI to display portion weight in grams (g), itemized ingredient breakdowns with grams and calories per item, macro distribution, and nutritional density diagnostics.
- [x] **Google Account Sign-In (OAuth2):** Integrated Google Identity Services SDK on the frontend and `/google_login/` backend authentication endpoint to enable one-click sign-in and automatic account creation with Google accounts.

## Pending / Future Tasks
*(All current roadmap tasks completed successfully!)*
