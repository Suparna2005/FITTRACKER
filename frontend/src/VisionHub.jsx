import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from './config';

export default function VisionHub({ onClose, user, updateUser, plan, initialMode }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [activeMode, setActiveMode] = useState(initialMode || null);
  const activeModeRef = useRef(activeMode);
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  const [showCamera, setShowCamera] = useState(false);
  const [realtimeWarning, setRealtimeWarning] = useState("Calibrating Biomechanics...");
  const [detectedExerciseDisplay, setDetectedExerciseDisplay] = useState('Squat');

  useEffect(() => {
    if (initialMode) {
      handleScanClick(initialMode);
    }
  }, [initialMode]);
  
  // Extract today's planned exercises
  const todaysExercises = plan?.workout_plan?.exercises || [];
  const defaultExercise = todaysExercises.length > 0 ? todaysExercises[0].name : 'Auto-Detect';
  const [selectedExercise, setSelectedExercise] = useState(defaultExercise);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasOverlayRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const poseRef = useRef(null);
  const handsRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const lastVoiceTriggerTimeRef = useRef(0);
  const workoutStatsRef = useRef({ sets: 1, reps: 0 });
  const liveTrackerRef = useRef({
    setCount: 1,
    repCount: 0,
    waitingForSignal: 1,
    isResting: false,
    restStartTime: 0,
    lastRepTime: Date.now(),
    lastCountedRepTimestamp: 0,
    repStage: 'IDLE', // 'IDLE', 'ECCENTRIC', 'INFLECTION', 'CONCENTRIC'
    repStartTime: 0,
    inflectionStartTime: 0,
    repFormValid: true,
    badFormReason: '',
    smoothedAngles: {},
    exerciseHistory: [],
    activeExercise: 'Squat',
    consecutiveSignalFrames: 0,
    readyHoldFrames: 0
  });

  const playRepSound = (type = 'success') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch(e) {}
  };

  const formatWaitingMessage = (targetSet) => {
    const fingerText = targetSet === 1 ? '1 FINGER' : `${targetSet} FINGERS`;
    return `[WAITING FOR ${fingerText} OR SAY 'START' FOR SET ${targetSet}]`;
  };

  const startSet = (targetSet = null, source = 'VOICE') => {
    const tracker = liveTrackerRef.current;
    if (targetSet !== null && targetSet !== undefined) {
      tracker.setCount = targetSet;
      tracker.repCount = 0;
    }
    tracker.waitingForSignal = 0;
    tracker.isResting = false;
    tracker.readyHoldFrames = 0;
    tracker.lastRepTime = Date.now();
    workoutStatsRef.current = { sets: tracker.setCount, reps: tracker.repCount };

    setRealtimeWarning(`${source} DETECTED! STARTING SET ${tracker.setCount}`);
    const repEl = document.getElementById('repCounter');
    if (repEl) {
      repEl.innerText = `SET: ${tracker.setCount} | REPS: ${tracker.repCount}`;
    }
    const restTimerEl = document.getElementById('restTimer');
    if (restTimerEl) restTimerEl.style.display = 'none';
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition API not supported in this browser.");
      setIsVoiceActive(false);
      setVoiceTranscript("Voice recognition not supported in this browser");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsVoiceActive(true);
        setVoiceTranscript('Listening for "start set 1", "set 2", "go"...');
      };

      rec.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0] ? res[0].transcript : '';
          if (res.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        const raw = (finalText || interimText).toLowerCase().trim();
        if (raw) {
          setVoiceTranscript(raw);
        }

        const clean = raw.replace(/[^a-z0-9\s]/g, ' ').trim();
        if (!clean) return;

        const numberMap = {
          "1": 1, "one": 1, "first": 1,
          "2": 2, "two": 2, "second": 2,
          "3": 3, "three": 3, "third": 3,
          "4": 4, "four": 4, "fourth": 4,
          "5": 5, "five": 5, "fifth": 5
        };

        let targetSetNum = null;

        for (const [key, num] of Object.entries(numberMap)) {
          if (
            clean.includes(`set ${key}`) ||
            clean.includes(`set number ${key}`) ||
            clean.includes(`start set ${key}`) ||
            clean.includes(`begin set ${key}`) ||
            clean.includes(`start ${key}`) ||
            clean.includes(`begin ${key}`) ||
            clean === `set ${key}` ||
            clean === key
          ) {
            targetSetNum = num;
            break;
          }
        }

        const now = Date.now();

        // 1. Explicit set number command (e.g. "start set 2", "set 2", "2")
        if (targetSetNum !== null) {
          const currentTracker = liveTrackerRef.current;
          // Trigger if set changed OR if currently waiting for start signal
          if (currentTracker.setCount !== targetSetNum || currentTracker.waitingForSignal > 0 || now - lastVoiceTriggerTimeRef.current > 800) {
            lastVoiceTriggerTimeRef.current = now;
            startSet(targetSetNum, `VOICE "SET ${targetSetNum}"`);
            setVoiceTranscript(`✓ Triggered Set ${targetSetNum}`);
          }
          return;
        }

        // 2. Generic start command (e.g. "start", "go", "begin") -> ONLY process if no numbers and debounced
        if (now - lastVoiceTriggerTimeRef.current < 1200) {
          return;
        }

        if (
          clean.includes('start') ||
          clean.includes('begin') ||
          clean.includes('go') ||
          clean.includes('ready') ||
          clean.includes('next') ||
          clean === 'set'
        ) {
          lastVoiceTriggerTimeRef.current = now;
          const targetSet = liveTrackerRef.current.waitingForSignal || liveTrackerRef.current.setCount;
          startSet(targetSet, `VOICE "${clean}"`);
          setVoiceTranscript(`✓ Triggered Set ${targetSet}`);
        }
      };

      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        if (e.error === 'not-allowed') {
          setIsVoiceActive(false);
          setVoiceTranscript('Microphone permission blocked');
        } else if (e.error === 'no-speech') {
          setVoiceTranscript('Listening...');
        }
      };

      rec.onend = () => {
        // Continuous auto-restart with safety delay
        if (streamRef.current) {
          setTimeout(() => {
            try {
              if (streamRef.current && recognitionRef.current) {
                recognitionRef.current.start();
              }
            } catch (err) {
              console.log("Speech restart ignored:", err);
            }
          }, 350);
        } else {
          setIsVoiceActive(false);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setIsVoiceActive(true);
    } catch(err) {
      console.error("Failed to start speech recognition:", err);
      setIsVoiceActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
      recognitionRef.current = null;
      setIsVoiceActive(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  const handleUploadClick = (mode) => {
    setActiveMode(mode);
    activeModeRef.current = mode;
    setImgPreview(null);
    setResult(null);
    setShowCamera(false);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleScanClick = async (mode) => {
    setActiveMode(mode);
    activeModeRef.current = mode;
    setImgPreview(null);
    setResult(null);
    setShowCamera(true);
    await new Promise(r => setTimeout(r, 100));
    
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode === 'form' ? 'user' : 'environment' },
          audio: mode === 'form'
        });
      } catch(e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode === 'form' ? 'user' : 'environment' }
        });
      }
      streamRef.current = stream;
      
      let attempts = 0;
      while (!videoRef.current && attempts < 20) {
         await new Promise(r => setTimeout(r, 50));
         attempts++;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch(e){}
        
        // Start real-time skeleton tracking for form mode
        if (mode === 'form' && window.Pose) {
          poseRef.current = new window.Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });
          poseRef.current.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          if (window.Hands) {
            handsRef.current = new window.Hands({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            handsRef.current.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });
            
            handsRef.current.onResults((results) => {
               const tracker = liveTrackerRef.current;
               if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                 const landmarks = results.multiHandLandmarks[0];
                 let count = 0;
                 
                 const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
                 
                 // A finger is raised if its tip is further from the wrist (0) than its PIP joint is
                 if (dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0])) count++; // Index
                 if (dist(landmarks[12], landmarks[0]) > dist(landmarks[10], landmarks[0])) count++; // Middle
                 if (dist(landmarks[16], landmarks[0]) > dist(landmarks[14], landmarks[0])) count++; // Ring
                 if (dist(landmarks[20], landmarks[0]) > dist(landmarks[18], landmarks[0])) count++; // Pinky
                 if (dist(landmarks[4], landmarks[17]) > dist(landmarks[3], landmarks[17])) count++; // Thumb
                 
                 if (tracker.waitingForSignal > 0) {
                   if (count === tracker.waitingForSignal) {
                     tracker.consecutiveSignalFrames = (tracker.consecutiveSignalFrames || 0) + 1;
                     if (tracker.consecutiveSignalFrames >= 10) {
                       tracker.consecutiveSignalFrames = 0;
                       startSet(tracker.waitingForSignal, 'HAND SIGNAL');
                     }
                   } else {
                     tracker.consecutiveSignalFrames = 0;
                   }
                   const repEl = document.getElementById('repCounter');
                   if (repEl) repEl.innerText = formatWaitingMessage(tracker.waitingForSignal);
                 } else {
                   tracker.consecutiveSignalFrames = 0;
                 }
                 
                 // Draw the hand landmarks so user can see it's working
                 const canvas = canvasOverlayRef.current;
                 if (canvas && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
                     const ctx = canvas.getContext('2d');
                     window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: '#3b82f6', lineWidth: 4});
                     window.drawLandmarks(ctx, landmarks, {color: '#60a5fa', lineWidth: 1, radius: 2});
                 }
               } else {
                 tracker.consecutiveSignalFrames = 0;
                 if (tracker.waitingForSignal > 0) {
                     const repEl = document.getElementById('repCounter');
                     if (repEl) repEl.innerText = formatWaitingMessage(tracker.waitingForSignal);
                 }
               }
            });
          }

          // Voice recognition setup for hands-free voice controls
          startVoiceRecognition();
          
          poseRef.current.onResults((results) => {
            const canvas = canvasOverlayRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const now = Date.now();
            const tracker = liveTrackerRef.current;
            
            // Check resting gap (> 8 seconds without movement while in active workout)
            if (tracker.repCount > 0 && (now - tracker.lastRepTime) > 8000 && tracker.waitingForSignal === 0) {
              if (!tracker.isResting) {
                tracker.isResting = true;
                tracker.restStartTime = now;
                const nextSet = tracker.setCount + 1;
                const targetSet = nextSet > 5 ? 5 : nextSet;
                tracker.waitingForSignal = targetSet;
                tracker.setCount = targetSet;
                const fingerText = targetSet === 1 ? '1 FINGER' : `${targetSet} FINGERS`;
                setRealtimeWarning(`RESTING. SHOW ${fingerText} OR SAY 'START' FOR SET ${targetSet}`);
              }
            }
            
            const lm = results.poseLandmarks;
            if (lm && lm.length >= 33 && window.drawConnectors && window.drawLandmarks) {
              let skeletonColor = '#10b981'; // Green default

              // ── 1. Confidence & Visibility Helpers ──
              const isPtVisible = (pt) => pt && (pt.visibility === undefined || pt.visibility > 0.60);
              const smoothAngle = (key, rawAngle, alpha = 0.35) => {
                if (!tracker.smoothedAngles[key]) {
                  tracker.smoothedAngles[key] = rawAngle;
                  return rawAngle;
                }
                tracker.smoothedAngles[key] = alpha * rawAngle + (1 - alpha) * tracker.smoothedAngles[key];
                return tracker.smoothedAngles[key];
              };

              // ── 2. Automatic Exercise Classifier ──
              const classifyCurrentPose = () => {
                const lShoulder = lm[11], rShoulder = lm[12];
                const lElbow = lm[13], rElbow = lm[14];
                const lWrist = lm[15], rWrist = lm[16];
                const lHip = lm[23], rHip = lm[24];
                const lKnee = lm[25], rKnee = lm[26];
                const lAnkle = lm[27], rAnkle = lm[28];
                const nose = lm[0];

                const upperVis = (isPtVisible(lShoulder) || isPtVisible(rShoulder)) &&
                                 (isPtVisible(lElbow) || isPtVisible(rElbow)) &&
                                 (isPtVisible(lWrist) || isPtVisible(rWrist));
                const lowerVis = (isPtVisible(lHip) || isPtVisible(rHip)) &&
                                 (isPtVisible(lKnee) || isPtVisible(rKnee)) &&
                                 (isPtVisible(lAnkle) || isPtVisible(rAnkle));

                // A. Overhead Press check: wrists above head or significantly above shoulders
                if (upperVis && lWrist && rWrist && lShoulder && rShoulder) {
                  const avgWristY = (lWrist.y + rWrist.y) / 2;
                  const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
                  const headTop = nose ? nose.y : avgShoulderY - 0.2;
                  if (avgWristY < headTop || avgWristY < avgShoulderY - 0.10) {
                    return 'overhead press';
                  }
                }

                // B. Lower body checks
                if (lowerVis && lHip && rHip && lKnee && rKnee && lAnkle && rAnkle) {
                  const leftKneeAngle = calculateAngle(lHip, lKnee, lAnkle);
                  const rightKneeAngle = calculateAngle(rHip, rKnee, rAnkle);
                  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

                  const leftHipAngle = calculateAngle(lShoulder || lHip, lHip, lKnee);
                  const rightHipAngle = calculateAngle(rShoulder || rHip, rHip, rKnee);
                  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

                  // Lunge: large discrepancy between knees
                  const kneeYDiff = Math.abs(lKnee.y - rKnee.y);
                  const ankleXDiff = Math.abs(lAnkle.x - rAnkle.x);
                  if (kneeYDiff > 0.12 && ankleXDiff > 0.14) {
                    return 'lunges';
                  }

                  // Deadlift: Hip hinge with softer knees
                  if (avgHipAngle < 135 && avgKneeAngle > 120) {
                    return 'deadlift';
                  }

                  // Squat: Both knees flex deeply
                  if (avgKneeAngle < 140) {
                    return 'squat';
                  }
                }

                // C. Bicep Curl: Upper body active while standing upright
                if (upperVis && lShoulder && lElbow && lWrist && lHip) {
                  const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
                  const upperArmAngle = calculateAngle(lHip, lShoulder, lElbow);
                  if (upperArmAngle < 40 && elbowAngle < 135) {
                    return 'bicep curl';
                  }
                }

                return null;
              };

              // Select active exercise: explicit user pick or automatic classification
              const selectorVal = (document.getElementById('exerciseSelector')?.value || selectedExercise || '').toLowerCase();
              let targetExercise = selectorVal;

              if (selectorVal.includes('auto') || selectorVal === '') {
                const detected = classifyCurrentPose();
                if (detected) {
                  tracker.exerciseHistory.push(detected);
                  if (tracker.exerciseHistory.length > 15) tracker.exerciseHistory.shift();

                  // Find most frequent exercise in rolling window
                  const counts = {};
                  tracker.exerciseHistory.forEach(ex => { counts[ex] = (counts[ex] || 0) + 1; });
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                  if (sorted.length > 0 && sorted[0][1] >= 6) {
                    tracker.activeExercise = sorted[0][0];
                  }
                }
                targetExercise = tracker.activeExercise || 'squat';
                setDetectedExerciseDisplay(targetExercise.charAt(0).toUpperCase() + targetExercise.slice(1));
              } else {
                targetExercise = selectorVal;
                setDetectedExerciseDisplay(targetExercise.charAt(0).toUpperCase() + targetExercise.slice(1));
              }

              // ── 3. Helper to Register 1 Perfect Rep ──
              const registerPerfectRep = (exerciseLabel) => {
                if (tracker.waitingForSignal > 0) return;
                // Anti-bounce: require at least 1.2s since last counted rep
                if (now - tracker.lastCountedRepTimestamp < 1200) return;

                if (tracker.isResting) {
                  tracker.setCount++;
                  tracker.repCount = 0;
                  tracker.isResting = false;
                }
                tracker.repCount++;
                tracker.lastRepTime = now;
                tracker.lastCountedRepTimestamp = now;
                tracker.repStage = 'IDLE';
                tracker.readyHoldFrames = 0;
                tracker.repFormValid = true;
                playRepSound('success');
                setRealtimeWarning(`PERFECT ${exerciseLabel.toUpperCase()}! (REPS: ${tracker.repCount})`);
                skeletonColor = '#10b981';
              };

              const invalidateRep = (reason) => {
                tracker.repFormValid = false;
                tracker.badFormReason = reason;
                skeletonColor = '#ef4444';
                setRealtimeWarning(`FORM ISSUE: ${reason}`);
              };

              const rejectNoRep = (reason) => {
                playRepSound('fail');
                tracker.repStage = 'IDLE';
                tracker.readyHoldFrames = 0;
                tracker.repFormValid = true;
                skeletonColor = '#ef4444';
                setRealtimeWarning(`NO REP: ${reason}`);
              };

              // ── 4. Precision Biomechanical Movement Evaluator ──

              if (targetExercise.includes('squat')) {
                // SQUATS: Hip & Knee flexion + Torso Upright
                const hip = lm[23] || lm[24];
                const knee = lm[25] || lm[26];
                const ankle = lm[27] || lm[28];
                const shoulder = lm[11] || lm[12];

                if (isPtVisible(hip) && isPtVisible(knee) && isPtVisible(ankle) && isPtVisible(shoulder)) {
                  const rawKneeAngle = calculateAngle(hip, knee, ankle);
                  const rawTorsoAngle = calculateAngle(shoulder, hip, knee);
                  const kneeAngle = smoothAngle('squat_knee', rawKneeAngle);
                  const torsoAngle = smoothAngle('squat_torso', rawTorsoAngle);

                  // Form Check: Torso must not collapse forward
                  if (torsoAngle < 65) {
                    invalidateRep("KEEP CHEST UP & SPINE TALL!");
                  }

                  // FSM Progression with Strict Starting Calibration Gate
                  if (tracker.repStage === 'IDLE') {
                    if (kneeAngle > 160 && torsoAngle >= 70) {
                      tracker.readyHoldFrames = (tracker.readyHoldFrames || 0) + 1;
                      skeletonColor = '#10b981';
                      if (tracker.readyHoldFrames >= 4) {
                        tracker.repStage = 'READY';
                        setRealtimeWarning("READY: SQUAT DOWN WITH CONTROL");
                      } else {
                        setRealtimeWarning("HOLD START POSITION (LOCKOUT)");
                      }
                    } else {
                      tracker.readyHoldFrames = 0;
                      setRealtimeWarning("STAND TALL WITH LEGS STRAIGHT TO CALIBRATE");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'READY') {
                    if (kneeAngle < 140) {
                      tracker.repStage = 'ECCENTRIC';
                      tracker.repStartTime = now;
                      tracker.repFormValid = true;
                      setRealtimeWarning("DESCENDING: SINK INTO HIPS");
                      skeletonColor = '#f59e0b';
                    } else {
                      setRealtimeWarning("READY: SQUAT DOWN WITH CONTROL");
                    }
                  } else if (tracker.repStage === 'ECCENTRIC') {
                    if (kneeAngle <= 102) {
                      tracker.repStage = 'INFLECTION';
                      tracker.inflectionStartTime = now;
                      setRealtimeWarning("PERFECT DEPTH! DRIVE UP");
                      skeletonColor = '#10b981';
                    } else if (kneeAngle > 155) {
                      rejectNoRep("HIT PARALLEL DEPTH (KNEES <= 100°)");
                    } else {
                      skeletonColor = '#f59e0b';
                      setRealtimeWarning("SQUAT DEEPER (HIT PARALLEL)");
                    }
                  } else if (tracker.repStage === 'INFLECTION') {
                    if (kneeAngle > 125) {
                      tracker.repStage = 'CONCENTRIC';
                      setRealtimeWarning("DRIVE THROUGH HEELS");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'CONCENTRIC') {
                    if (kneeAngle >= 158) {
                      const repDuration = now - tracker.repStartTime;
                      if (repDuration >= 1000 && tracker.repFormValid) {
                        registerPerfectRep("SQUAT");
                      } else if (!tracker.repFormValid) {
                        rejectNoRep(tracker.badFormReason || "COMPROMISED FORM");
                      } else {
                        rejectNoRep("TOO FAST! MAINTAIN CONTROLLED TEMPO (>= 1.0s)");
                      }
                    }
                  }
                } else {
                  setRealtimeWarning("ALIGN LEGS & TORSO IN CAMERA");
                  skeletonColor = '#f59e0b';
                  tracker.readyHoldFrames = 0;
                  if (tracker.repStage !== 'IDLE') tracker.repStage = 'IDLE';
                }

              } else if (targetExercise.includes('deadlift')) {
                // DEADLIFT: Hip Hinge & Spine Alignment
                const shoulder = lm[11] || lm[12];
                const hip = lm[23] || lm[24];
                const knee = lm[25] || lm[26];
                const ear = lm[7] || lm[8];

                if (isPtVisible(shoulder) && isPtVisible(hip) && isPtVisible(knee)) {
                  const rawHipAngle = calculateAngle(shoulder, hip, knee);
                  const rawSpineAngle = ear && isPtVisible(ear) ? calculateAngle(ear, shoulder, hip) : 180;
                  const hipAngle = smoothAngle('deadlift_hip', rawHipAngle);
                  const spineAngle = smoothAngle('deadlift_spine', rawSpineAngle);

                  if (spineAngle < 140) {
                    invalidateRep("DO NOT ROUND SPINE!");
                  }

                  if (tracker.repStage === 'IDLE') {
                    if (hipAngle > 165) {
                      tracker.readyHoldFrames = (tracker.readyHoldFrames || 0) + 1;
                      skeletonColor = '#10b981';
                      if (tracker.readyHoldFrames >= 4) {
                        tracker.repStage = 'READY';
                        setRealtimeWarning("READY: HINGE AT HIPS");
                      } else {
                        setRealtimeWarning("HOLD LOCKOUT TO CALIBRATE");
                      }
                    } else {
                      tracker.readyHoldFrames = 0;
                      setRealtimeWarning("STAND FULLY ERECT TO START DEADLIFT");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'READY') {
                    if (hipAngle < 145) {
                      tracker.repStage = 'ECCENTRIC';
                      tracker.repStartTime = now;
                      tracker.repFormValid = true;
                      setRealtimeWarning("HINGING DOWN: KEEP BACK FLAT");
                      skeletonColor = '#f59e0b';
                    } else {
                      setRealtimeWarning("READY: HINGE AT HIPS");
                    }
                  } else if (tracker.repStage === 'ECCENTRIC') {
                    if (hipAngle <= 108) {
                      tracker.repStage = 'INFLECTION';
                      tracker.inflectionStartTime = now;
                      setRealtimeWarning("FULL HINGE: SQUEEZE GLUTES & STAND");
                      skeletonColor = '#10b981';
                    } else if (hipAngle > 160) {
                      rejectNoRep("INSUFFICIENT HINGE DEPTH");
                    }
                  } else if (tracker.repStage === 'INFLECTION') {
                    if (hipAngle > 135) {
                      tracker.repStage = 'CONCENTRIC';
                      setRealtimeWarning("STAND TALL");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'CONCENTRIC') {
                    if (hipAngle >= 165) {
                      const repDuration = now - tracker.repStartTime;
                      if (repDuration >= 1000 && tracker.repFormValid) {
                        registerPerfectRep("DEADLIFT");
                      } else if (!tracker.repFormValid) {
                        rejectNoRep(tracker.badFormReason || "COMPROMISED FORM");
                      } else {
                        rejectNoRep("TOO FAST! CONTROL THE TEMPO (>= 1.0s)");
                      }
                    }
                  }
                } else {
                  setRealtimeWarning("ALIGN FULL BODY FOR DEADLIFT");
                  skeletonColor = '#f59e0b';
                  tracker.readyHoldFrames = 0;
                  if (tracker.repStage !== 'IDLE') tracker.repStage = 'IDLE';
                }

              } else if (targetExercise.includes('press') || targetExercise.includes('overhead')) {
                // OVERHEAD PRESS: Vertical lockout & No Lumbar Arch
                const shoulder = lm[11] || lm[12];
                const elbow = lm[13] || lm[14];
                const wrist = lm[15] || lm[16];
                const hip = lm[23] || lm[24];
                const ear = lm[7] || lm[8];

                if (isPtVisible(shoulder) && isPtVisible(elbow) && isPtVisible(wrist)) {
                  const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
                  const rawSpineAngle = ear && isPtVisible(ear) && isPtVisible(hip) ? calculateAngle(ear, shoulder, hip) : 180;
                  const elbowAngle = smoothAngle('press_elbow', rawElbowAngle);
                  const spineAngle = smoothAngle('press_spine', rawSpineAngle);

                  if (spineAngle < 145) {
                    invalidateRep("DO NOT ARCH LOWER BACK!");
                  }

                  if (tracker.repStage === 'IDLE') {
                    if (elbowAngle < 85 && wrist.y >= shoulder.y - 0.08) {
                      tracker.readyHoldFrames = (tracker.readyHoldFrames || 0) + 1;
                      skeletonColor = '#10b981';
                      if (tracker.readyHoldFrames >= 4) {
                        tracker.repStage = 'READY';
                        setRealtimeWarning("READY: PRESS OVERHEAD");
                      } else {
                        setRealtimeWarning("HOLD RACK POSITION TO CALIBRATE");
                      }
                    } else {
                      tracker.readyHoldFrames = 0;
                      setRealtimeWarning("BRING HANDS TO SHOULDERS (RACK POSITION)");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'READY') {
                    if (elbowAngle > 110 && wrist.y < shoulder.y - 0.06) {
                      tracker.repStage = 'CONCENTRIC';
                      tracker.repStartTime = now;
                      tracker.repFormValid = true;
                      setRealtimeWarning("PRESSING UP");
                      skeletonColor = '#f59e0b';
                    } else {
                      setRealtimeWarning("READY: PRESS OVERHEAD");
                    }
                  } else if (tracker.repStage === 'CONCENTRIC') {
                    if (elbowAngle >= 158 && wrist.y < shoulder.y - 0.15) {
                      tracker.repStage = 'INFLECTION';
                      setRealtimeWarning("PERFECT LOCKOUT: LOWER UNDER CONTROL");
                      skeletonColor = '#10b981';
                    } else if (elbowAngle < 85) {
                      rejectNoRep("INCOMPLETE PRESS LOCKOUT");
                    }
                  } else if (tracker.repStage === 'INFLECTION') {
                    if (elbowAngle < 130) {
                      tracker.repStage = 'ECCENTRIC';
                      setRealtimeWarning("LOWERING TO SHOULDERS");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'ECCENTRIC') {
                    if (elbowAngle <= 85) {
                      const repDuration = now - tracker.repStartTime;
                      if (repDuration >= 1000 && tracker.repFormValid) {
                        registerPerfectRep("OVERHEAD PRESS");
                      } else if (!tracker.repFormValid) {
                        rejectNoRep(tracker.badFormReason || "COMPROMISED FORM");
                      } else {
                        rejectNoRep("TOO FAST! LOWER UNDER CONTROL (>= 1.0s)");
                      }
                    }
                  }
                } else {
                  setRealtimeWarning("ALIGN UPPER BODY FOR PRESS");
                  skeletonColor = '#f59e0b';
                  tracker.readyHoldFrames = 0;
                  if (tracker.repStage !== 'IDLE') tracker.repStage = 'IDLE';
                }

              } else if (targetExercise.includes('lunge')) {
                // LUNGES: Knee Depth & Tracking
                const hip = lm[23] || lm[24];
                const knee = lm[25] || lm[26];
                const ankle = lm[27] || lm[28];

                if (isPtVisible(hip) && isPtVisible(knee) && isPtVisible(ankle)) {
                  const rawKneeAngle = calculateAngle(hip, knee, ankle);
                  const kneeAngle = smoothAngle('lunge_knee', rawKneeAngle);
                  const kneeOverAnkleDiff = Math.abs(knee.x - ankle.x);

                  if (kneeOverAnkleDiff > 0.22) {
                    invalidateRep("KEEP FRONT KNEE OVER ANKLE!");
                  }

                  if (tracker.repStage === 'IDLE') {
                    if (kneeAngle > 160) {
                      tracker.readyHoldFrames = (tracker.readyHoldFrames || 0) + 1;
                      skeletonColor = '#10b981';
                      if (tracker.readyHoldFrames >= 4) {
                        tracker.repStage = 'READY';
                        setRealtimeWarning("READY: STEP INTO LUNGE");
                      } else {
                        setRealtimeWarning("STAND TALL TO CALIBRATE");
                      }
                    } else {
                      tracker.readyHoldFrames = 0;
                      setRealtimeWarning("STAND UPRIGHT TO START LUNGES");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'READY') {
                    if (kneeAngle < 135) {
                      tracker.repStage = 'ECCENTRIC';
                      tracker.repStartTime = now;
                      tracker.repFormValid = true;
                      setRealtimeWarning("LOWERING INTO LUNGE");
                      skeletonColor = '#f59e0b';
                    } else {
                      setRealtimeWarning("READY: STEP INTO LUNGE");
                    }
                  } else if (tracker.repStage === 'ECCENTRIC') {
                    if (kneeAngle <= 98) {
                      tracker.repStage = 'INFLECTION';
                      setRealtimeWarning("FULL LUNGE DEPTH: DRIVE UP");
                      skeletonColor = '#10b981';
                    } else if (kneeAngle > 155) {
                      rejectNoRep("HIT FULL 90° LUNGE DEPTH");
                    }
                  } else if (tracker.repStage === 'INFLECTION') {
                    if (kneeAngle > 125) {
                      tracker.repStage = 'CONCENTRIC';
                      setRealtimeWarning("PUSHING UP");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'CONCENTRIC') {
                    if (kneeAngle >= 158) {
                      const repDuration = now - tracker.repStartTime;
                      if (repDuration >= 1000 && tracker.repFormValid) {
                        registerPerfectRep("LUNGE");
                      } else if (!tracker.repFormValid) {
                        rejectNoRep(tracker.badFormReason || "COMPROMISED FORM");
                      } else {
                        rejectNoRep("TOO FAST! MAINTAIN TEMPO (>= 1.0s)");
                      }
                    }
                  }
                } else {
                  setRealtimeWarning("ALIGN LEGS FOR LUNGES");
                  skeletonColor = '#f59e0b';
                  tracker.readyHoldFrames = 0;
                  if (tracker.repStage !== 'IDLE') tracker.repStage = 'IDLE';
                }

              } else {
                // BICEP CURLS: Elbow Pinning & Full ROM
                const shoulder = lm[11] || lm[12];
                const elbow = lm[13] || lm[14];
                const wrist = lm[15] || lm[16];
                const hip = lm[23] || lm[24];

                if (isPtVisible(shoulder) && isPtVisible(elbow) && isPtVisible(wrist) && isPtVisible(hip)) {
                  const rawElbowAngle = calculateAngle(shoulder, elbow, wrist);
                  const rawUpperArmAngle = calculateAngle(hip, shoulder, elbow);
                  const elbowAngle = smoothAngle('curl_elbow', rawElbowAngle);
                  const upperArmAngle = smoothAngle('curl_upperarm', rawUpperArmAngle);

                  // Strict Form: Upper arm must stay close to torso (< 35°)
                  if (upperArmAngle > 35) {
                    invalidateRep("KEEP ELBOW PINNED TO RIBS!");
                  }

                  if (tracker.repStage === 'IDLE') {
                    // Arm MUST be fully extended downward (lockout) with elbow pinned
                    if (elbowAngle > 148 && upperArmAngle <= 30) {
                      tracker.readyHoldFrames = (tracker.readyHoldFrames || 0) + 1;
                      skeletonColor = '#10b981';
                      if (tracker.readyHoldFrames >= 4) {
                        tracker.repStage = 'READY';
                        setRealtimeWarning("READY: INITIATE CURL WITH CONTROL");
                      } else {
                        setRealtimeWarning("HOLD ARM FULLY EXTENDED TO CALIBRATE");
                      }
                    } else {
                      tracker.readyHoldFrames = 0;
                      setRealtimeWarning("EXTEND ARM DOWNWARD & PIN ELBOW TO CALIBRATE");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'READY') {
                    if (elbowAngle < 125) {
                      tracker.repStage = 'CONCENTRIC';
                      tracker.repStartTime = now;
                      tracker.repFormValid = true;
                      setRealtimeWarning("CURLING UP - SQUEEZE BICEP");
                      skeletonColor = '#f59e0b';
                    } else {
                      setRealtimeWarning("READY: INITIATE CURL WITH CONTROL");
                    }
                  } else if (tracker.repStage === 'CONCENTRIC') {
                    if (elbowAngle <= 56) {
                      tracker.repStage = 'INFLECTION';
                      setRealtimeWarning("PEAK CONTRACTION: LOWER SLOWLY");
                      skeletonColor = '#10b981';
                    } else if (elbowAngle > 145) {
                      rejectNoRep("INCOMPLETE CURL - SQUEEZE TO TOP (< 56°)");
                    }
                  } else if (tracker.repStage === 'INFLECTION') {
                    if (elbowAngle > 85) {
                      tracker.repStage = 'ECCENTRIC';
                      setRealtimeWarning("CONTROL THE DESCENT");
                      skeletonColor = '#f59e0b';
                    }
                  } else if (tracker.repStage === 'ECCENTRIC') {
                    if (elbowAngle >= 148) {
                      const repDuration = now - tracker.repStartTime;
                      if (repDuration >= 1000 && tracker.repFormValid) {
                        registerPerfectRep("BICEP CURL");
                      } else if (!tracker.repFormValid) {
                        rejectNoRep(tracker.badFormReason || "ELBOW FLARED");
                      } else {
                        rejectNoRep("TOO FAST! CONTROL THE TEMPO (>= 1.0s)");
                      }
                    }
                  }
                } else {
                  setRealtimeWarning("ALIGN ARM & TORSO IN CAMERA");
                  skeletonColor = '#f59e0b';
                  tracker.readyHoldFrames = 0;
                  if (tracker.repStage !== 'IDLE') tracker.repStage = 'IDLE';
                }
              }

              // Update DOM Rep Counter
              const repCounterEl = document.getElementById('repCounter');
              if (repCounterEl) {
                if (tracker.waitingForSignal > 0) {
                  repCounterEl.innerText = formatWaitingMessage(tracker.waitingForSignal);
                } else {
                  repCounterEl.innerText = `SET: ${tracker.setCount} | REPS: ${tracker.repCount}`;
                }
              }

              // Sync to React Ref for Saving
              workoutStatsRef.current = { sets: tracker.setCount, reps: tracker.repCount };

              const restTimerEl = document.getElementById('restTimer');
              if (restTimerEl) {
                if (tracker.isResting) {
                  const restSeconds = Math.floor((now - tracker.restStartTime) / 1000);
                  restTimerEl.innerText = `REST GAP: ${restSeconds}s`;
                  restTimerEl.style.display = 'block';
                } else {
                  restTimerEl.style.display = 'none';
                }
              }

              window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {color: skeletonColor, lineWidth: 5});
              window.drawLandmarks(ctx, results.poseLandmarks, {color: 'white', lineWidth: 2, radius: 3});
            }
          });
          
          // Render Loop
          const processFrame = async () => {
            if (videoRef.current && poseRef.current && streamRef.current) {
              if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) { requestAnimationFrame(processFrame); return; }
              try { 
                await poseRef.current.send({image: videoRef.current}); 
                if (handsRef.current) {
                   await handsRef.current.send({image: videoRef.current});
                }
              } catch(e){
                console.error("MediaPipe Error:", e);
              }
              requestAnimationFrame(processFrame);
            }
          };
          let loopStarted = false;
          const startLoop = () => {
             if (loopStarted) return;
             loopStarted = true;
             processFrame();
          };
          
          const checkReady = setInterval(() => {
             if (videoRef.current && videoRef.current.videoWidth > 0) {
                clearInterval(checkReady);
                startLoop();
             }
          }, 50);
        }
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setShowCamera(false);
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const resizeAndProcess = (srcBase64) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      setImgPreview(resizedBase64);
      processImage(resizedBase64);
    };
    img.src = srcBase64;
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // AGGRESSIVELY limit width to prevent 400 Bad Request on Groq Vision API
    const MAX_WIDTH = 400;
    const scale = MAX_WIDTH / video.videoWidth;
    canvas.width = MAX_WIDTH;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64full = canvas.toDataURL('image/jpeg', 0.5);
    setShowCamera(false);
    stopCamera();
    
    // We already scaled it, so we can just process directly!
    setImgPreview(base64full);
    processImage(base64full);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      resizeAndProcess(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64full) => {
    setLoading(true);
    const base64data = base64full.split(',')[1];
    const modeToUse = activeModeRef.current || activeMode || 'food';
    try {
      const response = await fetch(`${API_URL}/analyze_vision/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64data, mode: modeToUse })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Failed to connect to backend Vision API" });
    }
    setLoading(false);
  };

  const handleTotalWeightChange = (newTotalWeightVal) => {
    if (!result) return;
    if (newTotalWeightVal === '') {
      setResult(prev => ({ ...prev, serving_weight_g: '' }));
      return;
    }
    const newTotal = parseFloat(newTotalWeightVal);
    if (isNaN(newTotal) || newTotal < 0) return;

    const oldTotal = Number(result.serving_weight_g) || 0;
    const ratio = oldTotal > 0 ? (newTotal / oldTotal) : 1;

    const updatedIngredients = (result.ingredients || []).map(ing => {
      const oldIngW = Number(ing.weight_g) || 0;
      const newIngW = Math.max(0, Math.round(oldIngW * ratio));
      const calPerG = ing.calories_per_g !== undefined && ing.calories_per_g !== null
        ? Number(ing.calories_per_g)
        : (oldIngW > 0 ? (Number(ing.calories) / oldIngW) : 0);
      const protRatio = oldIngW > 0 ? ((Number(ing.protein_g) || 0) / oldIngW) : 0;
      const carbRatio = oldIngW > 0 ? ((Number(ing.carbs_g) || 0) / oldIngW) : 0;
      const fatRatio = oldIngW > 0 ? ((Number(ing.fats_g) || 0) / oldIngW) : 0;
      const fiberRatio = oldIngW > 0 ? ((Number(ing.fiber_g) || 0) / oldIngW) : 0;
      const sugarRatio = oldIngW > 0 ? ((Number(ing.sugar_g) || 0) / oldIngW) : 0;

      return {
        ...ing,
        weight_g: newIngW,
        calories: Math.round(newIngW * calPerG),
        protein_g: Number((newIngW * protRatio).toFixed(1)),
        carbs_g: Number((newIngW * carbRatio).toFixed(1)),
        fats_g: Number((newIngW * fatRatio).toFixed(1)),
        fiber_g: Number((newIngW * fiberRatio).toFixed(1)),
        sugar_g: Number((newIngW * sugarRatio).toFixed(1)),
      };
    });

    const sumCals = updatedIngredients.length > 0 
      ? updatedIngredients.reduce((acc, cur) => acc + (Number(cur.calories) || 0), 0)
      : Math.round((Number(result.estimated_calories) || 0) * ratio);
    const sumProt = updatedIngredients.length > 0
      ? Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.protein_g) || 0), 0).toFixed(1))
      : Number(((Number(result.protein_g) || 0) * ratio).toFixed(1));
    const sumCarbs = updatedIngredients.length > 0
      ? Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.carbs_g) || 0), 0).toFixed(1))
      : Number(((Number(result.carbs_g) || 0) * ratio).toFixed(1));
    const sumFats = updatedIngredients.length > 0
      ? Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.fats_g) || 0), 0).toFixed(1))
      : Number(((Number(result.fats_g) || 0) * ratio).toFixed(1));
    const sumFiber = updatedIngredients.length > 0
      ? Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.fiber_g) || 0), 0).toFixed(1))
      : Number(((Number(result.fiber_g) || 0) * ratio).toFixed(1));
    const sumSugar = updatedIngredients.length > 0
      ? Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.sugar_g) || 0), 0).toFixed(1))
      : Number(((Number(result.sugar_g) || 0) * ratio).toFixed(1));

    const dishCalPerG = newTotal > 0 ? Number((sumCals / newTotal).toFixed(2)) : (Number(result.calories_per_g) || 0);
    const dishCalPer100g = newTotal > 0 ? Number(((sumCals / newTotal) * 100).toFixed(1)) : (Number(result.calories_per_100g) || 0);

    setResult(prev => ({
      ...prev,
      serving_weight_g: Math.round(newTotal),
      estimated_calories: sumCals,
      calories_per_g: dishCalPerG,
      calories_per_100g: dishCalPer100g,
      protein_g: sumProt,
      carbs_g: sumCarbs,
      fats_g: sumFats,
      fiber_g: sumFiber,
      sugar_g: sumSugar,
      ingredients: updatedIngredients
    }));
  };

  const handleIngredientWeightChange = (index, newWeightVal) => {
    if (!result || !result.ingredients || !result.ingredients[index]) return;
    if (newWeightVal === '') {
      const updated = [...result.ingredients];
      updated[index] = { ...updated[index], weight_g: '' };
      setResult(prev => ({ ...prev, ingredients: updated }));
      return;
    }
    const newW = Math.max(0, parseFloat(newWeightVal));
    if (isNaN(newW)) return;

    const updatedIngredients = result.ingredients.map((ing, i) => {
      if (i !== index) return ing;
      const oldW = Number(ing.weight_g) || 0;
      const calPerG = ing.calories_per_g !== undefined && ing.calories_per_g !== null
        ? Number(ing.calories_per_g)
        : (oldW > 0 ? (Number(ing.calories) / oldW) : 0);
      const protRatio = oldW > 0 ? ((Number(ing.protein_g) || 0) / oldW) : 0;
      const carbRatio = oldW > 0 ? ((Number(ing.carbs_g) || 0) / oldW) : 0;
      const fatRatio = oldW > 0 ? ((Number(ing.fats_g) || 0) / oldW) : 0;
      const fiberRatio = oldW > 0 ? ((Number(ing.fiber_g) || 0) / oldW) : 0;
      const sugarRatio = oldW > 0 ? ((Number(ing.sugar_g) || 0) / oldW) : 0;

      return {
        ...ing,
        weight_g: Math.round(newW),
        calories: Math.round(newW * calPerG),
        protein_g: Number((newW * protRatio).toFixed(1)),
        carbs_g: Number((newW * carbRatio).toFixed(1)),
        fats_g: Number((newW * fatRatio).toFixed(1)),
        fiber_g: Number((newW * fiberRatio).toFixed(1)),
        sugar_g: Number((newW * sugarRatio).toFixed(1)),
      };
    });

    const sumWeight = updatedIngredients.reduce((acc, cur) => acc + (Number(cur.weight_g) || 0), 0);
    const sumCals = updatedIngredients.reduce((acc, cur) => acc + (Number(cur.calories) || 0), 0);
    const sumProt = Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.protein_g) || 0), 0).toFixed(1));
    const sumCarbs = Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.carbs_g) || 0), 0).toFixed(1));
    const sumFats = Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.fats_g) || 0), 0).toFixed(1));
    const sumFiber = Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.fiber_g) || 0), 0).toFixed(1));
    const sumSugar = Number(updatedIngredients.reduce((acc, cur) => acc + (Number(cur.sugar_g) || 0), 0).toFixed(1));

    const dishCalPerG = sumWeight > 0 ? Number((sumCals / sumWeight).toFixed(2)) : 0;
    const dishCalPer100g = sumWeight > 0 ? Number(((sumCals / sumWeight) * 100).toFixed(1)) : 0;

    setResult(prev => ({
      ...prev,
      serving_weight_g: sumWeight,
      estimated_calories: sumCals,
      calories_per_g: dishCalPerG,
      calories_per_100g: dishCalPer100g,
      protein_g: sumProt,
      carbs_g: sumCarbs,
      fats_g: sumFats,
      fiber_g: sumFiber,
      sugar_g: sumSugar,
      ingredients: updatedIngredients
    }));
  };

  const handleAcceptData = async () => {
    if (!user) return alert("You must be logged in.");
    
    setLoading(true);
    try {
      if (activeMode === 'physique' && result?.body_type_category) {
        const catMap = {
          "Shredded": "Shredded (6-9%)",
          "Athletic": "Athletic (10-14%)",
          "Fit": "Fit (15-19%)",
          "Average": "Average (20-24%)",
          "Heavy": "Heavy (25-29%)",
          "Obese": "Obese (30%+)"
        };
        const mapped = catMap[result.body_type_category] || catMap["Average"];
        
        const response = await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body_fat: mapped })
        });
        const updatedUser = await response.json();
        if (updateUser) updateUser(updatedUser);
        
      } else if (activeMode === 'equipment' && result?.detected_equipment) {
        const eqString = result.detected_equipment.join(', ');
        const response = await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipment: eqString })
        });
        const updatedUser = await response.json();
        if (updateUser) updateUser(updatedUser);
        
      } else if (activeMode === 'food' && result?.food_name) {
        const dishWeight = Number(result.serving_weight_g) || 0;
        const dishCals = Number(result.estimated_calories) || 0;
        const calPerG = Number(result.calories_per_g) || (dishWeight > 0 ? Number((dishCals / dishWeight).toFixed(2)) : 0);
        const calPer100g = Number(result.calories_per_100g) || (dishWeight > 0 ? Number(((dishCals / dishWeight) * 100).toFixed(1)) : 0);

        const response = await fetch(`${API_URL}/log_food/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            food_name: result.food_name,
            calories: dishCals,
            calories_per_g: calPerG,
            calories_per_100g: calPer100g,
            protein_g: Number(result.protein_g) || 0,
            carbs_g: Number(result.carbs_g) || 0,
            fats_g: Number(result.fats_g) || 0,
            fiber_g: Number(result.fiber_g) || 0,
            sugar_g: Number(result.sugar_g) || 0,
            vitamins: result.vitamins || [],
            minerals: result.minerals || [],
            glycemic_index: result.glycemic_index || "",
            health_score: Number(result.health_score) || 0,
            serving_weight_g: dishWeight,
            ingredients: result.ingredients || [],
            scientific_notes: result.scientific_notes || "",
            date: new Date().toISOString().split('T')[0]
          })
        });
        const resData = await response.json();
        const weightText = dishWeight ? ` (${dishWeight}g)` : '';
        const calDensityText = calPerG ? ` [${calPerG} kcal/g]` : '';
        alert(resData.message || `Successfully logged ${result.food_name}${weightText} (${dishCals} kcal${calDensityText}) to database!`);

      } else if (activeMode === 'form' && result?.detected_exercise) {
        // Construct the log payload using real-time tracked sets & reps
        const stats = workoutStatsRef.current;
        const response = await fetch(`${API_URL}/log_workout/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            exercise_name: result.detected_exercise,
            sets: stats.sets || 1,
            reps: stats.reps || 0,
            weight: 0,
            form_score: result.form_score || 100,
            critique: result.critique || 'Good execution',
            date: new Date().toISOString().split('T')[0]
          })
        });
        const resData = await response.json();
        alert(resData.message || `Successfully logged ${stats.sets} sets of ${result.detected_exercise} to database!`);

      } else {
        alert("Action completed!");
      }
    } catch (err) {
      alert("Error saving data");
    }
    setLoading(false);
  };

  return (
    <div className="fade-up relative w-full mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl font-bold text-white tracking-wide">
          IRON<span className="text-[#C7F36B]">FORGE</span> VISION
        </h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
          Close Hub ✕
        </button>
      </div>

      {!showCamera && !imgPreview && (
        <div className="relative p-6 md:p-8 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(9,9,11,1) 0%, rgba(9,9,11,0.8) 100%), url("https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1000")', backgroundSize: 'cover' }}>
          <div className="absolute inset-0 bg-[#54D8CF]/10 mix-blend-overlay"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] bg-[#54D8CF]/10 border border-[#54D8CF]/30 rounded-full px-3.5 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#54D8CF] animate-pulse" /> Live Camera Modules
            </div>
            <h3 className="font-display text-4xl font-bold text-white leading-tight mb-2">
              COMPUTER VISION <span className="text-[#54D8CF]">MODELS</span>
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-0">
              Select a module below to activate your webcam.
            </p>
          </div>
        </div>
      )}

      {/* LIVE CAMERA INTERFACE */}
      {showCamera && (
        <div className="mb-8 rounded-3xl overflow-hidden border border-[#C7F36B]/50 relative fade-up bg-black ">
          <style>{`
            @keyframes scanline {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
          `}</style>
          
          {/* DYNAMIC TOP BAR AND DROPDOWN */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 self-start">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold text-white uppercase tracking-widest">Live: {activeMode} Scanner</span>
            </div>
            {activeMode === 'form' && (
              <div className="flex flex-col gap-1.5">
                <select 
                  id="exerciseSelector"
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="bg-black/80 backdrop-blur-md text-[#C7F36B] font-bold border border-[#C7F36B]/50 rounded-xl px-3 py-2.5 outline-none text-sm shadow-xl cursor-pointer"
                >
                  <option value="Auto-Detect">Auto-Detect Exercise</option>
                  <option value="Squat">Squat</option>
                  <option value="Bicep Curl">Bicep Curl</option>
                  <option value="Deadlift">Deadlift</option>
                  <option value="Overhead Press">Overhead Press</option>
                  <option value="Lunges">Lunges</option>
                  {todaysExercises.length > 0 ? (
                    <optgroup label="Today's AI Plan">
                      {todaysExercises.map((ex, i) => <option key={i} value={ex.name}>{ex.name}</option>)}
                    </optgroup>
                  ) : (
                    <optgroup label="Today's AI Plan">
                      <option disabled>Generate a plan on Dashboard first!</option>
                    </optgroup>
                  )}
                </select>

                {selectedExercise === 'Auto-Detect' && (
                  <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#C7F36B]/40 flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse"></span>
                    <span className="text-[10px] font-extrabold text-white tracking-widest uppercase">
                      AI RECOGNIZING: <span className="text-[#C7F36B]">{detectedExerciseDisplay}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {activeMode === 'form' && (
              <div className="flex flex-wrap gap-2 items-center">
                <div className="bg-[#54D8CF]/20 border border-[#54D8CF]/50 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-max ">
                  <svg className="w-3.5 h-3.5 text-[#54D8CF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-bold text-[#54D8CF] uppercase tracking-widest">Biomechanical Skeleton Active</span>
                </div>

                <div className="bg-[#C7F36B]/20 border border-[#C7F36B]/50 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-2.5 ">
                  <span className={`w-2.5 h-2.5 rounded-full ${isVoiceActive ? 'bg-[#C7F36B] animate-ping' : 'bg-amber-400'}`}></span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#C7F36B] uppercase tracking-widest flex items-center gap-1">
                      AI Voice Commander Active
                    </span>
                    <span className="text-[11px] font-extrabold text-white max-w-[280px] truncate">
                      {voiceTranscript || 'Say "Start set 1", "Set 2", "Go"...'}
                    </span>
                  </div>
                  <button 
                    onClick={startVoiceRecognition}
                    className="ml-1 text-[10px] font-bold bg-[#C7F36B]/30 hover:bg-[#C7F36B]/50 text-[#C7F36B] border border-[#C7F36B]/40 px-2 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1"
                    title="Restart Deepgram Nova-3 AI Voice Engine"
                  >
                    ↻ Mic
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {activeMode === 'form' && (
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
              <button onClick={() => { setShowCamera(false); stopCamera(); }} className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white transition-colors hover:bg-white/10">
                Cancel ✕
              </button>
              <div id="repCounter" className="bg-black/80 backdrop-blur-xl border-2 border-[#C7F36B] text-[#C7F36B] font-display font-black text-3xl px-6 py-2 rounded-xl ">
                [WAITING FOR 1 FINGER OR SAY 'START' FOR SET 1]
              </div>
              <div id="restTimer" style={{display: 'none'}} className="bg-black/80 backdrop-blur-xl border-2 border-[#54D8CF] text-[#54D8CF] font-display font-black text-xl px-6 py-2 rounded-xl  animate-pulse">
                REST GAP: 0s
              </div>
            </div>
          )}
          {activeMode !== 'form' && (
            <button onClick={() => { setShowCamera(false); stopCamera(); }} className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white transition-colors hover:bg-white/10">
              Cancel ✕
            </button>
          )}
          
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-[60vh] object-cover" />
          <canvas ref={canvasOverlayRef} className="absolute inset-0 w-full h-[60vh] object-cover pointer-events-none z-20" />
          <canvas ref={canvasRef} className="hidden" />

          {/* UNIVERSAL SPATIAL MESH BACKGROUND */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center overflow-hidden">
            <style>{`
              @keyframes meshMove {
                0% { background-position: 0 0; }
                100% { background-position: 0 40px; }
              }
              @keyframes meshPulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.8; }
              }
            `}</style>
            <div className="absolute inset-0 z-0 mix-blend-screen" style={{
              backgroundImage: `
                linear-gradient(to right, rgba(16, 185, 129, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(16, 185, 129, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              transform: 'perspective(600px) rotateX(60deg) translateY(-50px) scale(2)',
              animation: 'meshMove 2s linear infinite, meshPulse 4s ease-in-out infinite',
              transformOrigin: 'bottom'
            }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10 pointer-events-none"></div>
            
            {/* DYNAMIC HUD OVERLAYS */}
            {activeMode === 'form' && (
              <div className={`absolute top-[10%] px-4 py-2 rounded-full border backdrop-blur-sm shadow-xl transition-colors duration-300 z-30 
                ${realtimeWarning.includes('PERFECT') ? 'bg-[#C7F36B]/20 border-[#C7F36B] text-[#C7F36B]' 
                : realtimeWarning.includes('STANDING') ? 'bg-[#54D8CF]/20 border-[#54D8CF] text-[#54D8CF]' 
                : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                <span className="text-[10px] font-black tracking-widest uppercase">{realtimeWarning}</span>
              </div>
            )}

            {activeMode === 'physique' && (
              <div className="relative w-full h-full flex items-center justify-center z-20">
                {/* SVG Human Silhouette Outline */}
                <svg viewBox="0 0 200 300" className="w-64 h-96 opacity-60 drop-">
                  <circle cx="100" cy="80" r="45" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10 5" className="animate-[pulse_2s_infinite]" />
                  <path d="M 68 115 Q 20 130 10 220 L 10 300 L 190 300 L 190 220 Q 180 130 132 115" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10 5" className="animate-[pulse_2s_infinite]" />
                </svg>
                {/* Animated Scan Line */}
                <div className="absolute left-0 right-0 h-1 bg-[#C7F36B] " 
                     style={{ animation: 'scanline 3s cubic-bezier(0.4, 0, 0.2, 1) infinite', width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
                
                <div className="absolute top-[10%] text-[10px] font-black tracking-widest text-[#C7F36B] uppercase bg-black/50 px-4 py-2 rounded-full border border-[#C7F36B]/30 backdrop-blur-sm">
                  Align Head & Shoulders
                </div>
              </div>
            )}

            {activeMode === 'food' && (
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-[#C7F36B]/40 border-dashed animate-[spin_10s_linear_infinite] z-20">
                <div className="absolute inset-0 rounded-full bg-[#C7F36B]/5 mix-blend-overlay"></div>
              </div>
            )}
            
            {activeMode === 'equipment' && (
              <div className="relative w-full h-full flex items-center justify-center z-20">
                <div className="z-20 text-[10px] font-black tracking-[0.3em] text-[#C7F36B] uppercase bg-black/50 px-4 py-2 rounded-full border border-[#C7F36B]/30 backdrop-blur-sm animate-pulse">
                  SPATIAL MESH SCANNER ACTIVE
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center z-20">
            <button onClick={captureFrame} className="w-20 h-20 rounded-full border-4 border-[#C7F36B] flex items-center justify-center hover:scale-105 transition-transform bg-black/50 backdrop-blur-sm ">
              <div className="w-14 h-14 rounded-full bg-[#C7F36B] hover:bg-[#C7F36B] transition-colors"></div>
            </button>
          </div>
        </div>
      )}

      {/* RESULTS INTERFACE */}
      {imgPreview && (
        <div className="mb-8 p-6 bg-black/40 border border-white/10 rounded-3xl relative overflow-hidden fade-up">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 rounded-xl overflow-hidden border border-white/10 relative h-48 md:h-64">
              <img src={imgPreview} alt="Captured frame" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-[#54D8CF] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-bold text-[#54D8CF] uppercase tracking-widest animate-pulse">Analyzing Frame...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col justify-center">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#C7F36B] mb-2">
                {activeMode?.toUpperCase()} ANALYSIS RESULTS
              </div>
              {result ? (
                result.error ? (
                  <div className="text-red-400 bg-red-400/10 border border-red-400/30 p-4 rounded-xl">{result.error}</div>
                ) : (
                  <div className="space-y-4 fade-up">
                    {/* Dynamic Rendering Based on Mode */}
                    {activeMode === 'food' && (() => {
                      const dishWeight = Number(result.serving_weight_g) || 0;
                      const dishCals = Number(result.estimated_calories) || 0;
                      const dishCalPerG = result.calories_per_g !== undefined && result.calories_per_g !== null
                        ? Number(result.calories_per_g).toFixed(2)
                        : (dishWeight > 0 ? (dishCals / dishWeight).toFixed(2) : '0.00');
                      const dishCalPer100g = result.calories_per_100g !== undefined && result.calories_per_100g !== null
                        ? Number(result.calories_per_100g).toFixed(1)
                        : (dishWeight > 0 ? ((dishCals / dishWeight) * 100).toFixed(1) : '0.0');

                      return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-display text-3xl font-bold text-white tracking-wide">
                            {result.food_name || 'Unknown Dish'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {dishWeight > 0 && (
                              <span className="bg-[#C7F36B]/20 text-[#C7F36B] border border-[#C7F36B]/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                Weight: {dishWeight}g
                              </span>
                            )}
                            {dishCals > 0 && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                Calories: {dishCals} kcal
                              </span>
                            )}
                            <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                              Density: {dishCalPerG} kcal/g ({dishCalPer100g} kcal/100g)
                            </span>
                            {result.confidence && (
                              <span className="bg-[#54D8CF]/20 text-[#54D8CF] border border-[#54D8CF]/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {result.confidence}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Complete Macro, Portion Weight, Density & Micronutrient Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
                          <div className="bg-[#C7F36B]/20 border border-[#C7F36B]/40 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-[#C7F36B] font-black uppercase tracking-widest mb-1 flex items-center justify-between">
                              <span>TOTAL WEIGHT</span>
                              <span className="text-[8px] bg-[#C7F36B]/30 text-[#C7F36B] px-1 py-0.5 rounded font-black tracking-normal">EDIT</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input 
                                type="number" 
                                min="0" 
                                max="5000" 
                                value={result.serving_weight_g !== undefined ? result.serving_weight_g : dishWeight}
                                onChange={(e) => handleTotalWeightChange(e.target.value)}
                                className="w-16 bg-black/70 text-xl font-black text-white px-1.5 py-0.5 rounded border border-[#C7F36B]/50 focus:border-[#C7F36B] outline-none"
                                title="Edit Total Meal Weight (all ingredients scale proportionally)"
                              />
                              <span className="text-xs text-[#C7F36B] font-bold">g</span>
                            </div>
                          </div>

                          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-amber-300 font-black uppercase tracking-widest mb-1">CALORIES</div>
                            <div className="text-xl font-black text-white">{dishCals}<span className="text-xs text-amber-300 font-bold ml-0.5">kcal</span></div>
                          </div>

                          <div className="bg-orange-500/20 border border-orange-500/35 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-orange-300 font-black uppercase tracking-widest mb-1">CAL / GRAM</div>
                            <div className="text-xl font-black text-orange-300">{dishCalPerG}<span className="text-xs font-bold ml-0.5">kcal/g</span></div>
                            <div className="text-[9px] text-zinc-400 font-semibold">{dishCalPer100g} kcal/100g</div>
                          </div>

                          <div className="bg-[#54D8CF]/15 border border-[#54D8CF]/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-[#54D8CF] font-black uppercase tracking-widest mb-1">PROTEIN</div>
                            <div className="text-xl font-black text-[#54D8CF]">{result.protein_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-yellow-300 font-black uppercase tracking-widest mb-1">CARBS</div>
                            <div className="text-xl font-black text-yellow-300">{result.carbs_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-rose-300 font-black uppercase tracking-widest mb-1">FATS</div>
                            <div className="text-xl font-black text-rose-300">{result.fats_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-emerald-300 font-black uppercase tracking-widest mb-1">FIBER</div>
                            <div className="text-xl font-black text-emerald-300">{result.fiber_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-purple-500/15 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-purple-300 font-black uppercase tracking-widest mb-1">SUGAR</div>
                            <div className="text-xl font-black text-purple-300">{result.sugar_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-cyan-300 font-black uppercase tracking-widest mb-1">HEALTH SCORE</div>
                            <div className="text-xl font-black text-cyan-300">{result.health_score || 90}<span className="text-xs font-bold text-cyan-400">/100</span></div>
                          </div>
                        </div>

                        {/* Vitamins & Minerals Spectrum Panel */}
                        {((result.vitamins && result.vitamins.length > 0) || (result.minerals && result.minerals.length > 0) || result.glycemic_index) && (
                          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-extrabold text-[#54D8CF] uppercase tracking-widest flex items-center gap-1.5">
                                VITAMINS, MINERALS &amp; GLYCEMIC INDEX
                              </span>
                              {result.glycemic_index && (
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  GI: {result.glycemic_index}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Vitamins */}
                              {result.vitamins && result.vitamins.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1">
                                    <span>DETECTED VITAMINS</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.vitamins.map((vit, idx) => (
                                      <span key={idx} className="bg-amber-400/10 border border-amber-400/30 text-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                        {vit}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Minerals */}
                              {result.minerals && result.minerals.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1">
                                    <span>ESSENTIAL MINERALS</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.minerals.map((min, idx) => (
                                      <span key={idx} className="bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                        {min}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Itemized Ingredients & Grams Breakdown */}
                        {result.ingredients && result.ingredients.length > 0 && (
                          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-extrabold text-[#C7F36B] uppercase tracking-widest flex items-center gap-1.5">
                                SCIENTIFIC INGREDIENT &amp; GRAM BREAKDOWN
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                {result.ingredients_detected_count || result.ingredients.length} DETECTED COMPONENTS
                              </span>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                              {result.ingredients.map((ing, i) => {
                                const ingName = ing.name || ing.ingredient || ing.item || ing.food_item || ing.title || `Component #${i + 1}`;
                                const ingWeight = Number(ing.weight_g) || Number(ing.weight) || 0;
                                const ingCals = Number(ing.calories) || Number(ing.estimated_calories) || Number(ing.kcal) || 0;
                                const ingCalPerG = ing.calories_per_g !== undefined && ing.calories_per_g !== null
                                  ? Number(ing.calories_per_g).toFixed(2)
                                  : (ingWeight > 0 ? (ingCals / ingWeight).toFixed(2) : '0.00');
                                const ingCalPer100g = ing.calories_per_100g !== undefined && ing.calories_per_100g !== null
                                  ? Number(ing.calories_per_100g).toFixed(1)
                                  : (ingWeight > 0 ? ((ingCals / ingWeight) * 100).toFixed(1) : '0.0');

                                const totalWeight = dishWeight || 1;
                                const weightPct = Math.min(100, Math.round((ingWeight / totalWeight) * 100));

                                return (
                                  <div key={i} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl p-3.5 transition-colors space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-2 font-bold text-white">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#C7F36B] shadow-[0_0_8px_#C7F36B]"></span>
                                        <span className="text-sm tracking-wide font-black text-white">{ingName}</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <div className="flex items-center gap-1 bg-[#C7F36B]/15 border border-[#C7F36B]/40 px-2 py-0.5 rounded-md">
                                          <span className="text-[10px] text-[#C7F36B] font-bold">Portion:</span>
                                          <input 
                                            type="number"
                                            min="0"
                                            max="3000"
                                            value={ing.weight_g !== undefined ? ing.weight_g : ingWeight}
                                            onChange={(e) => handleIngredientWeightChange(i, e.target.value)}
                                            className="w-14 bg-black/70 font-mono font-black text-white text-[11px] px-1 py-0.5 rounded border border-[#C7F36B]/40 focus:border-[#C7F36B] outline-none text-right"
                                            title="Edit this ingredient portion weight in grams"
                                          />
                                          <span className="text-[10px] text-[#C7F36B] font-bold">g</span>
                                        </div>
                                        <span className="font-mono font-extrabold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-md text-[11px]">
                                          {ingCals} kcal
                                        </span>
                                        <span className="font-mono font-extrabold text-orange-300 bg-orange-500/20 border border-orange-500/35 px-2.5 py-1 rounded-md text-[11px]">
                                          {ingCalPerG} kcal/g ({ingCalPer100g} kcal/100g)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Gram Proportion Bar */}
                                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden flex">
                                      <div className="bg-gradient-to-r from-emerald-500 via-teal-400 to-[#C7F36B] h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, weightPct)}%` }}></div>
                                    </div>

                                    {/* Macro Pill breakdown for each ingredient */}
                                    <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-300 gap-1.5 pt-1 border-t border-white/5">
                                      <span className="text-[10px] text-zinc-400 font-semibold">Mass Share: <strong className="text-white">{weightPct}%</strong> of plate</span>
                                      <div className="flex flex-wrap items-center gap-2 font-mono">
                                        <span className="bg-[#54D8CF]/10 text-[#54D8CF] px-2 py-0.5 rounded border border-[#54D8CF]/20">
                                          P: <strong>{ing.protein_g ?? 0}g</strong>
                                        </span>
                                        <span className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                                          C: <strong>{ing.carbs_g ?? 0}g</strong>
                                        </span>
                                        <span className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20">
                                          F: <strong>{ing.fats_g ?? 0}g</strong>
                                        </span>
                                        {ing.fiber_g !== undefined && ing.fiber_g !== null && (
                                          <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                                            Fiber: <strong>{ing.fiber_g}g</strong>
                                          </span>
                                        )}
                                        {ing.sugar_g !== undefined && ing.sugar_g !== null && (
                                          <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                                            Sugar: <strong>{ing.sugar_g}g</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ingredient Specific Vitamins & Minerals */}
                                    {((ing.vitamins && ing.vitamins.length > 0) || (ing.minerals && ing.minerals.length > 0)) && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[9px]">
                                        {ing.vitamins && ing.vitamins.map((v, idx) => (
                                          <span key={idx} className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">{v}</span>
                                        ))}
                                        {ing.minerals && ing.minerals.map((m, idx) => (
                                          <span key={idx} className="bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">{m}</span>
                                        ))}
                                      </div>
                                    )}

                                    {ing.health_benefits && (
                                      <div className="text-[10px] text-zinc-300 bg-white/5 p-1.5 rounded border border-white/5 flex items-center gap-1.5">
                                        <span className="text-[#C7F36B] font-bold">Benefit:</span>
                                        <span>{ing.health_benefits}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Scientific Diagnostic Notes */}
                        {result.scientific_notes && (
                          <div className="bg-[#54D8CF]/10 border border-[#54D8CF]/30 rounded-2xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#54D8CF]/20 text-[#54D8CF] flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-[#54D8CF] uppercase tracking-widest mb-0.5">NUTRITIONAL DENSITY DIAGNOSIS</div>
                              <p className="text-xs text-zinc-300 leading-relaxed m-0">{result.scientific_notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })()}

                    {activeMode === 'physique' && (
                      <>
                        <h3 className="font-display text-3xl font-bold text-white">{result.body_type_category || 'Unknown Category'}</h3>
                        <div className="flex flex-wrap gap-3">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[150px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Obesity Count</div>
                            <div className="text-2xl font-bold text-[#C7F36B]">{result.obesity_count || result.estimated_body_fat_percentage || 'Normal Stage'}</div>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400">{result.notable_features}</p>
                      </>
                    )}

                    {activeMode === 'equipment' && (
                      <>
                        <h3 className="font-display text-3xl font-bold text-white">{result.environment_type || 'Workout Area'}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(result.detected_equipment || []).map((eq, i) => (
                            <span key={i} className="bg-[#54D8CF]/20 text-[#54D8CF] border border-[#54D8CF]/30 px-3 py-1 rounded-lg text-sm font-bold">{eq}</span>
                          ))}
                        </div>
                        <p className="text-sm text-zinc-400 mt-2"><strong className="text-white">AI Suggestion:</strong> {result.suggested_workout_focus}</p>
                      </>
                    )}

                    {activeMode === 'form' && (
                      <>
                        <h3 className="font-display text-3xl font-bold text-white">{result.detected_exercise || 'Unknown Exercise'}</h3>
                        <div className="flex flex-wrap gap-3">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[120px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Form Score</div>
                            <div className="text-2xl font-bold text-[#54D8CF]">{result.form_score}<span className="text-sm text-zinc-500">/100</span></div>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 mt-2"><strong className="text-red-400">Critique:</strong> {result.critique}</p>
                        <p className="text-sm text-zinc-300"><strong className="text-[#C7F36B]">Correction:</strong> {result.correction_advice}</p>
                      </>
                    )}

                    <div className="pt-4 flex flex-wrap gap-3">
                      <button onClick={handleAcceptData} className="min-h-[48px] btn-lime font-extrabold text-base py-3 px-6 rounded-xl flex items-center justify-center gap-1.5">
                        <span>✓</span> {activeMode === 'food' ? 'SAVE NUTRITION TO ATHLETE LOG' : 'SAVE TO PROFILE'}
                      </button>
                      <button onClick={() => { setImgPreview(null); setResult(null); handleScanClick(activeMode); }} className="min-h-[48px] btn-outline font-bold text-base py-3 px-6 rounded-xl flex items-center justify-center gap-1.5">
                        Scan Camera Again
                      </button>
                      <button onClick={() => handleUploadClick(activeMode)} className="min-h-[48px] font-bold text-base py-3 px-6 rounded-xl bg-[#54D8CF]/15 hover:bg-[#54D8CF]/25 text-[#54D8CF] border border-[#54D8CF]/40 flex items-center justify-center gap-1.5">
                        Upload Photo
                      </button>
                      <button onClick={() => { setImgPreview(null); setResult(null); }} className="min-h-[48px] font-bold text-base py-3 px-6 rounded-xl bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 flex items-center justify-center">
                        Discard
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-[#ACBAC2] text-sm">Transmitting to neural network...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fallback hidden file input if camera is denied */}
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {!showCamera && !imgPreview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Module 1: Form Coach */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all cursor-pointer" onClick={() => handleScanClick('form')}>
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600" className="absolute w-full h-full object-cover opacity-30 mix-blend-luminosity group-hover:opacity-50 transition" alt="Coach" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">AI Form Coach</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Capture a photo of your exercise form. AI analyzes your joint angles to detect mistakes.</p>
              <button className="btn-lime w-full py-2.5 text-xs font-extrabold">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 2: Auto-Food Logger */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all">
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleScanClick('food')}>
              <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600" className="absolute w-full h-full object-cover opacity-40 group-hover:opacity-60 transition" alt="Food" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Auto-Food Logger</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Snap or upload a photo of your plate. AI detects all ingredients, gram weights, total calories, macros & vitamins.</p>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => handleScanClick('food')} 
                  className="btn-lime flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  OPEN WEBCAM
                </button>
                <button 
                  type="button" 
                  onClick={() => handleUploadClick('food')} 
                  className="flex-1 py-2.5 text-xs font-extrabold rounded-xl bg-[#54D8CF]/20 hover:bg-[#54D8CF]/30 text-[#54D8CF] border border-[#54D8CF]/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  UPLOAD PHOTO
                </button>
              </div>
            </div>
          </div>

          {/* Module 3: Obesity Count Scanner */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all">
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleScanClick('physique')}>
              <img src="https://wger.de/static/images/muscles/muscular_system_front.svg" className="absolute w-full h-full object-contain filter invert opacity-30 mt-4 transition group-hover:opacity-50" alt="Anatomy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Obesity Count Scanner</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Upload a selfie or webcam. AI estimates your exact obesity count and body composition stage.</p>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => handleScanClick('physique')} 
                  className="btn-lime flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  OPEN WEBCAM
                </button>
                <button 
                  type="button" 
                  onClick={() => handleUploadClick('physique')} 
                  className="flex-1 py-2.5 text-xs font-extrabold rounded-xl bg-[#54D8CF]/20 hover:bg-[#54D8CF]/30 text-[#54D8CF] border border-[#54D8CF]/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  UPLOAD PHOTO
                </button>
              </div>
            </div>
          </div>

          {/* Module 4: Gym Equipment Scanner */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all">
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleScanClick('equipment')}>
              <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600" className="absolute w-full h-full object-cover opacity-30 mix-blend-luminosity transition group-hover:opacity-50" alt="Gym" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Equipment Scanner</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Pan camera or upload gym photo. AI detects all equipment and builds a tailored routine.</p>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => handleScanClick('equipment')} 
                  className="btn-lime flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  OPEN WEBCAM
                </button>
                <button 
                  type="button" 
                  onClick={() => handleUploadClick('equipment')} 
                  className="flex-1 py-2.5 text-xs font-extrabold rounded-xl bg-[#54D8CF]/20 hover:bg-[#54D8CF]/30 text-[#54D8CF] border border-[#54D8CF]/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  UPLOAD PHOTO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
