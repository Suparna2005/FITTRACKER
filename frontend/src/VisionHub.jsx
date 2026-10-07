import React, { useState, useRef, useEffect } from 'react';

export default function VisionHub({ onClose, user, updateUser, plan, initialMode }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [activeMode, setActiveMode] = useState(initialMode || null);
  const [showCamera, setShowCamera] = useState(false);
  const [realtimeWarning, setRealtimeWarning] = useState("Calibrating Biomechanics...");

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
    repState: 'up'
  });

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
    tracker.lastRepTime = Date.now();
    workoutStatsRef.current = { sets: tracker.setCount, reps: tracker.repCount };

    setRealtimeWarning(`🎤 ${source} DETECTED! STARTING SET ${tracker.setCount}`);
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

  const handleScanClick = async (mode) => {
    setActiveMode(mode);
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
                 
                 if (tracker.waitingForSignal > 0 && count === tracker.waitingForSignal) {
                    startSet(tracker.waitingForSignal, 'HAND SIGNAL');
                 }
                 if (tracker.waitingForSignal > 0) {
                     const repEl = document.getElementById('repCounter');
                     if (repEl) repEl.innerText = formatWaitingMessage(tracker.waitingForSignal);
                 }
                 
                 // Draw the hand landmarks so user can see it's working
                 const canvas = canvasOverlayRef.current;
                 if (canvas && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
                     const ctx = canvas.getContext('2d');
                     window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: '#3b82f6', lineWidth: 4});
                     window.drawLandmarks(ctx, landmarks, {color: '#60a5fa', lineWidth: 1, radius: 2});
                 }
               } else {
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
            
            // Check if user stopped moving for > 5 seconds (Resting Phase)
            if (tracker.repCount > 0 && (now - tracker.lastRepTime) > 5000 && tracker.waitingForSignal === 0) {
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
            
            if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks) {
              let skeletonColor = '#10b981'; // Green (Good Form)
              
              const exStr = (document.getElementById('exerciseSelector')?.value || '').toLowerCase();
              
              // Helper to handle rep completion and reset logic
              const triggerRep = () => {
                if (tracker.waitingForSignal > 0) return; // DON'T count reps if waiting for start signal
                if (tracker.isResting) {
                  // Starting a new set!
                  tracker.setCount++;
                  tracker.repCount = 0;
                  tracker.isResting = false;
                }
                tracker.repCount++;
                tracker.lastRepTime = now;
              };
              
              if (exStr.includes('deadlift')) {
                // 1. DEADLIFT: Hip Hinge & Spine Alignment
                const shoulder = results.poseLandmarks[11];
                const hip = results.poseLandmarks[23];
                const knee = results.poseLandmarks[25];
                const ear = results.poseLandmarks[7];
                
                if (shoulder && hip && knee) {
                  const hipAngle = calculateAngle(shoulder, hip, knee);
                  const spineAngle = ear ? calculateAngle(ear, shoulder, hip) : 180;
                  const isBadForm = spineAngle < 140 || hipAngle < 50;
                  
                  if (isBadForm) {
                    skeletonColor = '#ef4444'; // RED for bad form
                    setRealtimeWarning("BAD FORM: KEEP SPINE NEUTRAL & HIPS HINGED!");
                  } else if (hipAngle > 160) {
                    if (tracker.repState === 'down') { triggerRep(); tracker.repState = 'up'; }
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT LOCKOUT");
                  } else if (hipAngle < 115) {
                    tracker.repState = 'down';
                    skeletonColor = '#10b981';
                    setRealtimeWarning("GOOD: HINGE AT HIPS");
                  } else {
                    skeletonColor = '#f59e0b';
                    setRealtimeWarning("GOOD: DRIVE THROUGH HEELS");
                  }
                }
              } else if (exStr.includes('press') || exStr.includes('overhead')) {
                // 2. OVERHEAD PRESS: Overhead Lockout & Lower Back Arching
                const shoulder = results.poseLandmarks[11];
                const elbow = results.poseLandmarks[13];
                const wrist = results.poseLandmarks[15];
                const hip = results.poseLandmarks[23];
                const ear = results.poseLandmarks[7];

                if (shoulder && elbow && wrist && hip) {
                  const elbowAngle = calculateAngle(shoulder, elbow, wrist);
                  const bodyLeanAngle = ear ? calculateAngle(ear, shoulder, hip) : 180;
                  const isBadForm = bodyLeanAngle < 145; // Arching back too far

                  if (isBadForm) {
                    skeletonColor = '#ef4444';
                    setRealtimeWarning("BAD FORM: DO NOT ARCH LOWER BACK!");
                  } else if (wrist.y < shoulder.y && elbowAngle > 150) {
                    if (tracker.repState === 'down') { triggerRep(); tracker.repState = 'up'; }
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT OVERHEAD LOCKOUT");
                  } else if (elbowAngle < 85) {
                    tracker.repState = 'down';
                    skeletonColor = '#10b981';
                    setRealtimeWarning("GOOD: CONTROL LOWERING");
                  } else {
                    skeletonColor = '#f59e0b';
                    setRealtimeWarning("GOOD: PRESS STRAIGHT UP");
                  }
                }
              } else if (exStr.includes('lunge')) {
                // 3. LUNGES: Knee Depth & Knee-over-Ankle Alignment
                const hip = results.poseLandmarks[23];
                const knee = results.poseLandmarks[25];
                const ankle = results.poseLandmarks[27];

                if (hip && knee && ankle) {
                  const kneeAngle = calculateAngle(hip, knee, ankle);
                  const kneeOverAnkleDiff = Math.abs(knee.x - ankle.x);
                  const isBadForm = kneeOverAnkleDiff > 0.18; // Knee shooting far past ankle

                  if (isBadForm) {
                    skeletonColor = '#ef4444';
                    setRealtimeWarning("BAD FORM: KEEP KNEE ALIGNED OVER ANKLE!");
                  } else if (kneeAngle > 155) {
                    if (tracker.repState === 'down') { triggerRep(); tracker.repState = 'up'; }
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT STANDING POSITION");
                  } else if (kneeAngle < 100) {
                    tracker.repState = 'down';
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT LUNGE DEPTH");
                  } else {
                    skeletonColor = '#f59e0b';
                    setRealtimeWarning("GOOD: KEEP TORSO UPRIGHT");
                  }
                }
              } else if (exStr.includes('squat')) {
                // 4. SQUATS: Knee Depth & Chest Caving
                const hip = results.poseLandmarks[23];
                const knee = results.poseLandmarks[25];
                const ankle = results.poseLandmarks[27];
                const shoulder = results.poseLandmarks[11];
                
                if (hip && knee && ankle && shoulder) {
                  const angle = calculateAngle(hip, knee, ankle);
                  const backAngle = calculateAngle(shoulder, hip, knee);
                  
                  const isBadForm = backAngle < 60;
                  
                  if (isBadForm) {
                      skeletonColor = '#ef4444'; // RED for bad form
                      setRealtimeWarning("BAD FORM: KEEP CHEST UP!");
                  } else if (angle > 160) {
                    if (tracker.repState === 'down') { triggerRep(); tracker.repState = 'up'; }
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT FORM");
                  } else if (angle < 100) {
                    tracker.repState = 'down';
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT FORM");
                  } else {
                    skeletonColor = '#f59e0b'; // Yellow mid-rep
                    setRealtimeWarning("GOOD: SQUEEZE THE REP");
                  }
                }
              } else {
                // 5. BICEP CURL / ARM EXTENSION: Elbow Pinning
                const shoulder = results.poseLandmarks[11];
                const elbow = results.poseLandmarks[13];
                const wrist = results.poseLandmarks[15];
                const hip = results.poseLandmarks[23];
                
                if (shoulder && elbow && wrist && hip) {
                  const angle = calculateAngle(shoulder, elbow, wrist);
                  const upperArmAngle = calculateAngle(hip, shoulder, elbow);
                  
                  const isBadForm = upperArmAngle > 35;
                  
                  if (isBadForm) {
                      skeletonColor = '#ef4444'; // RED for bad form
                      setRealtimeWarning("BAD FORM: KEEP ELBOWS PINNED!");
                  } else if (angle > 150) {
                    if (tracker.repState === 'up') { triggerRep(); tracker.repState = 'down'; }
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT FORM");
                  } else if (angle < 60) {
                    tracker.repState = 'up';
                    skeletonColor = '#10b981';
                    setRealtimeWarning("PERFECT FORM");
                  } else {
                    skeletonColor = '#f59e0b'; // Yellow mid-rep
                    setRealtimeWarning("GOOD: SQUEEZE THE REP");
                  }
                }
              }
              
              // Update direct DOM elements
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
    try {
      const response = await fetch('http://localhost:8000/analyze_vision/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64data, mode: activeMode })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Failed to connect to backend Vision API" });
    }
    setLoading(false);
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
        
        const response = await fetch(`http://localhost:8000/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body_fat: mapped })
        });
        const updatedUser = await response.json();
        if (updateUser) updateUser(updatedUser);
        
      } else if (activeMode === 'equipment' && result?.detected_equipment) {
        const eqString = result.detected_equipment.join(', ');
        const response = await fetch(`http://localhost:8000/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipment: eqString })
        });
        const updatedUser = await response.json();
        if (updateUser) updateUser(updatedUser);
        
      } else if (activeMode === 'food' && result?.food_name) {
        const response = await fetch('http://localhost:8000/log_food/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            food_name: result.food_name,
            calories: Number(result.estimated_calories) || 0,
            protein_g: Number(result.protein_g) || 0,
            carbs_g: Number(result.carbs_g) || 0,
            fats_g: Number(result.fats_g) || 0,
            fiber_g: Number(result.fiber_g) || 0,
            sugar_g: Number(result.sugar_g) || 0,
            vitamins: result.vitamins || [],
            minerals: result.minerals || [],
            glycemic_index: result.glycemic_index || "",
            health_score: Number(result.health_score) || 0,
            serving_weight_g: Number(result.serving_weight_g) || 0,
            ingredients: result.ingredients || [],
            scientific_notes: result.scientific_notes || "",
            date: new Date().toISOString().split('T')[0]
          })
        });
        const resData = await response.json();
        const weightText = result.serving_weight_g ? ` (${result.serving_weight_g}g)` : '';
        alert(resData.message || `Successfully logged ${result.food_name}${weightText} (${result.estimated_calories} kcal) to database!`);

      } else if (activeMode === 'form' && result?.detected_exercise) {
        // Construct the log payload using real-time tracked sets & reps
        const stats = workoutStatsRef.current;
        const response = await fetch('http://localhost:8000/log_workout/', {
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
              <select 
                id="exerciseSelector"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="bg-black/80 backdrop-blur-md text-[#C7F36B] font-bold border border-[#C7F36B]/50 rounded-xl px-3 py-2.5 outline-none text-sm shadow-xl cursor-pointer"
              >
                <option value="Auto-Detect">✨ Auto-Detect Exercise</option>
                <option value="Bicep Curl">Bicep Curl</option>
                <option value="Squat">Squat</option>
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
                      ⚡ Deepgram Nova-3 / AI Voice Active
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
                    {activeMode === 'food' && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-display text-3xl font-bold text-white tracking-wide">
                            {result.food_name || 'Unknown Dish'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {result.serving_weight_g && (
                              <span className="bg-[#C7F36B]/20 text-[#C7F36B] border border-[#C7F36B]/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                ⚖️ Weight Count: {result.serving_weight_g}g
                              </span>
                            )}
                            {result.estimated_calories && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                ⚡ Calories Count: {result.estimated_calories} kcal
                              </span>
                            )}
                            {result.confidence && (
                              <span className="bg-[#54D8CF]/20 text-[#54D8CF] border border-[#54D8CF]/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                🔬 {result.confidence}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Complete Macro, Portion Weight & Micronutrient Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                          <div className="bg-[#C7F36B]/20 border border-[#C7F36B]/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-[#C7F36B] font-black uppercase tracking-widest mb-1">⚖️ WEIGHT</div>
                            <div className="text-xl font-black text-white">{result.serving_weight_g || 0}<span className="text-xs text-[#C7F36B] font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-amber-300 font-black uppercase tracking-widest mb-1">⚡ CALORIES</div>
                            <div className="text-xl font-black text-white">{result.estimated_calories || 0}<span className="text-xs text-amber-300 font-bold ml-0.5">kcal</span></div>
                          </div>

                          <div className="bg-[#54D8CF]/15 border border-[#54D8CF]/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-[#54D8CF] font-black uppercase tracking-widest mb-1">💪 PROTEIN</div>
                            <div className="text-xl font-black text-[#54D8CF]">{result.protein_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-yellow-300 font-black uppercase tracking-widest mb-1">🌾 CARBS</div>
                            <div className="text-xl font-black text-yellow-300">{result.carbs_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-rose-300 font-black uppercase tracking-widest mb-1">🥑 FATS</div>
                            <div className="text-xl font-black text-rose-300">{result.fats_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-emerald-300 font-black uppercase tracking-widest mb-1">🌿 FIBER</div>
                            <div className="text-xl font-black text-emerald-300">{result.fiber_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-purple-500/15 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-purple-300 font-black uppercase tracking-widest mb-1">🍬 SUGAR</div>
                            <div className="text-xl font-black text-purple-300">{result.sugar_g || 0}<span className="text-xs font-bold ml-0.5">g</span></div>
                          </div>

                          <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-2xl p-3 flex flex-col justify-between">
                            <div className="text-[9px] text-cyan-300 font-black uppercase tracking-widest mb-1">🩺 HEALTH</div>
                            <div className="text-xl font-black text-cyan-300">{result.health_score || 90}<span className="text-xs font-bold text-cyan-400">/100</span></div>
                          </div>
                        </div>

                        {/* Vitamins & Minerals Spectrum Panel */}
                        {((result.vitamins && result.vitamins.length > 0) || (result.minerals && result.minerals.length > 0) || result.glycemic_index) && (
                          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-extrabold text-[#54D8CF] uppercase tracking-widest flex items-center gap-1.5">
                                💊 VITAMINS, MINERALS &amp; GLYCEMIC INDEX
                              </span>
                              {result.glycemic_index && (
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  🟢 GI: {result.glycemic_index}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Vitamins */}
                              {result.vitamins && result.vitamins.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1">
                                    <span>✨ DETECTED VITAMINS</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.vitamins.map((vit, idx) => (
                                      <span key={idx} className="bg-amber-400/10 border border-amber-400/30 text-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                        ✨ {vit}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Minerals */}
                              {result.minerals && result.minerals.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1">
                                    <span>🪨 ESSENTIAL MINERALS</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.minerals.map((min, idx) => (
                                      <span key={idx} className="bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                        🪨 {min}
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
                                🧪 SCIENTIFIC INGREDIENT &amp; GRAM BREAKDOWN
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                {result.ingredients_detected_count || result.ingredients.length} DETECTED COMPONENTS
                              </span>
                            </div>

                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                              {result.ingredients.map((ing, i) => {
                                const ingWeight = Number(ing.weight_g) || 0;
                                const totalWeight = Number(result.serving_weight_g) || 1;
                                const weightPct = Math.min(100, Math.round((ingWeight / totalWeight) * 100));

                                return (
                                  <div key={i} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-3 transition-colors space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2 font-bold text-white">
                                        <span className="w-2 h-2 rounded-full bg-[#C7F36B]"></span>
                                        <span>{ing.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-extrabold text-[#C7F36B] bg-[#C7F36B]/10 border border-[#C7F36B]/20 px-2 py-0.5 rounded text-[11px]">
                                          {ingWeight}g
                                        </span>
                                        <span className="font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                                          {ing.calories || 0} kcal
                                        </span>
                                      </div>
                                    </div>

                                    {/* Gram Proportion Bar */}
                                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden flex">
                                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, weightPct)}%` }}></div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-400 gap-1">
                                      <span>Mass Share: {weightPct}% of plate</span>
                                      <span className="font-mono flex items-center gap-2">
                                        <span>P: <strong className="text-[#54D8CF]">{ing.protein_g ?? 0}g</strong></span>
                                        <span>C: <strong className="text-amber-300">{ing.carbs_g ?? 0}g</strong></span>
                                        <span>F: <strong className="text-rose-300">{ing.fats_g ?? 0}g</strong></span>
                                        {ing.fiber_g ? <span>Fiber: <strong className="text-emerald-300">{ing.fiber_g}g</strong></span> : null}
                                      </span>
                                    </div>

                                    {/* Ingredient Specific Vitamins & Minerals */}
                                    {((ing.vitamins && ing.vitamins.length > 0) || (ing.minerals && ing.minerals.length > 0)) && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[9px]">
                                        {ing.vitamins && ing.vitamins.map((v, idx) => (
                                          <span key={idx} className="bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">✨ {v}</span>
                                        ))}
                                        {ing.minerals && ing.minerals.map((m, idx) => (
                                          <span key={idx} className="bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">🪨 {m}</span>
                                        ))}
                                      </div>
                                    )}

                                    {ing.health_benefits && (
                                      <div className="text-[10px] text-zinc-300 bg-white/5 p-1.5 rounded border border-white/5 flex items-center gap-1">
                                        <span>💡</span>
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
                          <div className="bg-[#54D8CF]/20 border border-[#54D8CF]/30 rounded-2xl p-3.5 flex items-start gap-3">
                            <span className="text-lg">🧬</span>
                            <div>
                              <div className="text-[10px] font-black text-[#54D8CF] uppercase tracking-widest mb-0.5">NUTRITIONAL DENSITY DIAGNOSIS</div>
                              <p className="text-xs text-zinc-300 leading-relaxed m-0">{result.scientific_notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                      <button onClick={handleAcceptData} className="min-h-[48px] btn-lime font-extrabold text-base py-3 px-6 rounded-xl flex items-center justify-center">
                        ✓ SAVE TO PROFILE
                      </button>
                      <button onClick={() => { setImgPreview(null); setResult(null); handleScanClick(activeMode); }} className="min-h-[48px] btn-outline font-bold text-base py-3 px-6 rounded-xl flex items-center justify-center">
                        Scan Again
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
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all cursor-pointer" onClick={() => handleScanClick('food')}>
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600" className="absolute w-full h-full object-cover opacity-40 group-hover:opacity-60 transition" alt="Food" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Auto-Food Logger</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Snap a picture of your plate. AI detects all ingredients, weight count in grams, total calories, macros, vitamins, and minerals.</p>
              <button className="btn-lime w-full py-2.5 text-xs font-extrabold">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 3: Obesity Count Scanner */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all cursor-pointer" onClick={() => handleScanClick('physique')}>
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center">
              <img src="https://wger.de/static/images/muscles/muscular_system_front.svg" className="absolute w-full h-full object-contain filter invert opacity-30 mt-4 transition group-hover:opacity-50" alt="Anatomy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Obesity Count Scanner</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Upload a selfie. AI estimates your exact obesity count and body composition stage by analyzing your silhouette.</p>
              <button className="btn-lime w-full py-2.5 text-xs font-extrabold">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 4: Gym Equipment Scanner */}
          <div className="group relative rounded-2xl border border-[#304149] bg-[#172127] overflow-hidden hover:border-[#54D8CF] transition-all cursor-pointer" onClick={() => handleScanClick('equipment')}>
            <div className="h-40 relative bg-[#10181D] border-b border-[#304149] overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600" className="absolute w-full h-full object-cover opacity-30 mix-blend-luminosity transition group-hover:opacity-50" alt="Gym" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10181D] to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-[#54D8CF]">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-[#C7F36B] text-[#0B1014] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-[#F4F7F8] text-lg mb-1">Equipment Scanner</h4>
              <p className="text-sm text-[#ACBAC2] mb-4 h-10">Pan your camera around a hotel gym. AI detects all weights and builds a custom plan.</p>
              <button className="btn-lime w-full py-2.5 text-xs font-extrabold">
                OPEN WEBCAM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
