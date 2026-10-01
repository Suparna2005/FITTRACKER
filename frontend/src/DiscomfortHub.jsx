import { useState, useEffect } from 'react'
import { Panel } from './theme'

const EXERCISE_LIST = [
  "Barbell Squat", "Bench Press", "Deadlift", "Overhead Press", 
  "Barbell Row", "Incline Dumbbell Press", "Pull-ups", "Bicep Curls", 
  "Tricep Pushdowns", "Leg Press", "Walking Lunges", "Lateral Raises", 
  "Romanian Deadlift", "Plank", "Dips", "Face Pulls"
]

export default function DiscomfortHub({ user, onClose, onPlanGenerated }) {
  const [exerciseName, setExerciseName] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  const [feelingDescription, setFeelingDescription] = useState('')
  const [severity, setSeverity] = useState('Moderate (4-6)')
  const [timing, setTiming] = useState('During exercise')
  const [loading, setLoading] = useState(false)
  const [activeAnalysis, setActiveAnalysis] = useState(null)
  const [historyLogs, setHistoryLogs] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLogs = async () => {
    if (!user) return
    try {
      const res = await fetch(`http://localhost:8000/users/${user.id}/discomfort_logs`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setHistoryLogs(data)
      }
    } catch (e) {
      console.error("Failed to fetch discomfort logs", e)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const selectedEx = exerciseName === 'custom' ? customExercise : exerciseName
    if (!selectedEx || selectedEx.trim().length < 2) {
      showToast("Please select or enter an exercise name.")
      return
    }
    if (!feelingDescription || feelingDescription.trim().length < 5) {
      showToast("Please describe what you felt in detail (at least 5 characters).")
      return
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/log_discomfort/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          exercise_name: selectedEx.trim(),
          feeling_description: feelingDescription.trim(),
          severity: severity.split(' ')[0], // "Mild", "Moderate", "Severe"
          timing: timing
        })
      })

      if (!res.ok) {
        throw new Error("Failed to log discomfort.")
      }

      const data = await res.json()
      setActiveAnalysis(data)
      showToast("Discomfort Analyzed & Saved! AI Doctor & Trainer advice ready.")
      fetchLogs()
    } catch (err) {
      showToast(err.message || "Error submitting discomfort report.")
    }
    setLoading(false)
  }

  const handleDeleteLog = async (logId) => {
    try {
      await fetch(`http://localhost:8000/discomfort_logs/${logId}`, { method: 'DELETE' })
      showToast("Log removed.")
      setHistoryLogs(prev => prev.filter(item => item.id !== logId))
      if (activeAnalysis?.id === logId) setActiveAnalysis(null)
    } catch {
      showToast("Could not delete log.")
    }
  }

  const getSeverityBadge = (sev) => {
    const s = (sev || '').toLowerCase()
    if (s.includes('severe') || s.includes('high')) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">🔴 Severe Pain</span>
    }
    if (s.includes('moderate') || s.includes('med')) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">🟡 Moderate Discomfort</span>
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 Mild Strain</span>
  }

  const parseRec = (recObj, exercise = '', feeling = '') => {
    let rec = recObj;
    if (typeof rec === 'string') {
      try {
        rec = JSON.parse(rec);
      } catch (e) {
        rec = {};
      }
    }
    rec = rec || {};
    
    return {
      probable_cause: rec.probable_cause || rec.cause || rec.reason || `Biomechanical strain or acute joint friction during ${exercise} ('${feeling}'). Likely due to form collapse, excessive load, or inadequate warm-up.`,
      doctor_advice: rec.doctor_advice || rec.doctor || rec.first_aid || `Follow the R.I.C.E protocol (Rest, Ice for 15-20 min, Compression, Elevation). Avoid heavy loading on this joint for 24-48h. Seek medical evaluation if pain worsens.`,
      trainer_advice: rec.trainer_advice || rec.trainer || rec.form_cue || `For ${exercise}, drop working weight by 25-30%. Focus on strict alignment, engage core stability before initiating reps, and control the eccentric lowering phase.`,
      safe_substitutions: Array.isArray(rec.safe_substitutions) && rec.safe_substitutions.length > 0 
        ? rec.safe_substitutions 
        : [`Goblet / Neutral-grip alternative to ${exercise}`, "Dumbbell Supported Movement", "Bodyweight Tempo Reps"],
      next_day_plan_adjustment: rec.next_day_plan_adjustment || `Tomorrow's AI plan will automatically avoid direct heavy strain on ${exercise}, substitute safer movements, and prioritize non-injured body parts.`
    };
  };

  return (
    <div className="space-y-6 fade-up">
      {/* Top Banner */}
      <Panel
        kicker="DUAL AI DIAGNOSTICS & RECOVERY"
        title="WORKOUT DISCOMFORT & INJURY LOGGER 🩺🏋️‍♂️"
        sub="Felt pain, joint clicking or muscle discomfort during your workout? Describe what happened to get instant Doctor & Trainer recommendations. Your data is stored to automatically adjust your next-day training plan!"
        action={
          onClose && (
            <button
              onClick={onClose}
              className="text-sm font-bold text-zinc-300 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-xl transition"
            >
              ✕ Close
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          {/* Form Column */}
          <div className="lg:col-span-6 space-y-5">
            <form onSubmit={handleSubmit} className="bg-black/40 border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
              <h3 className="font-display font-bold text-white text-lg tracking-wide border-b border-white/10 pb-3">
                1. REPORT WORKOUT ISSUE / PAIN
              </h3>

              {/* Exercise Select */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Exercise Performed
                </label>
                {exerciseName === 'custom' ? (
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/60">
                    <input
                      type="text"
                      placeholder="Type custom exercise..."
                      value={customExercise}
                      onChange={(e) => setCustomExercise(e.target.value)}
                      className="p-3.5 w-full text-sm outline-none bg-transparent text-zinc-100 placeholder:text-zinc-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => { setExerciseName(''); setCustomExercise(''); }}
                      className="text-zinc-400 hover:text-red-400 px-4 font-bold bg-white/5 border-l border-white/10"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="field-dark"
                    required
                  >
                    <option value="" disabled>Choose exercise...</option>
                    {EXERCISE_LIST.map(ex => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                    <option value="custom">＋ Other / Custom Exercise...</option>
                  </select>
                )}
              </div>

              {/* What was feeling description */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  What were you feeling? (Describe the problem/pain)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Sharp pinch in front right shoulder when benching, or sharp right knee pain when squatting below parallel..."
                  value={feelingDescription}
                  onChange={(e) => setFeelingDescription(e.target.value)}
                  className="field-dark nice-scroll"
                  required
                />
              </div>

              {/* Severity Level */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Pain / Discomfort Intensity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Mild (1-3)", desc: "Tightness / dull discomfort", border: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
                    { label: "Moderate (4-6)", desc: "Form restriction / noticeable pain", border: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200" },
                    { label: "Severe (7-10)", desc: "Sharp pain / stopped exercise", border: "border-red-500/40 bg-red-500/10 text-red-200" }
                  ].map(opt => (
                    <label
                      key={opt.label}
                      className={`flex flex-col p-3 rounded-xl border cursor-pointer transition text-xs font-semibold ${
                        severity === opt.label ? `${opt.border} ring-2 ring-yellow-400` : 'border-white/10 bg-black/40 text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={opt.label}
                        checked={severity === opt.label}
                        onChange={() => setSeverity(opt.label)}
                        className="sr-only"
                      />
                      <span className="font-bold text-sm text-zinc-100">{opt.label}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  When did it occur?
                </label>
                <select
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  className="field-dark"
                >
                  <option>During exercise / while lifting</option>
                  <option>Immediately after finishing set</option>
                  <option>Post-workout / later in the day</option>
                  <option>Ongoing chronic irritation</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gold-btn font-extrabold py-4 px-6 rounded-2xl w-full text-base shadow-[0_0_20px_rgba(250,204,21,0.25)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin"></span>
                    ANALYZING DISCOMFORT &amp; GENERATING CARE PLAN...
                  </>
                ) : (
                  'GENERATE AI DOCTOR & TRAINER ADVICE →'
                )}
              </button>
            </form>
          </div>

          {/* AI Output Column */}
          <div className="lg:col-span-6 space-y-5">
            {activeAnalysis ? (() => {
              const rec = parseRec(activeAnalysis.ai_recommendation, activeAnalysis.exercise_name || exerciseName, activeAnalysis.feeling_description || feelingDescription);
              const feelingText = activeAnalysis.feeling_description || feelingDescription || 'Discomfort / Pain';
              const timingText = activeAnalysis.timing || timing || 'During exercise';

              return (
                <div className="bg-black/60 border border-yellow-400/40 rounded-2xl p-5 md:p-6 space-y-5 shadow-[0_0_30px_rgba(250,204,21,0.1)] fade-up">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 block">AI DIAGNOSTIC REPORT DEPLOYED</span>
                      <h3 className="font-display font-bold text-xl text-white">
                        {activeAnalysis.exercise_name || exerciseName || 'Exercise Issue'}
                      </h3>
                    </div>
                    {getSeverityBadge(activeAnalysis.severity || severity)}
                  </div>

                  {/* Patient / Athlete sensation recall */}
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs text-zinc-300">
                    <span className="text-zinc-500 font-bold uppercase text-[10px] block mb-1">Logged Sensation</span>
                    "{feelingText}" ({timingText})
                  </div>

                  {/* Doctor Section */}
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-display font-bold text-red-200 text-sm">
                      <span className="text-lg">🩺</span> DOCTOR ANALYSIS &amp; MEDICAL CARE
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      <strong className="text-white block mb-1">Probable Cause:</strong>
                      {rec.probable_cause}
                    </div>
                    <div className="text-xs text-red-200/90 leading-relaxed pt-2 border-t border-red-500/20">
                      <strong className="text-red-300 block mb-1">Immediate First Aid &amp; Safety:</strong>
                      {rec.doctor_advice}
                    </div>
                  </div>

                  {/* Trainer Section */}
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-display font-bold text-yellow-200 text-sm">
                      <span className="text-lg">🏋️‍♂️</span> TRAINER BIOMECHANICS &amp; FORM CORRECTION
                    </div>
                    <div className="text-xs text-zinc-200 leading-relaxed">
                      {rec.trainer_advice}
                    </div>
                  </div>

                  {/* Substitutions */}
                  {rec.safe_substitutions?.length > 0 && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                      <div className="flex items-center gap-2 font-display font-bold text-emerald-200 text-sm mb-2">
                        <span className="text-lg">🛡️</span> RECOMMENDED SAFE EXERCISE SUBSTITUTIONS
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.safe_substitutions.map((sub, i) => (
                          <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/50 border border-emerald-400/40 text-emerald-200">
                            ✓ {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next-Day Plan Adaptation Banner */}
                  <div className="rounded-2xl border border-blue-400/40 bg-blue-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-blue-200 text-sm flex items-center gap-2">
                        <span>⚡</span> ADAPTIVE NEXT-DAY WORKOUT GUARANTEE
                      </span>
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-400/20 px-2 py-0.5 rounded-full">AUTOMATIC</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {rec.next_day_plan_adjustment}
                    </p>
                    {onPlanGenerated && (
                      <button
                        onClick={onPlanGenerated}
                        className="mt-2 font-bold text-xs px-4 py-2 rounded-xl bg-blue-400 text-zinc-950 hover:bg-blue-300 transition w-full text-center block"
                      >
                        GENERATE ADAPTED WORKOUT PLAN NOW →
                      </button>
                    )}
                  </div>
                </div>
              )
            })() : (
              <div className="bg-black/30 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[360px]">
                <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-3xl mb-4">
                  🩺
                </div>
                <h4 className="font-display text-lg font-bold text-white mb-2">Awaiting Discomfort Log</h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Select an exercise on the left, describe what you felt, and choose the pain severity. The AI Doctor &amp; Trainer engine will generate instant medical care cues and safe exercise substitutions.
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* History Log Section */}
      <Panel
        kicker="PERSISTENT HEALTH HISTORY"
        title="LOGGED DISCOMFORT & INJURY TIMELINE"
        sub="All logged issues are stored permanently. The AI engine reads this timeline to continuously keep your workout plans safe."
      >
        {historyLogs.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            No discomfort logs recorded yet. Log any pain or form issue above.
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {historyLogs.map((log) => (
              <div
                key={log.id}
                className="bg-black/40 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition flex flex-col md:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white text-sm">{log.exercise_name}</span>
                    {getSeverityBadge(log.severity)}
                    <span className="text-[11px] text-zinc-500">
                      {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 italic">"{log.feeling_description}"</p>
                  
                  {(() => {
                    const rLog = parseRec(log.ai_recommendation, log.exercise_name, log.feeling_description);
                    return (
                      <div className="mt-2 text-xs text-zinc-400 space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                        <div>
                          <strong className="text-red-300 font-semibold">Doctor Advice: </strong> 
                          {rLog.doctor_advice}
                        </div>
                        <div>
                          <strong className="text-yellow-300 font-semibold">Trainer Advice: </strong> 
                          {rLog.trainer_advice}
                        </div>
                        {rLog.safe_substitutions?.length > 0 && (
                          <div>
                            <strong className="text-emerald-300 font-semibold">Substitutions: </strong>
                            {rLog.safe_substitutions.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 self-end md:self-start">
                  <button
                    onClick={() => setActiveAnalysis(log)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 hover:bg-yellow-400/20"
                  >
                    View Report 🔍
                  </button>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 border border-red-400/20"
                    title="Delete log"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {toast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] fade-up bg-zinc-900 border border-yellow-400/50 shadow-[0_0_40px_rgba(250,204,21,0.3)] rounded-xl p-5 text-sm font-bold text-white min-w-[300px] flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
          {toast}
        </div>
      )}
    </div>
  )
}
