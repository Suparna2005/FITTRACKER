# 🏋️ IronForge AI — User Guide & How-To Manual
*Next-Generation AI Gym Intelligence, Biomechanics Coach & Nutrition Scanner*

Welcome to **IronForge AI**! This complete step-by-step guide explains everything you need to know to get started, set up your profile, use the hands-free AI camera coach, scan meals, and track your daily progress.

---

## 📑 Table of Contents
1. [Quick Start (30-Second Setup)](#1-quick-start-30-second-setup)
2. [Accessing the App & Installing as a Mobile App (PWA)](#2-accessing-the-app--installing-as-a-mobile-app-pwa)
3. [Creating an Account & Logging In](#3-creating-an-account--logging-in)
4. [Setting Up Your Athlete Profile](#4-setting-up-your-athlete-profile)
5. [Generating Your Daily AI Workout & Diet Plan](#5-generating-your-daily-ai-workout--diet-plan)
6. [Using the AI Vision Biomechanics Camera Coach](#6-using-the-ai-vision-biomechanics-camera-coach)
   - [Camera Setup & Phone Placement](#camera-setup--phone-placement)
   - [Hands-Free Gesture Controls](#hands-free-gesture-controls)
   - [Understanding the Color Signals (🟢 Green, 🔴 Red, 🟡 Yellow)](#understanding-the-color-signals)
   - [Voice AI Commands](#voice-ai-commands)
   - [Supported Exercises & Form Diagnostics](#supported-exercises--form-diagnostics)
7. [Scanning & Logging Meals with AI Food Vision](#7-scanning--logging-meals-with-ai-food-vision)
8. [Manual Workout & Progress Logging](#8-manual-workout--progress-logging)
9. [Frequently Asked Questions & Troubleshooting (FAQ)](#9-frequently-asked-questions--troubleshooting-faq)

---

## 1. Quick Start (30-Second Setup)

1. **Open the App Link** in your browser:
   - **Local / Campus Network:** [https://30.31.32.136](https://30.31.32.136)
   - **Mobile / Any Phone:** Use your organization's public Cloudflare Tunnel URL.
2. **Log In or Sign Up:**
   - Tap **Continue with Google** for 1-tap sign-in, OR enter your email/phone and password.
3. **Fill Your Profile:** Enter your weight, height, fitness goal, and equipment.
4. **Hit "Generate Today's Battle Plan":** Get an instant custom workout and meal plan calculated to your exact calorie target!
5. **Launch the Camera Hub:** Tap **"Vision Coach"** to let the AI count your reps and correct your posture in real time!

---

## 2. Accessing the App & Installing as a Mobile App (PWA)

IronForge AI is a **Progressive Web App (PWA)** that runs smoothly on any smartphone, tablet, or laptop without needing an app store download.

### How to Install on Your Phone:
- **On Android (Chrome / Brave / Edge):**
  1. Open the app URL in Chrome.
  2. Tap the **three dots menu (`⋮`)** in the top right corner.
  3. Tap **"Install app"** or **"Add to Home Screen"**.
  4. The IronForge AI icon will appear on your phone's home screen and open full-screen like a native app.
- **On iPhone (Safari):**
  1. Open the app URL in **Safari**.
  2. Tap the **Share icon** (square with an arrow pointing up at the bottom).
  3. Scroll down and tap **"Add to Home Screen"**.
  4. Tap **"Add"** in the top-right corner.
- **On Laptop / PC (Chrome / Edge):**
  1. Click the **Install icon** in the browser URL bar (or click `⋮` > "Save and share" > "Install IronForge AI").

> **Note on First-Time Access (HTTPS Certificate Prompt):**  
> If accessing via `https://30.31.32.136`, your browser may show a "Your connection is not private" notice because it uses a self-signed local certificate. Click **"Advanced"** $\to$ **"Proceed to 30.31.32.136 (unsafe)"** to enter.

---

## 3. Creating an Account & Logging In

### Option A: 1-Tap Google Sign-In (Recommended)
1. Tap the white **"CONTINUE WITH GOOGLE"** button.
2. Select your Google account.
3. You will be authenticated immediately.

### Option B: Email & Password
- **New Athlete?**
  1. Tap **"Create account"** at the bottom of the login card.
  2. Enter your Name, Email, Phone Number, and Password.
  3. Tap **"CREATE ATHLETE PROFILE →"**.
  4. Tap **"ENTER THE FORGE →"** on the confirmation screen to enter your dashboard immediately.
- **Returning Athlete?**
  1. Enter your registered Email (or Phone) and Password.
  2. Tap **"ENTER THE FORGE →"**.

### Forgot Your Password?
1. Click **"Forgot Password?"** on the login screen.
2. Enter your registered email address or phone number.
3. Enter your new desired password and tap **"RESET PASSWORD →"**.
4. The system updates your credentials and returns you to the login screen with your email pre-filled.

---

## 4. Setting Up Your Athlete Profile

Your profile allows the AI to tailor nutrition macros and workout intensity specifically to your body:

1. Tap **"Profile"** from the navigation bar.
2. Fill in:
   - **Basic Metrics:** Age, Gender, Current Weight (kg/lbs), Height (cm/ft).
   - **Fitness Goal:** Choose from *Build Muscle*, *Fat Loss & Definition*, *Athletic Strength*, or *General Fitness*.
   - **Training Experience:** *Beginner*, *Intermediate*, or *Advanced*.
   - **Available Equipment:** *Full Gym*, *Dumbbells Only*, *Home Gym*, or *Bodyweight Only*.
   - **Cuisine Preference:** *Generic Indian*, *High-Protein Continental*, *Vegetarian*, *Vegan*, or *Keto*.
   - **Email Notifications Toggle:** Turn ON to receive your daily workout and diet schedule directly in your email inbox every morning at 06:00 AM.
3. Tap **"Save Athlete Profile"**.

---

## 5. Generating Your Daily AI Workout & Diet Plan

1. From the **Dashboard**, tap **"GENERATE TODAY'S BATTLE PLAN"**.
2. Within 2-3 seconds, the AI generates:
   - **Workout Routine:** Targeted muscle groups, exercise list, recommended sets, reps, and rest intervals.
   - **Nutrition & Macros Chart:** Target daily calories, grams of protein, carbs, and fats.
   - **Calorie Verdict:** An instant indicator showing whether your plan is in an optimal **DEFICIT** (for fat loss) or **SURPLUS** (for muscle building).
   - **Meal Breakdown:** Breakfast, lunch, pre-workout snack, and dinner suggestions tailored to your chosen cuisine.
3. **Split Routines:** You can customize your schedule (Push/Pull/Legs, Upper/Lower, 5-Day Bro Split, or Custom) under the **Workout Splits** section.

---

## 6. Using the AI Vision Biomechanics Camera Coach

The Vision Coach uses on-device computer vision (MediaPipe) to track your joints at 60 FPS, detect rep depth, and correct your posture in real time.

```
       [ CAMERA / WEBCAM ]
                │
         [ AI SKELETON ]
    ┌───────────┼───────────┐
    ▼           ▼           ▼
🟢 GREEN     🔴 RED      🟡 YELLOW
Optimal    Correction   Joint Angles
  Form       Warning      (HUD 142°)
```

### Camera Setup & Phone Placement
1. **Distance:** Place your phone or laptop on a flat surface or tripod **1.5 to 2.5 meters (5 to 8 feet)** away from you.
2. **Angle:** Set the camera at approximately waist or chest height.
3. **Visibility:** Ensure your full body (head to feet) is visible in the camera frame.
4. **Lighting:** Face towards a well-lit area; avoid standing directly in front of bright backlights or windows.
5. **Camera Switcher:** On smartphones, tap **"🔄 Flip Camera"** in the top right to switch between the front selfie camera and the rear camera.

---

### Hands-Free Gesture Controls
You never have to touch your sweaty screen during a set! The Vision Coach responds to natural hand gestures:

| Gesture | Visual Indicator | Action |
| :--- | :--- | :--- |
| **Raise Hand / Open Palm (`🖐️`)** | Glowing cyan skeleton, palm detected | Triggers set countdown from distance |
| **Two Fingers Up (`✌️`)** | `✌️ 2 FINGERS` badge | Starts workout set immediately |
| **Closed Fist (`✊`)** | `✊ FIST` badge | Pauses or stops the active set |

*Dual-Tier Detection:* Works whether you are standing right in front of the camera (MediaPipe Hand mesh) or stepping 2-3 meters back (Pose wrist/elbow tracking).

---

### Understanding the Color Signals

| Signal | Color | What It Means | What to Do |
| :--- | :---: | :--- | :--- |
| **Right Posture** | `🟢 Green` | **Optimal Form:** Your spine is neutral, knees are tracking correctly, and joints are in the safe target zone. | Continue your repetitions with smooth cadence. |
| **Correction Warning** | `🔴 Red` | **Form Breakdown:** Detected an issue such as knees collapsing inward, back rounding, chest dropping, or uneven shoulders. | Adjust your body immediately according to the on-screen audio-visual cue. |
| **Joint Angles HUD** | `🟡 Yellow` | **Live Biomechanical Degree Indicators:** Glowing yellow rings and angle arcs over your knees, hips, and elbows (e.g., `92°`, `145°`). | Observe your range of motion at the bottom HUD strip. |
| **Calibrating Setup** | `⚪ White` | **Ready Hold:** Verifying steady starting posture before movement begins. | Hold your starting position for half a second. |

---

### Voice AI Commands
If your microphone is enabled, you can command the AI with your voice:
- Say **"Start set"** or **"Go"** $\to$ Begins rep tracking immediately.
- Say **"Pause set"** or **"Stop"** $\to$ Halts the active counter.

---

### Supported Exercises & Form Diagnostics

1. **Squats:**
   - Tracks hip crease relative to knee height.
   - `🟢 Green`: Parallel or below-parallel depth achieved ($< 100^\circ$ knee flexion).
   - `🔴 Red`: Valgus knee collapse (knees buckling inward) or premature reversal before parallel.
2. **Pushups:**
   - Tracks chest depth, elbow flare angle, and core straightness.
   - `🟢 Green`: Chest descends within 10 cm of ground with elbows tucked at $45^\circ$.
   - `🔴 Red`: Sagging lower back (lumbar hyperextension) or flared elbows ($> 80^\circ$).
3. **Bicep Curls:**
   - Tracks elbow pivot stability and forearm contraction.
   - `🟢 Green`: Full extension at bottom ($> 155^\circ$), peak contraction at top ($< 55^\circ$).
   - `🔴 Red`: Swinging elbows forward (momentum cheating) or partial reps.
4. **Core Planks & Crunches:**
   - Real-time hold timer and spinal flexion tracker.
5. **Seated Desk Posture Check:**
   - Evaluates neck forward angle, shoulder slouch, and spine leveling while working at your laptop.

---

## 7. Scanning & Logging Meals with AI Food Vision

1. Navigate to the **Food Scanner** tab.
2. Tap **"Take Food Photo"** or **"Upload Dish Image"**.
3. Point your camera at your plate or meal.
4. The AI Multimodal Vision model analyzes the image and outputs:
   - **Dish Name & Identification**
   - **Estimated Portion Weight in Grams (`g`)**
   - **Total Calories (`kcal`)**
   - **Macronutrients:** Protein, Carbs, and Fats.
   - **Health Score & Nutrition Advice:** Suggestions to balance the meal.
5. Tap **"Add to Today's Diary"** to log the meal automatically.

---

## 8. Manual Workout & Progress Logging

Want to log a traditional gym workout manually?

1. Tap **"Log Workout"** in the navigation bar.
2. Select your exercises from the dropdown, or type a custom exercise name.
3. Enter your **Sets**, **Reps**, and **Weight (kg/lbs)** for each movement.
4. The system automatically computes your **Total Training Volume** ($\text{Sets} \times \text{Reps} \times \text{Weight}$).
5. Add optional notes (e.g., energy level, pre-workout used, hydration).
6. Tap **"Save Daily Progress"**.
7. View your weekly volume graphs and workout streak under the **History & Analytics** tab.

---

## 9. Frequently Asked Questions & Troubleshooting (FAQ)

### Q1: The camera screen is black or asking for permission.
- **Fix:** When your browser prompts *"Allow camera access?"*, tap **Allow**. If accidentally denied, tap the padlock icon in your browser URL bar, set Camera to **Allow**, and refresh the page.

### Q2: Why does the app say "Connection Not Private" on HTTPS?
- **Fix:** Because the server operates on a local campus IP (`30.31.32.136`) with a secure self-signed SSL certificate. Simply click **"Advanced"** $\to$ **"Proceed to 30.31.32.136"**.

### Q3: My repetitions aren't counting. What am I doing wrong?
- **Check 1 (Visibility):** Ensure your full body is in the frame, especially your feet and hips.
- **Check 2 (Setup Lockout):** Stand still in the starting position for 1 second until the badge turns `🟢 READY`.
- **Check 3 (Full Depth):** Make sure you are hitting full range of motion (e.g., squatting all the way down to parallel). Quick half-reps are flagged as `⚠️ NO REP: INCOMPLETE DEPTH` to protect form integrity.

### Q4: The app feels laggy or slows down on my older phone.
- **Fix:** The Vision Coach is already optimized for 60 FPS using MediaPipe Lite. Close background apps, ensure good room lighting, and make sure your phone's battery saver mode is turned off.

### Q5: Can I use this app on multiple devices?
- **Yes!** Your profile, workout logs, custom splits, and historical data are safely synced to the central database. Log in with your email on your phone, laptop, or tablet anytime.

---

*Built with ❤️ by the IronForge AI Engineering Team at Brainware University.*  
*Have questions or need technical support? Contact your gym trainer or campus administrator.*
