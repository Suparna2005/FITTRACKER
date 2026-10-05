# Product Requirements Document (PRD)

## Product Name
AI-Powered Fitness Tracker (IronForge AI)

## Objective
To provide users with an all-in-one, highly advanced AI gym companion. The platform leverages on-device edge AI (Computer Vision) and cloud-based Multimodal LLMs to analyze workout form, log meals, estimate body fat, and dynamically construct workout splits.

## Core Features
1. **Vision Hub:**
   - *AI Form Coach:* Real-time skeletal tracking using MediaPipe. Detects bad form (swinging elbows, caving chests) and provides instant red/green visual feedback. Uses finger gestures for hands-free set control.
   - *Scientific Auto-Food Logger:* Snap a photo of a meal to calculate exact portion weights in grams (g), itemized ingredient breakdowns (grams & calories per item), macro ratios (protein, carbs, fats), and nutritional density analysis via Groq Vision API.
   - *Physique Estimator:* Analyzes user silhouette to estimate current body fat percentage.
   - *Equipment Scanner:* Scans gym environments to build a workout plan based on available machines.
2. **Dynamic Dashboard:**
   - Real-time data visualization of volume and intensity using Recharts.
3. **Workout Split Builder:**
   - AI-generated customized weekly workout splits tailored to the user's specific goals.
