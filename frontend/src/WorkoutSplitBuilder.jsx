import { useMemo, useState } from 'react'

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const MUSCLES = [
  { id:"chest", label:"Chest", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"back", label:"Back", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"shoulders", label:"Shoulders", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"biceps", label:"Biceps", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"triceps", label:"Triceps", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"legs", label:"Legs", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"glutes", label:"Glutes", emoji:"", cls:"bg-white/5 border border-white/10 text-zinc-300" },
  { id:"abs", label:"Core/Abs", emoji:"", cls:"bg-yellow-400/10 border border-yellow-400/20 text-yellow-300" },
  { id:"cardio", label:"Cardio", emoji:"", cls:"bg-emerald-400/10 border border-emerald-400/20 text-emerald-300" },
]
const FULL = ["chest","back","shoulders","biceps","triceps","legs","abs"]
const MODES = [
  { id:"fullbody", icon:"", name:"Full Body", desc:"Same full-body session every training day. Best for 3-day weeks & beginners." },
  { id:"single", icon:"", name:"One Muscle / Day", desc:"Different body part each day (Bro Split). One muscle, max focus." },
  { id:"combo", icon:"", name:"Smart Combos", desc:"Synergy pairs: Back+Biceps, Chest+Triceps, Legs+Glutes…" },
  { id:"custom", icon:"", name:"Fully Custom", desc:"Blank week — mix singles + combos freely." },
]
const SPLITS = [
  { id:"fullbody3", mode:"fullbody", label:"Full Body • 3 Days", icon:"", badge:"Beginner Friendly", badgeCls:"bg-emerald-500", days:3,
  desc:"Every session = whole body, 3×/week.", schedule:{ Monday:FULL, Tuesday:[], Wednesday:FULL, Thursday:[], Friday:FULL, Saturday:[], Sunday:[] } },
  { id:"fullbody4", mode:"fullbody", label:"Full Body • 4 Days", icon:"", badge:"Beginner +", badgeCls:"bg-emerald-500", days:4,
  desc:"Full-body 4×/week.", schedule:{ Monday:FULL, Tuesday:FULL, Wednesday:[], Thursday:FULL, Friday:FULL, Saturday:[], Sunday:[] } },
  { id:"bro5", mode:"single", label:"Bro Split • 5 Days", icon:"", badge:"One muscle / day", badgeCls:"bg-amber-500", days:5,
  desc:"Chest → Back → Shoulders → Legs → Arms.", schedule:{ Monday:["chest"], Tuesday:["back"], Wednesday:["shoulders"], Thursday:["legs"], Friday:["biceps","triceps"], Saturday:[], Sunday:[] } },
  { id:"bro6", mode:"single", label:"Bro Split • 6 Days", icon:"", badge:"Advanced", badgeCls:"bg-amber-500", days:6,
  desc:"One group per day + core/cardio finisher.", schedule:{ Monday:["chest"], Tuesday:["back"], Wednesday:["shoulders"], Thursday:["legs","glutes"], Friday:["biceps","triceps"], Saturday:["abs","cardio"], Sunday:[] } },
  { id:"ppl", mode:"combo", label:"Push / Pull / Legs", icon:"", badge:"Most Popular", badgeCls:"bg-yellow-400", days:6,
  desc:"Push (Chest+Shoulders+Triceps) • Pull (Back+Biceps) • Legs ×2.", schedule:{ Monday:["chest","shoulders","triceps"], Tuesday:["back","biceps"], Wednesday:["legs","glutes"], Thursday:["chest","shoulders","triceps"], Friday:["back","biceps"], Saturday:["legs","glutes"], Sunday:[] } },
  { id:"upper_lower", mode:"combo", label:"Upper / Lower • 4 Days", icon:"", badge:"Intermediate", badgeCls:"bg-violet-500", days:4,
  desc:"Alternate upper & lower combos.", schedule:{ Monday:["chest","back","shoulders","biceps","triceps"], Tuesday:["legs","glutes","abs"], Wednesday:[], Thursday:["chest","back","shoulders","biceps","triceps"], Friday:["legs","glutes","abs"], Saturday:[], Sunday:[] } },
  { id:"arnold", mode:"combo", label:"Arnold Split", icon:"", badge:"Classic Combos", badgeCls:"bg-orange-500", days:6,
  desc:"Chest+Back • Shoulders+Arms • Legs.", schedule:{ Monday:["chest","back"], Tuesday:["shoulders","biceps","triceps"], Wednesday:["legs","glutes","abs"], Thursday:["chest","back"], Friday:["shoulders","biceps","triceps"], Saturday:["legs","glutes","abs"], Sunday:[] } },
  { id:"custom", mode:"custom", label:"Build Your Own", icon:"", badge:"Fully Custom", badgeCls:"bg-zinc-500", days:0, desc:"Blank week — you fill every day.", schedule:null },
]
const COMBOS = [
  { muscles:["back","biceps"], label:"Back + Biceps", icon:"" },
  { muscles:["chest","triceps"], label:"Chest + Triceps", icon:"" },
  { muscles:["chest","shoulders","triceps"], label:"Push Day", icon:"" },
  { muscles:["back","biceps","abs"], label:"Pull Day", icon:"" },
  { muscles:["legs","glutes"], label:"Legs + Glutes", icon:"" },
  { muscles:["shoulders","abs"], label:"Shoulders + Core", icon:"" },
  { muscles:["biceps","triceps"], label:"Arms Day", icon:"" },
  { muscles:["chest","back"], label:"Chest + Back", icon:"" },
  { muscles:["shoulders","biceps","triceps"], label:"Shoulders + Arms", icon:"" },
  { muscles:["legs","abs","cardio"], label:"Legs + Core + Cardio", icon:"" },
]

