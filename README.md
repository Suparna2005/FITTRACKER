# IronForge AI: The Ultimate Vision-Powered Fitness Companion

## Project Overview
IronForge AI is a cutting-edge, next-generation fitness tracking application that bridges the gap between digital logging and physical training. Unlike traditional fitness apps that rely entirely on manual user input, IronForge acts as a **proactive AI gym companion**. By harnessing the power of on-device computer vision and cloud-based multimodal Large Language Models (LLMs), the application can literally *see* your workout, analyze your form, log your meals, and track your progress in real-time.

The core philosophy behind the project is a **Hybrid AI Architecture**:
1. **Edge AI (Zero Latency):** Tasks requiring real-time feedback—like tracking joint angles during a squat or recognizing finger gestures to start a set—are processed entirely in the browser using lightweight MediaPipe models. This guarantees complete privacy and 60-FPS zero-latency responsiveness.
2. **Cloud AI (Deep Intelligence):** Complex reasoning tasks—like looking at a plate of food to calculate macronutrients, or scanning a hotel gym to build a custom workout split—are routed to high-parameter vision models (Llama 3.2 Vision / Qwen 2.5) via the Groq API for instantaneous, intelligent analysis.

---

## Core Features & Modules

### 1. 🤖 AI Form Coach (Real-Time Biomechanics)
The crown jewel of the platform. By pointing your webcam at yourself while lifting, the AI Form Coach overlays a dynamic, real-time skeleton onto your body. 
- **Auto-Rep Counting:** It calculates joint angles (e.g., hip-to-knee-to-ankle) to track the eccentric and concentric phases of your lift, automatically logging your reps.
- **Form Correction:** If your elbows swing during a bicep curl or your chest caves during a squat, the skeleton flashes **RED** and provides instant visual feedback to correct your posture, preventing injury.
- **Hands-Free Gesture Control:** Keep your phone on the bench. The AI tracks your hands—simply hold up 1 finger to start Set 1, 2 fingers for Set 2, etc.

### 2. 📸 Scientific Auto-Food Logger (Vision-to-Grams & Macros)
Stop searching databases for generic "Chicken Breast". Simply snap a photo of your plate. The backend Vision LLM scientifically analyzes the image to estimate exact dish portion weights in **grams (g)**, extract macronutrients (Protein, Carbs, Fats), generate an **itemized breakdown of individual ingredients with weight (g) and calories**, and provide nutritional density diagnostics directly logged to your daily profile.

### 3. 🧬 Physique Estimator
Upload a photo or stand in front of the camera, align yourself with the on-screen silhouette, and the AI will analyze your body composition to estimate your current body fat percentage, providing a baseline for your fitness journey.

### 4. 🏋️‍♂️ Spatial Equipment Scanner
Traveling and stuck in a hotel gym? Pan your camera across the room. The Spatial Mesh Scanner will detect all available dumbbells, machines, and cables, and automatically generate a custom workout split optimized for the exact equipment you have access to.

### 5. 📊 Dynamic Dashboard & Split Builder
A futuristic, dark-mode command center. Review your daily warfare log, track your volume and intensity over time with interactive Recharts, and use the intelligent Workout Split Builder to drag-and-drop your perfect training week.

---

## Technical Architecture
- **Frontend Engine:** React 18 & Vite for a lightning-fast Single Page Application (SPA).
- **Styling:** Tailwind CSS, utilizing complex glassmorphism, animated synthwave laser meshes, and dynamic layering.
- **Edge AI:** Google MediaPipe (Pose & Hands) integrated directly into the React component lifecycle via robust `useRef` rendering loops to completely bypass standard React re-renders.
- **Backend API:** FastAPI (Python) providing a highly concurrent, secure gateway.
- **Cloud AI Inference:** Groq API integration with dynamic fallback logic, utilizing `llama-3.2-11b-vision` for sub-second image reasoning.
- **Database:** SQLite (managed via SQLAlchemy) for lightweight, serverless persistence of workout logs and user data.
