import { useMemo, useState } from 'react'

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const MUSCLES = [
  { id:"chest", label:"Chest", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"back", label:"Back", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"shoulders", label:"Shoulders", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"biceps", label:"Biceps", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"triceps", label:"Triceps", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"legs", label:"Legs", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"glutes", label:"Glutes", emoji:"", cls:"bg-[#10181D] border border-[#304149] text-[#F4F7F8]" },
  { id:"abs", label:"Core/Abs", emoji:"", cls:"bg-[#C7F36B]/10 border border-[#C7F36B]/30 text-[#C7F36B]" },
  { id:"cardio", label:"Cardio", emoji:"", cls:"bg-[#54D8CF]/10 border border-[#54D8CF]/30 text-[#54D8CF]" },
]
const FULL = ["chest","back","shoulders","biceps","triceps","legs","abs"]
const MODES = [
  { id:"fullbody", icon:"🏋️", name:"Full Body", desc:"Same full-body session every training day. Best for 3-day weeks & beginners." },
  { id:"single", icon:"💪", name:"One Muscle / Day", desc:"Different body part each day (Bro Split). One muscle, max focus." },
  { id:"combo", icon:"⚡", name:"Smart Combos", desc:"Synergy pairs: Back+Biceps, Chest+Triceps, Legs+Glutes…" },
  { id:"custom", icon:"⚙️", name:"Fully Custom", desc:"Blank week — mix singles + combos freely." },
]
const SPLITS = [
  { id:"fullbody3", mode:"fullbody", label:"Full Body • 3 Days", icon:"🏋️", badge:"Beginner Friendly", badgeCls:"bg-[#54D8CF] text-[#0B1014]", days:3,
  desc:"Every session = whole body, 3×/week.", schedule:{ Monday:FULL, Tuesday:[], Wednesday:FULL, Thursday:[], Friday:FULL, Saturday:[], Sunday:[] } },
  { id:"fullbody4", mode:"fullbody", label:"Full Body • 4 Days", icon:"🏋️", badge:"Beginner +", badgeCls:"bg-[#54D8CF] text-[#0B1014]", days:4,
  desc:"Full-body 4×/week.", schedule:{ Monday:FULL, Tuesday:FULL, Wednesday:[], Thursday:FULL, Friday:FULL, Saturday:[], Sunday:[] } },
  { id:"bro5", mode:"single", label:"Bro Split • 5 Days", icon:"💪", badge:"One muscle / day", badgeCls:"bg-[#FF897A] text-[#0B1014]", days:5,
  desc:"Chest → Back → Shoulders → Legs → Arms.", schedule:{ Monday:["chest"], Tuesday:["back"], Wednesday:["shoulders"], Thursday:["legs"], Friday:["biceps","triceps"], Saturday:[], Sunday:[] } },
  { id:"bro6", mode:"single", label:"Bro Split • 6 Days", icon:"💪", badge:"Advanced", badgeCls:"bg-[#FF897A] text-[#0B1014]", days:6,
  desc:"One group per day + core/cardio finisher.", schedule:{ Monday:["chest"], Tuesday:["back"], Wednesday:["shoulders"], Thursday:["legs","glutes"], Friday:["biceps","triceps"], Saturday:["abs","cardio"], Sunday:[] } },
  { id:"ppl", mode:"combo", label:"Push / Pull / Legs", icon:"⚡", badge:"Most Popular", badgeCls:"bg-[#C7F36B] text-[#0B1014]", days:6,
  desc:"Push (Chest+Shoulders+Triceps) • Pull (Back+Biceps) • Legs ×2.", schedule:{ Monday:["chest","shoulders","triceps"], Tuesday:["back","biceps"], Wednesday:["legs","glutes"], Thursday:["chest","shoulders","triceps"], Friday:["back","biceps"], Saturday:["legs","glutes"], Sunday:[] } },
  { id:"upper_lower", mode:"combo", label:"Upper / Lower • 4 Days", icon:"⚡", badge:"Intermediate", badgeCls:"bg-[#54D8CF] text-[#0B1014]", days:4,
  desc:"Alternate upper & lower combos.", schedule:{ Monday:["chest","back","shoulders","biceps","triceps"], Tuesday:["legs","glutes","abs"], Wednesday:[], Thursday:["chest","back","shoulders","biceps","triceps"], Friday:["legs","glutes","abs"], Saturday:[], Sunday:[] } },
  { id:"arnold", mode:"combo", label:"Arnold Split", icon:"⚡", badge:"Classic Combos", badgeCls:"bg-[#FF897A] text-[#0B1014]", days:6,
  desc:"Chest+Back • Shoulders+Arms • Legs.", schedule:{ Monday:["chest","back"], Tuesday:["shoulders","biceps","triceps"], Wednesday:["legs","glutes","abs"], Thursday:["chest","back"], Friday:["shoulders","biceps","triceps"], Saturday:["legs","glutes","abs"], Sunday:[] } },
  { id:"custom", mode:"custom", label:"Build Your Own", icon:"⚙️", badge:"Fully Custom", badgeCls:"bg-[#304149] text-[#F4F7F8]", days:0, desc:"Blank week — you fill every day.", schedule:null },
]
const COMBOS = [
  { muscles:["back","biceps"], label:"Back + Biceps" },
  { muscles:["chest","triceps"], label:"Chest + Triceps" },
  { muscles:["chest","shoulders","triceps"], label:"Push Day" },
  { muscles:["back","biceps","abs"], label:"Pull Day" },
  { muscles:["legs","glutes"], label:"Legs + Glutes" },
  { muscles:["shoulders","abs"], label:"Shoulders + Core" },
  { muscles:["biceps","triceps"], label:"Arms Day" },
  { muscles:["chest","back"], label:"Chest + Back" },
  { muscles:["shoulders","biceps","triceps"], label:"Shoulders + Arms" },
  { muscles:["legs","abs","cardio"], label:"Legs + Core + Cardio" },
]