const muscleOf = (id) => MUSCLES.find(m => m.id === id)

function Tag({ id, onRemove }) {
  const m = muscleOf(id); if (!m) return null
  return (<span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full m-0.5 ${m.cls}`}>
  {m.emoji} {m.label}
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

  return (<div className="relative glass rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
  <div>
  <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-400 mb-1">Split Forge</div>
  <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide"> WEEKLY SPLIT BUILDER</h2>
  <p className="text-sm text-zinc-400">Full-body • one muscle/day • smart combos (Back+Biceps…)</p>
  </div>
  {onClose && <button onClick={onClose} className="text-sm font-bold text-zinc-300 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-xl">✕ Close</button>}
  </div>
  <div className="flex items-center gap-2 mb-6 text-xs font-bold">
  {["Style","Customize","Save"].map((l,i) => {
  const n = i+1, cur = step===n, past = step>n
  return (<div key={l} className="flex items-center gap-2">
  <span className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-950 font-extrabold"
  style={past ? { background: '#4ade80' } : cur ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)' } : { background: 'rgba(255,255,255,.12)', color: '#a1a1aa' }}>{past?"✓":n}</span>
  <span className={step>=n?"text-zinc-100":"text-zinc-500"}>{l}</span>
  {i<2 && <span className="w-8 h-0.5 bg-white/10 mx-1" />}
  </div>
)
  })}
  </div>

  {step === 1 && (<>
  <p className="font-display font-bold text-white tracking-wide mb-2">① HOW DO YOU WANT TO TRAIN?</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
  {MODES.map(m => (<button key={m.id} onClick={() => setMode(m.id)}
  className="text-left p-4 rounded-2xl border-2 transition hover:-translate-y-0.5"
  style={mode===m.id
  ? { borderColor: '#facc15', background: 'rgba(250,204,21,.1)', boxShadow: '0 12px 32px rgba(250,204,21,.18)' }
  : { borderColor: 'rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}>
  <div className="text-2xl">{m.icon}</div>
  <div className="font-extrabold text-zinc-100 mt-1">{m.name}</div>
  <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{m.desc}</div>
  {mode===m.id && <div className="text-xs font-extrabold text-yellow-400 mt-2">✓ Selected</div>}
  </button>
))}
  </div>
  <p className="font-display font-bold text-white tracking-wide mb-2">② DAYS PER WEEK?</p>
  <div className="flex gap-2 flex-wrap mb-5">
  {[3,4,5,6].map(n => (<button key={n} onClick={() => setDaysPerWeek(n)}
  className="flex-1 min-w-[110px] px-4 py-3 rounded-xl font-extrabold border-2 text-sm"
  style={daysPerWeek===n
  ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)', color: '#09090b', borderColor: 'transparent' }
  : { background: 'rgba(255,255,255,.04)', color: '#e4e4e7', borderColor: 'rgba(255,255,255,.1)' }}>
  {n} days
  </button>
))}
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {visible.map(s => (<button key={s.id} onClick={() => pick(s)}
  className="text-left p-5 rounded-2xl border-2 transition hover:-translate-y-0.5"
  style={{ borderColor: 'rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)' }}
  onMouseEnter={e => e.currentTarget.style.borderColor = '#facc15'}
  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'}>
  <div className="flex items-center gap-2">
  <span className="text-2xl">{s.icon}</span>
  <span className="font-extrabold text-zinc-100">{s.label}</span>
  </div>
  <span className={`inline-block text-zinc-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-2 uppercase tracking-wider ${s.badgeCls}`}>{s.badge}</span>
  <p className="text-xs text-zinc-400 mt-2">{s.desc}</p>
  {s.schedule && (<div className="flex gap-1 mt-2.5">
  {DAYS.map(d => <span key={d} title={`${d}: ${(s.schedule[d]||[]).join(", ")||"Rest"}`}
  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
  style={s.schedule[d]?.length ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)', color: '#09090b' } : { background: 'rgba(255,255,255,.08)', color: '#71717a' }}>{d[0]}</span>)}
  </div>
)}
  <div className="text-yellow-400 text-sm font-bold mt-2.5">Select →</div>
  </button>
))}
  </div>
  </>
)}

  {step === 2 && split && (<>
  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
  <button onClick={() => setStep(1)} className="font-bold text-yellow-400 hover:underline text-sm">← Styles</button>
  <div className="font-extrabold text-zinc-100">{split.icon} {split.label}</div>
  <div className="text-sm text-zinc-200 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5"><strong className="text-yellow-300">{workoutDays}</strong> / 7 workout days</div>
  </div>

  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5"> Single muscle → pick a day</p>
  <div className="flex flex-wrap gap-1.5 mb-3">
  {MUSCLES.map(m => (<button key={m.id} onClick={() => setComboFor({ muscles:[m.id], label:m.label })}
  className="text-xs font-bold px-3 py-1.5 rounded-full border transition"
  style={comboFor?.label===m.label
  ? { background: '#4ade80', color: '#09090b', borderColor: 'transparent' }
  : { background: 'rgba(74,222,128,.08)', color: '#bbf7d0', borderColor: 'rgba(74,222,128,.3)' }}>
  {m.emoji} {m.label}
  </button>
))}
  </div>
  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5"> Smart combos → pick a day</p>
  <div className="flex flex-wrap gap-1.5 mb-3">
  {COMBOS.map(c => (<button key={c.label} onClick={() => setComboFor(c)}
  className="text-xs font-bold px-3 py-1.5 rounded-full border transition"
  style={comboFor?.label===c.label
  ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)', color: '#09090b', borderColor: 'transparent' }
  : { background: 'rgba(250,204,21,.07)', color: '#fde68a', borderColor: 'rgba(250,204,21,.3)' }}>
  {c.icon} {c.label}
  </button>
))}
  </div>

  {comboFor && (<div className="rounded-2xl p-3.5 mb-3 flex items-center justify-between flex-wrap gap-2 border border-yellow-400/40"
  style={{ background: 'linear-gradient(135deg, rgba(250,204,21,.2), rgba(245,158,11,.12))' }}>
  <span className="text-sm font-bold text-yellow-100">Apply <u>{comboFor.label}</u> to which day?</span>
  <div className="flex gap-1.5 flex-wrap">
  {DAYS.map(d => <button key={d} onClick={() => applyCombo(d)} className="bg-yellow-400 text-zinc-950 text-xs font-extrabold px-3 py-1.5 rounded-full hover:bg-yellow-300">{d.slice(0,3)}</button>)}
  <button onClick={() => setComboFor(null)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/50 text-zinc-300 border border-white/10">Cancel</button>
  </div>
  </div>
)}

  {workoutDays>0 && untrained.length>=4 && (<div className="border border-yellow-400/30 bg-yellow-400/10 text-yellow-100 text-xs rounded-xl p-3 mb-3">
  Untrained this week: <strong>{untrained.map(m=>m.label).join(", ")}</strong> — add them or use a Full-Body split.
  </div>
)}

  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
  {DAYS.map(day => {
  const ms = schedule[day]; const rest = ms.length===0; const open = openDay===day
  return (<div key={day} className="rounded-2xl border-2 p-3.5"
  style={rest ? { background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.08)' } : { background: 'rgba(250,204,21,.06)', borderColor: 'rgba(250,204,21,.45)' }}>
  <div className="flex items-center justify-between mb-1.5">
  <div>
  <div className="font-bold text-zinc-100 text-sm">{day}</div>
  <div className="text-[11px] text-zinc-500">{rest?" Rest Day":`${ms.length} group${ms.length>1?"s":""}`}</div>
  </div>
  <div className="flex gap-1.5">
  {!rest && <button onClick={() => setSchedule(p=>({...p,[day]:[]}))} title="Rest day" className="text-[11px] font-bold text-red-400 border border-red-400/30 rounded-lg px-2 py-1 hover:bg-red-400/10">✕</button>}
  <button onClick={() => setOpenDay(open?null:day)}
  className="text-[11px] font-extrabold rounded-lg px-2.5 py-1"
  style={open ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)', color: '#09090b' } : { background: 'rgba(255,255,255,.08)', color: '#e4e4e7' }}>{open?"Done ✓":"＋ Edit"}</button>
  </div>
  </div>
  <div className="min-h-[28px]">
  {rest ? <span className="text-xs text-zinc-500"> Rest — add a muscle or combo</span>
  : ms.map(id => <Tag key={id} id={id} onRemove={(mid) => toggle(day, mid)} />)}
  </div>
  {open && (<div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
  {MUSCLES.map(m => (<button key={m.id} onClick={() => toggle(day, m.id)}
  className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-white ${ms.includes(m.id)?m.cls+" ring-2 ring-yellow-300":"bg-zinc-700"}`}>
  {m.emoji} {m.label}
  </button>
))}
  </div>
)}
  </div>
)
  })}
  </div>

  <div className="flex gap-2">
  <button onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 font-bold py-3.5 rounded-2xl">← Start Over</button>
  <button onClick={() => setStep(3)} disabled={workoutDays===0}
  className="gold-btn flex-[2] font-extrabold py-3.5 rounded-2xl">Review Plan →</button>
  </div>
  </>
)}

  {step === 3 && (<>
  <button onClick={() => setStep(2)} className="font-bold text-yellow-400 hover:underline mb-3 text-sm">← Back to editing</button>
  {done ? (<div className="text-center py-14">
  <div className="text-6xl mb-3"></div>
  <h3 className="font-display text-3xl font-bold text-white">PLAN SAVED!</h3>
  <p className="text-zinc-400 mt-1 mb-5">Your <strong className="text-yellow-300">{split?.label}</strong> ({workoutDays} days/week) is locked in. Crush it! </p>
  <button onClick={() => { setStep(1); setSplit(null); setDone(false); setSchedule(Object.fromEntries(DAYS.map(d=>[d,[]]))) }}
  className="bg-white/5 border border-white/10 text-zinc-200 font-bold px-6 py-3 rounded-2xl hover:bg-white/10">Create New Plan</button>
  </div>
) : (<>
  <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
  {[{v:workoutDays,l:"Workout Days"},{v:7-workoutDays,l:"Rest Days"},{v:split?.icon,l:split?.label}].map((s,i) => (<div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-3">
  <div className="font-display text-2xl font-bold text-white">{s.v}</div>
  <div className="text-xs text-zinc-500">{s.l}</div>
  </div>
))}
  </div>
  <div className="space-y-1.5 mb-4">
  {DAYS.map(day => {
  const ms = schedule[day]; const rest = ms.length===0
  return (<div key={day} className="flex items-center gap-3 rounded-2xl border p-2.5"
  style={rest ? { background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.07)' } : { background: 'rgba(250,204,21,.07)', borderColor: 'rgba(250,204,21,.3)' }}>
  <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-extrabold"
  style={rest ? { background: 'rgba(255,255,255,.08)', color: '#71717a' } : { background: 'linear-gradient(135deg,#fde047,#f59e0b)', color: '#09090b' }}>{day.slice(0,3)}</span>
  <div className="flex-1 flex flex-wrap">{rest?<span className="text-xs text-zinc-500">Rest Day </span>:ms.map(id=><Tag key={id} id={id}/>)}</div>
  </div>
)
  })}
  </div>
  <button onClick={save} disabled={saving} className="gold-btn w-full font-extrabold text-lg py-4 rounded-2xl">
  {saving?"Saving…":" SAVE MY WORKOUT PLAN"}
  </button>
  </>
)}
  </>
)}
  </div>
)
}
