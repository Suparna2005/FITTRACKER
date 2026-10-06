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
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">🔴 Severe Pain</span>
    }
    if (s.includes('moderate') || s.includes('med')) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FF897A]/20 text-[#FF897A] border border-[#FF897A]/30">🟠 Moderate Discomfort</span>
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#54D8CF]/20 text-[#54D8CF] border border-[#54D8CF]/30">🟢 Mild Strain</span>
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
        sub="Felt pain, joint clicking or muscle discomfort during your workout? Describe what happened to get instant Doctor & Trainer recommendations."
        action={
          onClose && (
            <button
              onClick={onClose}
              className="btn-outline text-xs py-2 px-4"
            >
              ✕ Close
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          {/* Form Column */}
          <div className="lg:col-span-6 space-y-5">
            <form onSubmit={handleSubmit} className="bg-[#10181D] border border-[#304149] rounded-2xl p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-[#F4F7F8] text-base tracking-wide border-b border-[#304149] pb-3">
                1. REPORT WORKOUT ISSUE / PAIN
              </h3>

              {/* Exercise Select */}
              <div>
                <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">
                  Exercise Performed
                </label>
                {exerciseName === 'custom' ? (
                  <div className="flex rounded-xl overflow-hidden border border-[#304149] bg-[#10181D]">
                    <input
                      type="text"
                      placeholder="Type custom exercise..."
                      value={customExercise}
                      onChange={(e) => setCustomExercise(e.target.value)}
                      className="p-3.5 w-full text-sm outline-none bg-transparent text-[#F4F7F8] placeholder:text-[#6C7D86]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => { setExerciseName(''); setCustomExercise(''); }}
                      className="text-[#ACBAC2] hover:text-[#EF4444] px-4 font-bold bg-[#172127] border-l border-[#304149]"
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

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">
                  What were you feeling? (Describe the problem/pain)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Sharp pinch in front right shoulder when benching..."
                  value={feelingDescription}
                  onChange={(e) => setFeelingDescription(e.target.value)}
                  className="field-dark nice-scroll"
                  required
                />
              </div>

              {/* Severity Level */}
              <div>
                <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">
                  Pain / Discomfort Intensity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Mild (1-3)", desc: "Tightness / dull discomfort", border: "border-[#54D8CF]/40 bg-[#54D8CF]/10 text-[#54D8CF]" },
                    { label: "Moderate (4-6)", desc: "Form restriction / noticeable pain", border: "border-[#FF897A]/40 bg-[#FF897A]/10 text-[#FF897A]" },
                    { label: "Severe (7-10)", desc: "Sharp pain / stopped exercise", border: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]" }
                  ].map(opt => (
                    <label
                      key={opt.label}
                      className={`flex flex-col p-3 rounded-xl border cursor-pointer transition text-xs font-semibold ${
                        severity === opt.label ? `${opt.border} ring-2 ring-[#C7F36B]` : 'border-[#304149] bg-[#10181D] text-[#ACBAC2] hover:bg-[#172127]'
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
                      <span className="font-bold text-sm text-[#F4F7F8]">{opt.label}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div>
                <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">
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
                className="btn-lime py-4 px-6 rounded-2xl w-full text-base flex items-center justify-center gap-2"
              >
                {loading ? 'ANALYZING DISCOMFORT...' : 'GENERATE AI DOCTOR & TRAINER ADVICE →'}
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
                <div className="bg-[#10181D] border border-[#304149] rounded-2xl p-5 md:p-6 space-y-4 fade-up">
                  <div className="flex items-center justify-between border-b border-[#304149] pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#54D8CF] block">AI DIAGNOSTIC REPORT</span>
                      <h3 className="font-bold text-xl text-[#F4F7F8]">
                        {activeAnalysis.exercise_name || exerciseName || 'Exercise Issue'}
                      </h3>
                    </div>
                    {getSeverityBadge(activeAnalysis.severity || severity)}
                  </div>

                  <div className="bg-[#172127] border border-[#304149] p-3 rounded-xl text-xs text-[#ACBAC2]">
                    <span className="text-[#ACBAC2] font-bold uppercase text-[10px] block mb-1">Logged Sensation</span>
                    "{feelingText}" ({timingText})
                  </div>

                  {/* Doctor Section */}
                  <div className="rounded-xl border border-[#FF897A]/40 bg-[#FF897A]/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#FF897A] text-sm">
                      <span className="text-base">🩺</span> DOCTOR ANALYSIS &amp; MEDICAL CARE
                    </div>
                    <div className="text-xs text-[#F4F7F8] leading-relaxed">
                      <strong className="text-[#F4F7F8] block mb-1">Probable Cause:</strong>
                      {rec.probable_cause}
                    </div>
                    <div className="text-xs text-[#FF897A] leading-relaxed pt-2 border-t border-[#FF897A]/20">
                      <strong className="block mb-1">Immediate First Aid &amp; Safety:</strong>
                      {rec.doctor_advice}
                    </div>
                  </div>

                  {/* Trainer Section */}
                  <div className="rounded-xl border border-[#C7F36B]/40 bg-[#C7F36B]/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#C7F36B] text-sm">
                      <span className="text-base">🏋️‍♂️</span> TRAINER BIOMECHANICS &amp; FORM CORRECTION
                    </div>
                    <div className="text-xs text-[#F4F7F8] leading-relaxed">
                      {rec.trainer_advice}
                    </div>
                  </div>

                  {/* Substitutions */}
                  {rec.safe_substitutions?.length > 0 && (
                    <div className="rounded-xl border border-[#54D8CF]/40 bg-[#54D8CF]/10 p-4">
                      <div className="flex items-center gap-2 font-bold text-[#54D8CF] text-sm mb-2">
                        <span className="text-base">🛡️</span> RECOMMENDED SAFE SUBSTITUTIONS
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.safe_substitutions.map((sub, i) => (
                          <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#10181D] border border-[#54D8CF]/30 text-[#54D8CF]">
                            ✓ {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {onPlanGenerated && (
                    <button
                      onClick={onPlanGenerated}
                      className="btn-lime w-full text-xs py-3 mt-2"
                    >
                      GENERATE ADAPTED WORKOUT PLAN NOW →
                    </button>
                  )}
                </div>
              )
            })() : (
              <div className="bg-[#10181D] border border-[#304149] rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-14 h-14 rounded-full bg-[#54D8CF]/10 border border-[#54D8CF]/30 flex items-center justify-center text-2xl mb-3 text-[#54D8CF]">
                  🩺
                </div>
                <h4 className="font-bold text-[#F4F7F8] text-base mb-1">Awaiting Discomfort Log</h4>
                <p className="text-xs text-[#ACBAC2] max-w-sm">
                  Select an exercise on the left, describe what you felt, and choose the pain severity. The AI Doctor &amp; Trainer engine will generate instant care cues and safe exercise substitutions.
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
        sub="All logged issues are stored permanently. The AI engine reads this timeline to keep workout plans safe."
      >
        {historyLogs.length === 0 ? (
          <div className="p-6 text-center text-[#ACBAC2] text-sm">
            No discomfort logs recorded yet. Log any pain or form issue above.
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {historyLogs.map((log) => (
              <div
                key={log.id}
                className="bg-[#10181D] border border-[#304149] rounded-2xl p-4 flex flex-col md:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-[#F4F7F8] text-sm">{log.exercise_name}</span>
                    {getSeverityBadge(log.severity)}
                    <span className="text-[11px] text-[#ACBAC2]">
                      {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#ACBAC2] italic">"{log.feeling_description}"</p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-start">
                  <button
                    onClick={() => setActiveAnalysis(log)}
                    className="btn-outline text-xs py-1.5 px-3"
                  >
                    View Report 🔍
                  </button>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30"
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
        <div className="fixed top-6 right-6 z-50 fade-up bg-[#172127] border border-[#C7F36B] text-[#F4F7F8] px-4 py-3 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  )
}