const muscleOf = (id) => MUSCLES.find(m => m.id === id)

function Tag({ id, onRemove }) {
  const m = muscleOf(id); if (!m) return null
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full m-0.5 ${m.cls}`}>
      {m.label}
      {onRemove && <button onClick={() => onRemove(id)} className="opacity-80 hover:opacity-100 font-bold ml-1">✕</button>}
    </span>
  )
}

export default function WorkoutSplitBuilder({ userId, onClose }) {
  const [mode, setMode] = useState("combo")
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [split, setSplit] = useState(null)
  const [schedule, setSchedule] = useState(Object.fromEntries(DAYS.map(d => [d, []])))
  const [step, setStep] = useState(1)
  const [openDay, setOpenDay] = useState(null)
  const [comboFor, setComboFor] = useState(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const visible = useMemo(() => {
    const base = mode === "custom" ? SPLITS : SPLITS.filter(s => s.mode === mode || s.id === "custom")
    return [...base.filter(s => s.id !== "custom").sort((a,b) => Math.abs(a.days-daysPerWeek)-Math.abs(b.days-daysPerWeek)), ...base.filter(s => s.id==="custom")]
  }, [mode, daysPerWeek])

  const workoutDays = DAYS.filter(d => schedule[d]?.length > 0).length
  const untrained = MUSCLES.filter(m => m.id !== "cardio" && !Object.values(schedule).flat().includes(m.id))

  const pick = (s) => {
    setSplit(s)
    setSchedule(s.schedule ? Object.fromEntries(DAYS.map(d => [d, [...(s.schedule[d]||[])]])) : Object.fromEntries(DAYS.map(d => [d, []])))
    setDone(false); setStep(2)
  }
  const toggle = (day, id) => setSchedule(p => ({ ...p, [day]: p[day].includes(id) ? p[day].filter(x => x!==id) : [...p[day], id] }))
  const applyCombo = (day) => {
    if (!comboFor) return
    setSchedule(p => ({ ...p, [day]: [...new Set([...p[day], ...comboFor.muscles])] }))
    setComboFor(null)
  }
  const save = async () => {
    setSaving(true)
    const plan = { splitType: split?.id||"custom", splitLabel: split?.label||"Custom", mode, daysPerWeek: workoutDays, schedule, savedAt: new Date().toISOString() }
    try { localStorage.setItem("fitnessWorkoutPlan", JSON.stringify(plan)) } catch {}
    try {
      const uid = userId || localStorage.getItem("fitnessUserId")
      if (uid) await fetch(`http://localhost:8000/workout_plans/?user_id=${uid}`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(plan) })
    } catch {}
    setSaving(false); setDone(true); setStep(3)
  }

  return (
    <div className="relative iron-card p-6 md:p-8 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] mb-1">Split Forge</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#F4F7F8] tracking-wide">WEEKLY SPLIT BUILDER</h2>
          <p className="text-sm text-[#ACBAC2]">Full-body • one muscle/day • smart combos (Back+Biceps…)</p>
        </div>
        {onClose && <button onClick={onClose} className="btn-outline text-xs py-2 px-4">✕ Close</button>}
      </div>

      <div className="flex items-center gap-2 mb-6 text-xs font-bold">
        {["Style","Customize","Save"].map((l,i) => {
          const n = i+1, cur = step===n, past = step>n
          return (
            <div key={l} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold ${
                past ? 'bg-[#54D8CF] text-[#0B1014]' : cur ? 'bg-[#C7F36B] text-[#0B1014]' : 'bg-[#10181D] text-[#ACBAC2] border border-[#304149]'
              }`}>
                {past ? "✓" : n}
              </span>
              <span className={step>=n ? "text-[#F4F7F8]" : "text-[#ACBAC2]"}>{l}</span>
              {i<2 && <span className="w-8 h-0.5 bg-[#304149] mx-1" />}
            </div>
          )
        })}
      </div>

      {step === 1 && (<>
        <p className="font-bold text-[#F4F7F8] tracking-wide mb-2">① HOW DO YOU WANT TO TRAIN?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`text-left p-4 rounded-2xl border transition ${
                mode===m.id
                  ? 'border-[#C7F36B] bg-[#C7F36B]/10'
                  : 'border-[#304149] bg-[#10181D] hover:border-[#ACBAC2]'
              }`}>
              <div className="text-2xl">{m.icon}</div>
              <div className="font-extrabold text-[#F4F7F8] mt-1">{m.name}</div>
              <div className="text-xs text-[#ACBAC2] mt-1 leading-relaxed">{m.desc}</div>
              {mode===m.id && <div className="text-xs font-extrabold text-[#C7F36B] mt-2">✓ Selected</div>}
            </button>
          ))}
        </div>

        <p className="font-bold text-[#F4F7F8] tracking-wide mb-2">② DAYS PER WEEK?</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {[3,4,5,6].map(n => (
            <button key={n} onClick={() => setDaysPerWeek(n)}
              className={`flex-1 min-w-[110px] px-4 py-3 rounded-xl font-extrabold border text-sm transition ${
                daysPerWeek===n
                  ? 'bg-[#C7F36B] text-[#0B1014] border-transparent'
                  : 'bg-[#10181D] text-[#F4F7F8] border-[#304149] hover:border-[#ACBAC2]'
              }`}>
              {n} days
            </button>
          ))}
        </div>

        <p className="font-bold text-[#F4F7F8] tracking-wide mb-2">③ CHOOSE A PRESET TO START WITH</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {visible.map(s => (
            <button 
              key={s.id} 
              type="button"
              onClick={() => pick(s)}
              aria-label={`Select ${s.label} preset`}
              className="p-5 rounded-2xl border border-[#304149] bg-[#10181D] hover:border-[#54D8CF] focus-visible:ring-2 focus-visible:ring-[#C7F36B] outline-none cursor-pointer transition flex flex-col justify-between text-left min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${s.badgeCls}`}>{s.badge}</span>
                  <span className="text-xs font-bold text-[#ACBAC2]">{s.days ? `${s.days} days/wk` : 'Custom'}</span>
                </div>
                <h4 className="text-lg font-bold text-[#F4F7F8]">{s.label}</h4>
                <p className="text-xs text-[#ACBAC2] mt-1">{s.desc}</p>
              </div>
              <span className="btn-lime text-xs py-2 px-4 mt-4 w-full text-center inline-block">SELECT &amp; EDIT THIS SPLIT →</span>
            </button>
          ))}
        </div>
      </>)}

      {step === 2 && (<>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setStep(1)} className="text-xs font-bold text-[#ACBAC2] hover:text-[#F4F7F8]">← Change style &amp; preset</button>
          <div className="text-xs text-[#54D8CF] font-bold">{workoutDays} training days set</div>
        </div>

        {untrained.length > 0 && (
          <div className="mb-4 p-3 rounded-xl border border-[#FF897A]/30 bg-[#FF897A]/10 text-xs text-[#FF897A]">
            ⚠️ Missing muscles in split: {untrained.map(m => m.label).join(', ')}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {DAYS.map(d => {
            const list = schedule[d] || []
            const isOpen = openDay === d
            return (
              <div key={d} className="p-4 rounded-xl border border-[#304149] bg-[#10181D]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#F4F7F8] w-24">{d}</span>
                    <div className="flex flex-wrap gap-1">
                      {list.length === 0 ? (
                        <span className="text-xs text-[#ACBAC2] font-semibold italic">Rest Day</span>
                      ) : (
                        list.map(id => <Tag key={id} id={id} onRemove={() => toggle(d, id)} />)
                      )}
                    </div>
                  </div>
                  <button onClick={() => setOpenDay(isOpen ? null : d)} className="btn-outline text-xs py-1.5 px-3">
                    {isOpen ? 'Close' : '+ Add Muscles'}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-3 border-t border-[#304149] space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {MUSCLES.map(m => (
                        <button key={m.id} onClick={() => toggle(d, m.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                            list.includes(m.id)
                              ? 'bg-[#C7F36B] text-[#0B1014] border-transparent'
                              : 'bg-[#172127] text-[#F4F7F8] border-[#304149]'
                          }`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {comboFor && (
                      <button onClick={() => applyCombo(d)} className="btn-lime text-xs py-1.5 px-3">
                        Apply Combo: {comboFor.label} →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="btn-lime flex-1 py-4 text-base">
            {saving ? 'SAVING SPLIT...' : 'SAVE & LOCK THIS SPLIT →'}
          </button>
        </div>
      </>)}

      {step === 3 && done && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#C7F36B] text-[#0B1014] font-black text-3xl flex items-center justify-center mx-auto">✓</div>
          <h3 className="text-2xl font-bold text-[#F4F7F8]">SPLIT LOCKED IN</h3>
          <p className="text-sm text-[#ACBAC2] max-w-md mx-auto">Your custom split is saved to your profile. AI generator will use this to plan workouts daily!</p>
          <button onClick={onClose} className="btn-lime py-3 px-8 text-sm mt-4">BACK TO DASHBOARD →</button>
        </div>
      )}
    </div>
  )
}
