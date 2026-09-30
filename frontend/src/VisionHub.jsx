import React, { useState, useRef, useEffect } from 'react';

export default function VisionHub({ onClose, user, updateUser, plan }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [realtimeWarning, setRealtimeWarning] = useState("Calibrating Biomechanics...");
  
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
  const workoutStatsRef = useRef({ sets: 1, reps: 0 });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
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
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
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
          
          let repCount = 0;
          let setCount = 1;
          let repState = 'up'; // Tracks the phase of the movement
          let lastRepTime = Date.now();
          let isResting = false;
          let restStartTime = 0;
          
          poseRef.current.onResults((results) => {
            const canvas = canvasOverlayRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const now = Date.now();
            
            // Check if user stopped moving for > 5 seconds (Resting Phase)
            if (repCount > 0 && (now - lastRepTime) > 5000) {
              if (!isResting) {
                isResting = true;
                restStartTime = now;
              }
            }
            
            if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks) {
              let skeletonColor = '#10b981'; // Green (Good Form)
              
              const exStr = (document.getElementById('exerciseSelector')?.value || '').toLowerCase();
              
              // Helper to handle rep completion and reset logic
              const triggerRep = () => {
                if (isResting) {
                  // Starting a new set!
                  setCount++;
                  repCount = 0;
                  isResting = false;
                }
                repCount++;
                lastRepTime = now;
              };
              
              if (exStr.includes('squat')) {
                const hip = results.poseLandmarks[23];
                const knee = results.poseLandmarks[25];
                const ankle = results.poseLandmarks[27];
                if (hip && knee && ankle) {
                  const angle = calculateAngle(hip, knee, ankle);
                  if (angle > 160) {
                    if (repState === 'down') { triggerRep(); repState = 'up'; }
                    skeletonColor = '#10b981';
                  } else if (angle < 100) {
                    repState = 'down';
                    skeletonColor = '#10b981';
                  } else {
                    skeletonColor = '#f59e0b'; // Yellow mid-rep
                  }
                }
              } else {
                // Default: Arm Extension (Bicep Curl)
                const shoulder = results.poseLandmarks[11];
                const elbow = results.poseLandmarks[13];
                const wrist = results.poseLandmarks[15];
                if (shoulder && elbow && wrist) {
                  const angle = calculateAngle(shoulder, elbow, wrist);
                  if (angle > 150) {
                    if (repState === 'up') { triggerRep(); repState = 'down'; }
                    skeletonColor = '#10b981';
                  } else if (angle < 60) {
                    repState = 'up';
                    skeletonColor = '#10b981';
                  } else {
                    skeletonColor = '#f59e0b'; // Yellow mid-rep
                  }
                }
              }
              
              // Update direct DOM elements
              const repCounterEl = document.getElementById('repCounter');
              if (repCounterEl) {
                repCounterEl.innerText = `SET: ${setCount} | REPS: ${repCount}`;
              }
              
              // Sync to React Ref for Saving
              workoutStatsRef.current = { sets: setCount, reps: repCount };
              
              const restTimerEl = document.getElementById('restTimer');
              if (restTimerEl) {
                if (isResting) {
                  const restSeconds = Math.floor((now - restStartTime) / 1000);
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
              try { await poseRef.current.send({image: videoRef.current}); } catch(e){}
              requestAnimationFrame(processFrame);
            }
          };
          videoRef.current.onloadeddata = () => {
            processFrame();
          };
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
        
      } else if (activeMode === 'form' && result?.detected_exercise) {
        // Construct the log payload using the real-time tracked data!
        const stats = workoutStatsRef.current;
        const payload = {
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          volume: 0,
          notes: `[AI Form Coach] Score: ${result.form_score}/100. Critique: ${result.critique}`,
          exercises: [{
            name: result.detected_exercise,
            sets: stats.sets,
            reps: stats.reps,
            weight: 0
          }]
        };
        
        await fetch('http://localhost:8000/log_history/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        alert(`Successfully logged ${stats.sets} sets of ${result.detected_exercise} to today's workout history!`);
        
      } else {
        alert("Action not supported for this mode yet.");
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
          IRON<span className="gold-text">FORGE</span> VISION
        </h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
          Close Hub ✕
        </button>
      </div>

      {!showCamera && !imgPreview && (
        <div className="relative p-6 md:p-8 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(9,9,11,1) 0%, rgba(9,9,11,0.8) 100%), url("https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1000")', backgroundSize: 'cover' }}>
          <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-blue-300 bg-blue-400/10 border border-blue-400/30 rounded-full px-3.5 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Live Camera Modules
            </div>
            <h3 className="font-display text-4xl font-bold text-white leading-tight mb-2">
              COMPUTER VISION <span className="text-blue-400">MODELS</span>
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-0">
              Select a module below to activate your webcam.
            </p>
          </div>
        </div>
      )}

      {/* LIVE CAMERA INTERFACE */}
      {showCamera && (
        <div className="mb-8 rounded-3xl overflow-hidden border border-emerald-500/50 relative fade-up bg-black shadow-[0_0_30px_rgba(16,185,129,0.2)]">
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
                className="bg-black/60 backdrop-blur-md text-emerald-400 font-bold border border-emerald-500/50 rounded-lg px-3 py-2 outline-none text-sm shadow-xl"
              >
                <option value="Auto-Detect">✨ Auto-Detect Exercise</option>
                <option value="Bicep Curl">Bicep Curl</option>
                <option value="Squat">Squat</option>
                <option value="Overhead Press">Overhead Press</option>
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
              <div className="bg-blue-500/20 border border-blue-500/50 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5 w-max shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Grip & Barbell Tracking Active</span>
              </div>
            )}
          </div>
          
          {activeMode === 'form' && (
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
              <button onClick={() => { setShowCamera(false); stopCamera(); }} className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white transition-colors hover:bg-white/10">
                Cancel ✕
              </button>
              <div id="repCounter" className="bg-black/80 backdrop-blur-xl border-2 border-emerald-500 text-emerald-400 font-display font-black text-3xl px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                SET: 1 | REPS: 0
              </div>
              <div id="restTimer" style={{display: 'none'}} className="bg-black/80 backdrop-blur-xl border-2 border-blue-500 text-blue-400 font-display font-black text-xl px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse">
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
          <canvas ref={canvasOverlayRef} className="absolute inset-0 w-full h-[60vh] object-cover pointer-events-none z-10" />
          <canvas ref={canvasRef} className="hidden" />

          {/* DYNAMIC HUD OVERLAYS */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
            {activeMode === 'form' && (
              <div className={`absolute top-[10%] px-4 py-2 rounded-full border backdrop-blur-sm shadow-xl transition-colors duration-300 z-30 
                ${realtimeWarning.includes('PERFECT') ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                : realtimeWarning.includes('STANDING') ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                <span className="text-[10px] font-black tracking-widest uppercase">{realtimeWarning}</span>
              </div>
            )}

            {activeMode === 'physique' && (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* SVG Human Silhouette Outline */}
                <svg viewBox="0 0 200 300" className="w-64 h-96 opacity-60 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                  {/* Head */}
                  <circle cx="100" cy="80" r="45" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10 5" className="animate-[pulse_2s_infinite]" />
                  {/* Torso */}
                  <path d="M 68 115 Q 20 130 10 220 L 10 300 L 190 300 L 190 220 Q 180 130 132 115" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10 5" className="animate-[pulse_2s_infinite]" />
                </svg>

                {/* Animated Scan Line */}
                <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.8)]" 
                     style={{ animation: 'scanline 3s cubic-bezier(0.4, 0, 0.2, 1) infinite', width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
                
                <div className="absolute top-[10%] text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-black/50 px-4 py-2 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                  Align Head & Shoulders
                </div>
              </div>
            )}

            {activeMode === 'food' && (
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-emerald-500/40 border-dashed animate-[spin_10s_linear_infinite]">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 mix-blend-overlay"></div>
              </div>
            )}
            
            {activeMode === 'equipment' && (
              <div className="relative w-full h-full p-12 flex items-center justify-center">
                <div className="w-full h-full border border-emerald-500/20 grid grid-cols-3 grid-rows-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-emerald-500/10 flex items-center justify-center">
                      <div className="w-1 h-1 bg-emerald-500/30 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center z-20">
            <button onClick={captureFrame} className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center hover:scale-105 transition-transform bg-black/50 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors"></div>
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
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest animate-pulse">Analyzing Frame...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col justify-center">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-emerald-400 mb-2">
                {activeMode?.toUpperCase()} ANALYSIS RESULTS
              </div>
              {result ? (
                result.error ? (
                  <div className="text-red-400 bg-red-400/10 border border-red-400/30 p-4 rounded-xl">{result.error}</div>
                ) : (
                  <div className="space-y-4 fade-up">
                    {/* Dynamic Rendering Based on Mode */}
                    {activeMode === 'food' && (
                      <>
                        <h3 className="font-display text-3xl font-bold text-white">{result.food_name || 'Unknown Food'}</h3>
                        <div className="flex flex-wrap gap-3">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[100px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Calories</div>
                            <div className="text-xl font-bold text-white">{result.estimated_calories}</div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[90px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Protein</div>
                            <div className="text-xl font-bold text-blue-400">{result.protein_g}g</div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[90px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Carbs</div>
                            <div className="text-xl font-bold text-yellow-400">{result.carbs_g}g</div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeMode === 'physique' && (
                      <>
                        <h3 className="font-display text-3xl font-bold text-white">{result.body_type_category || 'Unknown Category'}</h3>
                        <div className="flex flex-wrap gap-3">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[150px]">
                            <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Est. Body Fat</div>
                            <div className="text-2xl font-bold text-emerald-400">{result.estimated_body_fat_percentage}</div>
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
                            <span key={i} className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-lg text-sm font-bold">{eq}</span>
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
                            <div className="text-2xl font-bold text-blue-400">{result.form_score}<span className="text-sm text-zinc-500">/100</span></div>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 mt-2"><strong className="text-red-400">Critique:</strong> {result.critique}</p>
                        <p className="text-sm text-zinc-300"><strong className="text-emerald-400">Correction:</strong> {result.correction_advice}</p>
                      </>
                    )}

                    <div className="pt-4 flex flex-wrap gap-3">
                      <button onClick={handleAcceptData} className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm py-3 px-6 rounded-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        ✓ SAVE TO PROFILE
                      </button>
                      <button onClick={() => { setImgPreview(null); setResult(null); handleScanClick(activeMode); }} className="bg-white/5 hover:bg-white/10 text-white font-bold text-sm py-3 px-6 rounded-xl border border-white/10 transition-colors">
                        Scan Again
                      </button>
                      <button onClick={() => { setImgPreview(null); setResult(null); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm py-3 px-6 rounded-xl border border-red-500/20 transition-colors">
                        Discard (Don't Save)
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-zinc-500 text-sm">Transmitting to neural network...</div>
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
          <div className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-400/60 transition-all cursor-pointer" onClick={() => handleScanClick('form')}>
            <div className="h-40 relative bg-zinc-900 border-b border-white/5 overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600" className="absolute w-full h-full object-cover opacity-30 mix-blend-luminosity group-hover:opacity-50 transition" alt="Coach" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-400">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-white text-lg mb-1">AI Form Coach</h4>
              <p className="text-sm text-zinc-400 mb-4 h-10">Capture a photo of your exercise form. AI analyzes your joint angles to detect mistakes.</p>
              <button className="text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full py-2.5 rounded-xl transition-all active:scale-95">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 2: Auto-Food Logger */}
          <div className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-400/60 transition-all cursor-pointer" onClick={() => handleScanClick('food')}>
            <div className="h-40 relative bg-zinc-900 border-b border-white/5 overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600" className="absolute w-full h-full object-cover opacity-40 group-hover:opacity-60 transition" alt="Food" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-400">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-white text-lg mb-1">Auto-Food Logger</h4>
              <p className="text-sm text-zinc-400 mb-4 h-10">Snap a picture of your plate. AI detects the food, estimates portion sizes, and extracts macros.</p>
              <button className="text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full py-2.5 rounded-xl transition-all active:scale-95">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 3: Body Fat Scanner */}
          <div className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-400/60 transition-all cursor-pointer" onClick={() => handleScanClick('physique')}>
            <div className="h-40 relative bg-zinc-900 border-b border-white/5 overflow-hidden flex items-center justify-center">
              <img src="https://wger.de/static/images/muscles/muscular_system_front.svg" className="absolute w-full h-full object-contain filter invert opacity-30 mt-4 transition group-hover:opacity-50" alt="Anatomy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-400">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-white text-lg mb-1">Physique Estimator</h4>
              <p className="text-sm text-zinc-400 mb-4 h-10">Upload a selfie. AI estimates your exact body fat stage by analyzing your silhouette.</p>
              <button className="text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full py-2.5 rounded-xl transition-all">
                OPEN WEBCAM
              </button>
            </div>
          </div>

          {/* Module 4: Gym Equipment Scanner */}
          <div className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-400/60 transition-all cursor-pointer" onClick={() => handleScanClick('equipment')}>
            <div className="h-40 relative bg-zinc-900 border-b border-white/5 overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600" className="absolute w-full h-full object-cover opacity-30 mix-blend-luminosity transition group-hover:opacity-50" alt="Gym" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-400">Llama-3.2 Vision (Backend)</div>
              <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse">Live</div>
            </div>
            <div className="p-5 relative z-10">
              <h4 className="font-bold text-white text-lg mb-1">Equipment Scanner</h4>
              <p className="text-sm text-zinc-400 mb-4 h-10">Pan your camera around a hotel gym. AI detects all weights and builds a custom plan.</p>
              <button className="text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full py-2.5 rounded-xl transition-all">
                OPEN WEBCAM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
