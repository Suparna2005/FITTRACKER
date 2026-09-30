import { useMemo, useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MUSCLE_GROUPS = [
  { id: "chest",  label: "Chest",  emoji: "", gradient: ["#ef4444", "#f97316"] },
  { id: "back",  label: "Back",  emoji: "", gradient: ["#3b82f6", "#06b6d4"] },
  { id: "shoulders", label: "Shoulders",  emoji: "", gradient: ["#a855f7", "#ec4899"] },
  { id: "biceps",  label: "Biceps",  emoji: "", gradient: ["#22c55e", "#10b981"] },
  { id: "triceps",  label: "Triceps",  emoji: "", gradient: ["#eab308", "#f59e0b"] },
  { id: "legs",  label: "Legs",  emoji: "", gradient: ["#6366f1", "#8b5cf6"] },
  { id: "glutes",  label: "Glutes",  emoji: "", gradient: ["#f43f5e", "#ec4899"] },
  { id: "abs",  label: "Core / Abs", emoji: "", gradient: ["#14b8a6", "#22c55e"] },
  { id: "cardio",  label: "Cardio",  emoji: "", gradient: ["#f97316", "#ef4444"] },
];

const MODES = [
  { id: "fullbody", icon: "", name: "Full Body", desc: "Same full-body workout every training day. Best for beginners & 3-day weeks." },
  { id: "single", icon: "", name: "One Muscle / Day", desc: "A different body part each day (Bro Split). Max focus, one muscle at a time." },
  { id: "combo", icon: "", name: "Smart Combos", desc: "Pair synergies: Back+Biceps, Chest+Triceps, Legs+Glutes. Most popular." },
  { id: "custom", icon: "", name: "Fully Custom", desc: "Blank week. Mix singles + combos freely for every day." },
];

const FULL = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "abs"];

const POPULAR_SPLITS = [
  {
  id: "fullbody3", mode: "fullbody", label: "Full Body • 3 Days", icon: "",
  description: "Train every major muscle each session, 3× per week. Full recovery between days.",
  badge: "Beginner Friendly", badgeColor: "#16a34a", days: 3,
  schedule: {
  Monday: [...FULL], Tuesday: [], Wednesday: [...FULL], Thursday: [],
  Friday: [...FULL], Saturday: [], Sunday: [],
  },
  },
  {
  id: "fullbody4", mode: "fullbody", label: "Full Body • 4 Days", icon: "",
  description: "Full-body engine 4× per week with mid-week rest days.",
  badge: "Beginner +", badgeColor: "#16a34a", days: 4,
  schedule: {
  Monday: [...FULL], Tuesday: [...FULL], Wednesday: [], Thursday: [...FULL],
  Friday: [...FULL], Saturday: [], Sunday: [],
  },
  },
  {
  id: "bro5", mode: "single", label: "Bro Split • 5 Days", icon: "",
  description: "Classic single-part days: Chest → Back → Shoulders → Legs → Arms.",
  badge: "One muscle / day", badgeColor: "#d97706", days: 5,
  schedule: {
  Monday: ["chest"], Tuesday: ["back"], Wednesday: ["shoulders"],
  Thursday: ["legs"], Friday: ["biceps", "triceps"], Saturday: [], Sunday: [],
  },
  },
  {
  id: "bro6", mode: "single", label: "Bro Split • 6 Days", icon: "",
  description: "Dedicate each day to one group + core/cardio finisher day.",
  badge: "Advanced", badgeColor: "#d97706", days: 6,
  schedule: {
  Monday: ["chest"], Tuesday: ["back"], Wednesday: ["shoulders"],
  Thursday: ["legs", "glutes"], Friday: ["biceps", "triceps"],
  Saturday: ["abs", "cardio"], Sunday: [],
  },
  },
  {
  id: "ppl", mode: "combo", label: "Push / Pull / Legs", icon: "",
  description: "Push (Chest+Shoulders+Triceps) • Pull (Back+Biceps) • Legs. Repeat 2×.",
  badge: "Most Popular", badgeColor: "#2563eb", days: 6,
  schedule: {
  Monday: ["chest", "shoulders", "triceps"], Tuesday: ["back", "biceps"],
  Wednesday: ["legs", "glutes"], Thursday: ["chest", "shoulders", "triceps"],
  Friday: ["back", "biceps"], Saturday: ["legs", "glutes"], Sunday: [],
  },
  },
  {
  id: "upper_lower", mode: "combo", label: "Upper / Lower • 4 Days", icon: "",
  description: "Alternate upper-body combos and lower-body combos, 4 days a week.",
  badge: "Intermediate", badgeColor: "#7c3aed", days: 4,
  schedule: {
  Monday: ["chest", "back", "shoulders", "biceps", "triceps"],
  Tuesday: ["legs", "glutes", "abs"], Wednesday: [],
  Thursday: ["chest", "back", "shoulders", "biceps", "triceps"],
  Friday: ["legs", "glutes", "abs"], Saturday: [], Sunday: [],
  },
  },
  {
  id: "arnold", mode: "combo", label: "Arnold Split", icon: "",
  description: "Chest+Back • Shoulders+Arms • Legs. Old-school mass builder.",
  badge: "Classic Combos", badgeColor: "#db2777", days: 6,
  schedule: {
  Monday: ["chest", "back"], Tuesday: ["shoulders", "biceps", "triceps"],
  Wednesday: ["legs", "glutes", "abs"], Thursday: ["chest", "back"],
  Friday: ["shoulders", "biceps", "triceps"], Saturday: ["legs", "glutes", "abs"], Sunday: [],
  },
  },
  { id: "custom", mode: "custom", label: "Build Your Own", icon: "",
  description: "Blank week. Add single muscles or combos day-by-day yourself.",
  badge: "Fully Custom", badgeColor: "#db2777", days: 0, schedule: null },
];

const POPULAR_COMBOS = [
  { muscles: ["back", "biceps"], label: "Back + Biceps", icon: "" },
  { muscles: ["chest", "triceps"], label: "Chest + Triceps", icon: "" },
  { muscles: ["chest", "shoulders", "triceps"], label: "Push Day", icon: "" },
  { muscles: ["back", "biceps", "abs"], label: "Pull Day", icon: "" },
  { muscles: ["legs", "glutes"], label: "Legs + Glutes", icon: "" },
  { muscles: ["shoulders", "abs"], label: "Shoulders + Core", icon: "" },
  { muscles: ["biceps", "triceps"], label: "Arms Day", icon: "" },
  { muscles: ["chest", "back"], label: "Chest + Back", icon: "" },
  { muscles: ["shoulders", "biceps", "triceps"], label: "Shoulders + Arms", icon: "" },
  { muscles: ["legs", "abs", "cardio"], label: "Legs + Core + Cardio", icon: "" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMuscle(id) {
  return MUSCLE_GROUPS.find((m) => m.id === id);
}

function MuscleTag({ id, removable, onRemove }) {
  const m = getMuscle(id);
  if (!m) return null;
  return (<span style={{
  display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
  borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#fff",
  background: `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})`,
  margin: "2px", whiteSpace: "nowrap",
  }}>
  {m.emoji} {m.label}
  {removable && (<button onClick={(e) => { e.stopPropagation; onRemove(id); }} style={{
  background: "none", border: "none", color: "#fff", cursor: "pointer",
  fontSize: 11, marginLeft: 2, padding: 0, opacity: 0.8,
  }}>✕</button>
)}
  </span>
);
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({ day, muscles, onToggleMuscle, onClear }) {
  const [open, setOpen] = useState(false);
  const isRest = !muscles || muscles.length === 0;

  return (<div style={{
  background: isRest ? "#1e1b4b" : "#1e293b",
  border: isRest ? "2px solid #312e81" : "2px solid #4f46e5",
  borderRadius: 16, padding: 16, transition: "border-color 0.2s",
  }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
  <div>
  <p style={{ margin: 0, fontWeight: 700, color: "#e0e7ff", fontSize: 14 }}>{day}</p>
  <span style={{ fontSize: 11, color: isRest ? "#6366f1" : "#818cf8" }}>
  {isRest ? " Rest Day" : `${muscles.length} muscle group${muscles.length !== 1 ? "s" : ""}`}
  </span>
  </div>
  <div style={{ display: "flex", gap: 6 }}>
  {!isRest && (<button onClick={ => onClear(day)} title="Make rest day" style={{
  background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 11,
  padding: "4px 8px", cursor: "pointer",
  }}>✕</button>
)}
  <button onClick={ => setOpen(!open)} style={{
  background: open ? "#4f46e5" : "rgba(255,255,255,0.1)", border: "none",
  borderRadius: 8, color: "#fff", fontSize: 11, padding: "4px 10px",
  cursor: "pointer", fontWeight: 600,
  }}>
  {open ? "Done ✓" : "＋ Edit"}
  </button>
  </div>
  </div>

  <div style={{ display: "flex", flexWrap: "wrap", minHeight: 28 }}>
  {isRest
  ? <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}> Rest — add a muscle or combo</span>
  : muscles.map((id) => (<MuscleTag key={id} id={id} removable onRemove={(mid) => onToggleMuscle(day, mid)} />
))}
  </div>

  {open && (<div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: "0 0 6px" }}>Tap to add / remove:</p>
  <div style={{ display: "flex", flexWrap: "wrap" }}>
  {MUSCLE_GROUPS.map((m) => {
  const active = (muscles || []).includes(m.id);
  return (<button key={m.id} onClick={ => onToggleMuscle(day, m.id)} style={{
  margin: 2, padding: "5px 11px", borderRadius: 999,
  border: active ? "none" : "1px solid rgba(255,255,255,0.2)",
  background: active
  ? `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})`
  : "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
  transform: active ? "scale(1.05)" : "scale(1)",
  }}>
  {m.emoji} {m.label}
  </button>
);
  })}
  </div>
  </div>
)}
  </div>
);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutPlanSelector({ onSave }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("combo");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [weekSchedule, setWeekSchedule] = useState(Object.fromEntries(DAYS.map((d) => [d, []]))
);
  const [saved, setSaved] = useState(false);
  const [comboDropdown, setComboDropdown] = useState(null);
  const [singleDropdown, setSingleDropdown] = useState(null);

  const visibleSplits = useMemo(=> {
  const list = POPULAR_SPLITS.filter((s) => (mode === "custom" ? s.mode !== "custom" || true : s.mode === mode || s.id === "custom"));
  const filtered = mode === "custom" ? POPULAR_SPLITS : list;
  const withCustomLast = [
  ...filtered.filter((s) => s.id !== "custom").sort((a, b) => Math.abs(a.days - daysPerWeek) - Math.abs(b.days - daysPerWeek)),
  ...filtered.filter((s) => s.id === "custom"),
  ];
  return withCustomLast;
  }, [mode, daysPerWeek]);

  function handleSelectSplit(split) {
  setSelectedSplit(split);
  if (split.schedule == null) {
  setWeekSchedule(Object.fromEntries(DAYS.map((d) => [d, []])));
  } else {
  setWeekSchedule(Object.fromEntries(DAYS.map((d) => [d, [...(split.schedule[d] ?? [])]])));
  }
  setSaved(false);
  setStep(2);
  }

  function handleToggleMuscle(day, muscleId) {
  setWeekSchedule((prev) => {
  const cur = prev[day] || [];
  return { ...prev, [day]: cur.includes(muscleId) ? cur.filter((x) => x !== muscleId) : [...cur, muscleId] };
  });
  }

  function handleApplyMuscles(muscles, day) {
  setWeekSchedule((prev) => ({
  ...prev, [day]: [...new Set([...(prev[day] || []), ...muscles])],
  }));
  setComboDropdown(null);
  setSingleDropdown(null);
  }

  function handleClear(day) {
  setWeekSchedule((prev) => ({ ...prev, [day]: [] }));
  }

  async function handleSave {
  const plan = {
  splitType: selectedSplit?.id, splitLabel: selectedSplit?.label,
  mode, daysPerWeek: totalWorkoutDays, schedule: weekSchedule,
  createdAt: new Date.toISOString,
  };
  try { localStorage.setItem("fitnessWorkoutPlan", JSON.stringify(plan)); } catch {}
  const uid = (=> { try { return localStorage.getItem("fitnessUserId"); } catch { return null; } });
  if (uid) {
  try {
  await fetch(`http://localhost:8000/workout_plans/?user_id=${uid}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan),
  });
  } catch {}
  }
  setSaved(true);
  if (onSave) onSave(plan);
  }

  function handleReset {
  setStep(1); setSelectedSplit(null); setSaved(false);
  setWeekSchedule(Object.fromEntries(DAYS.map((d) => [d, []])));
  }

  const totalWorkoutDays = Object.values(weekSchedule).filter((m) => m && m.length > 0).length;
  const untrained = MUSCLE_GROUPS.filter((m) => m.id !== "cardio" && !Object.values(weekSchedule).flat.includes(m.id));

  return (<div style={{
  minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  padding: "32px 16px 64px", fontFamily: "'Segoe UI', system-ui, sans-serif",
  }}>
  <div style={{ maxWidth: 1020, margin: "0 auto" }}>

  <div style={{ textAlign: "center", marginBottom: 24 }}>
  <div style={{
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "rgba(255,255,255,0.08)", padding: "6px 18px", borderRadius: 999,
  color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 16,
  }}> Fitness Tracker</div>
  <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900, color: "#fff" }}>
  Build Your{" "}
  <span style={{ background: "linear-gradient(90deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
  Weekly Plan
  </span>
  </h1>
  <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 8, fontSize: 15 }}>
  Full-body, single-muscle days, or smart combos — your week, your rules
  </p>
  </div>

  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
  {[{ n: 1, label: "Training Style" }, { n: 2, label: "Customize" }, { n: 3, label: "Save Plan" }].map((s, i) => (<div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <div style={{
  width: 32, height: 32, borderRadius: "50%", display: "flex",
  alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14,
  background: step > s.n ? "#22c55e" : step === s.n ? "#4f46e5" : "rgba(255,255,255,0.1)",
  color: "#fff", boxShadow: step === s.n ? "0 0 0 4px rgba(99,102,241,0.3)" : "none",
  }}>{step > s.n ? "✓" : s.n}</div>
  <span style={{ color: step >= s.n ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
  {i < 2 && <div style={{ width: 32, height: 2, background: step > s.n ? "#22c55e" : "rgba(255,255,255,0.15)" }} />}
  </div>
))}
  </div>

  {step === 1 && (<div>
  <div style={panelStyle}>
  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>① How do you want to train?</div>
  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
  Pick a training style — you can still edit every day afterwards.
  </div>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
  {MODES.map((m) => (<button key={m.id} onClick={ => setMode(m.id)} style={{
  background: mode === m.id ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.06)",
  border: `2px solid ${mode === m.id ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
  borderRadius: 18, padding: 18, cursor: "pointer", textAlign: "left", color: "#fff",
  boxShadow: mode === m.id ? "0 12px 32px rgba(99,102,241,0.3)" : "none",
  }}>
  <div style={{ fontSize: 30, marginBottom: 6 }}>{m.icon}</div>
  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{m.name}</div>
  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{m.desc}</div>
  {mode === m.id && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: "#a5b4fc" }}>✓ Selected</div>}
  </button>
))}
  </div>
  </div>

  <div style={panelStyle}>
  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>② How many days per week?</div>
  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>Rest days are auto-balanced.</div>
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  {[{ n: 3, sub: "Beginner • full-body" }, { n: 4, sub: "Balanced" }, { n: 5, sub: "Bro split sweet spot" }, { n: 6, sub: "PPL / advanced" }].map((o) => (<button key={o.n} onClick={ => setDaysPerWeek(o.n)} style={{
  flex: 1, minWidth: 110, background: daysPerWeek === o.n ? "#4f46e5" : "rgba(255,255,255,0.06)",
  border: `2px solid ${daysPerWeek === o.n ? "#818cf8" : "rgba(255,255,255,0.12)"}`,
  color: "#fff", borderRadius: 14, padding: 12, cursor: "pointer", fontWeight: 800, fontSize: 14,
  }}>{o.n} days<span style={{ display: "block", fontWeight: 500, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{o.sub}</span></button>
))}
  </div>
  </div>

  <h2 style={{ color: "#c7d2fe", fontWeight: 800, margin: "6px 0 14px", fontSize: 16 }}>
  {mode === "fullbody" ? "Full-body plans (every session = whole body)"
  : mode === "single" ? "One-muscle-a-day plans (different part each day)"
  : mode === "combo" ? "Combo plans (Back+Biceps, Chest+Triceps, …)"
  : "All templates — or start blank"}
  </h2>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
  {visibleSplits.map((split) => (<SplitCard key={split.id} split={split} onSelect={handleSelectSplit} />
))}
  </div>
  </div>
)}

  {step === 2 && selectedSplit && (<div>
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
  <button onClick={ => setStep(1)} style={backBtnStyle}>←</button>
  <div style={{ flex: 1, minWidth: 200 }}>
  <h2 style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 20 }}>{selectedSplit.icon} {selectedSplit.label}</h2>
  <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
  Tap <strong>+ Edit</strong> to toggle muscles • <strong>✕</strong> for rest day • quick buttons below
  </p>
  </div>
  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "6px 14px", color: "#fff", fontSize: 13 }}>
  <strong>{totalWorkoutDays}</strong>
  <span style={{ color: "rgba(255,255,255,0.5)" }}> / 7 workout days</span>
  </div>
  </div>

  <div style={{ marginBottom: 14 }}>
  <p style={combosLabelStyle}> Single muscle — tap, then pick a day:</p>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
  {MUSCLE_GROUPS.map((m) => (<div key={m.id} style={{ position: "relative" }}>
  <button onClick={ => setSingleDropdown(singleDropdown === m.id ? null : m.id)}
  style={{ ...comboBtnStyle, background: singleDropdown === m.id ? "#16a34a" : "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)" }}>
  {m.emoji} {m.label} <span style={{ opacity: 0.5 }}>▾</span>
  </button>
  {singleDropdown === m.id && (<DayPicker days={DAYS} schedule={weekSchedule} onPick={(d) => handleApplyMuscles([m.id], d)} />
)}
  </div>
))}
  </div>
  </div>

  <div style={{ marginBottom: 14 }}>
  <p style={combosLabelStyle}> Smart combos — e.g. Back + Biceps, Chest + Triceps:</p>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
  {POPULAR_COMBOS.map((combo) => (<div key={combo.label} style={{ position: "relative" }}>
  <button onClick={ => setComboDropdown(comboDropdown === combo.label ? null : combo.label)}
  style={{ ...comboBtnStyle, background: comboDropdown === combo.label ? "#4f46e5" : "rgba(255,255,255,0.08)" }}>
  {combo.icon} {combo.label} <span style={{ opacity: 0.5 }}>▾</span>
  </button>
  {comboDropdown === combo.label && (<DayPicker days={DAYS} schedule={weekSchedule} onPick={(d) => handleApplyMuscles(combo.muscles, d)} />
)}
  </div>
))}
  </div>
  </div>

  {totalWorkoutDays > 0 && untrained.length >= 4 && (<div style={warnStyle}> Untrained this week: <strong>{untrained.map((m) => m.label).join(", ")}</strong>. Consider adding them or switching to a Full-Body split.</div>
)}

  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
  {DAYS.map((day) => (<DayCard key={day} day={day} muscles={weekSchedule[day]} onToggleMuscle={handleToggleMuscle} onClear={handleClear} />
))}
  </div>

  <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
  <button onClick={handleReset} style={secondaryBtnStyle}>← Start Over</button>
  <button onClick={ => setStep(3)} disabled={totalWorkoutDays === 0}
  style={{ ...primaryBtnStyle, flex: 2, opacity: totalWorkoutDays === 0 ? 0.4 : 1, cursor: totalWorkoutDays === 0 ? "not-allowed" : "pointer" }}>
  Review Plan →
  </button>
  </div>
  </div>
)}

  {step === 3 && (<div>
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
  <button onClick={ => setStep(2)} style={backBtnStyle}>←</button>
  <h2 style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 20 }}>Your Weekly Plan</h2>
  </div>

  {saved ? (<div style={{ textAlign: "center", padding: "60px 0" }}>
  <div style={{ fontSize: 64, marginBottom: 12 }}></div>
  <h3 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Plan Saved!</h3>
  <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
  Your <strong>{selectedSplit?.label}</strong> plan ({totalWorkoutDays} days/week) is ready. Time to crush it! 
  </p>
  <button onClick={handleReset} style={secondaryBtnStyle}>Create New Plan</button>
  </div>
) : (<>
  <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
  {[
  { value: totalWorkoutDays, label: "Workout Days" },
  { value: 7 - totalWorkoutDays, label: "Rest Days" },
  { value: selectedSplit?.icon, label: selectedSplit?.label },
  ].map((stat, i) => (<div key={i} style={{
  flex: 1, minWidth: 120, background: "rgba(255,255,255,0.07)",
  borderRadius: 16, padding: "14px 12px", textAlign: "center",
  border: "1px solid rgba(255,255,255,0.1)",
  }}>
  <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#fff" }}>{stat.value}</p>
  <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{stat.label}</p>
  </div>
))}
  </div>

  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
  {DAYS.map((day) => {
  const muscles = weekSchedule[day];
  const isRest = !muscles || muscles.length === 0;
  return (<div key={day} style={{
  display: "flex", alignItems: "center", gap: 12,
  background: isRest ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.1)",
  border: `1px solid ${isRest ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.3)"}`,
  borderRadius: 14, padding: "10px 14px",
  }}>
  <div style={{
  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 800, fontSize: 13,
  background: isRest ? "rgba(255,255,255,0.07)" : "#4f46e5",
  color: isRest ? "rgba(255,255,255,0.3)" : "#fff",
  }}>{day.slice(0, 3)}</div>
  <div style={{ flex: 1, display: "flex", flexWrap: "wrap" }}>
  {isRest
  ? <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Rest Day </span>
  : muscles.map((id) => <MuscleTag key={id} id={id} />)}
  </div>
  </div>
);
  })}
  </div>

  <button onClick={handleSave} style={{
  ...primaryBtnStyle, width: "100%",
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  boxShadow: "0 8px 24px rgba(34,197,94,0.3)", fontSize: 18, padding: "18px",
  }}> Save My Workout Plan</button>
  </>
)}
  </div>
)}
  </div>
  </div>
);
}

function DayPicker({ days, schedule, onPick }) {
  return (<div style={{
  position: "absolute", top: "110%", left: 0, zIndex: 50, background: "#1e1b4b",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, minWidth: 160,
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden",
  }}>
  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, padding: "8px 12px 4px", margin: 0 }}>Add to which day?</p>
  {days.map((d) => (<button key={d} onClick={ => onPick(d)} style={{
  display: "block", width: "100%", textAlign: "left", background: "none",
  border: "none", color: "#e0e7ff", fontSize: 13, padding: "7px 14px", cursor: "pointer",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.2)")}
  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
  {d} {(schedule[d] || []).length ? `• ${(schedule[d] || []).length} groups` : "(rest)"}
  </button>
))}
  </div>
);
}

function SplitCard({ split, onSelect }) {
  const [hovered, setHovered] = useState(false);
  return (<button onClick={ => onSelect(split)}
  onMouseEnter={ => setHovered(true)} onMouseLeave={ => setHovered(false)}
  style={{
  textAlign: "left",
  background: hovered ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.06)",
  border: `2px solid ${hovered ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
  borderRadius: 20, padding: 20, cursor: "pointer", transition: "all 0.25s",
  transform: hovered ? "translateY(-4px)" : "translateY(0)",
  boxShadow: hovered ? "0 16px 40px rgba(99,102,241,0.2)" : "none", color: "#fff",
  }}>
  <div style={{ fontSize: 30, marginBottom: 8 }}>{split.icon}</div>
  <h3 style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 17 }}>{split.label}</h3>
  <span style={{
  display: "inline-block", background: split.badgeColor, color: "#fff", fontSize: 10,
  fontWeight: 700, padding: "2px 10px", borderRadius: 999, margin: "6px 0 8px",
  letterSpacing: 0.5, textTransform: "uppercase",
  }}>{split.badge}</span>
  <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5 }}>{split.description}</p>
  {split.schedule && (<div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
  <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.3)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
  Schedule preview • {split.days} days
  </p>
  <div style={{ display: "flex", gap: 4 }}>
  {DAYS.map((d) => {
  const active = split.schedule[d] && split.schedule[d].length > 0;
  return (<div key={d} title={`${d}: ${(split.schedule[d] || []).join(", ") || "Rest"}`} style={{
  width: 28, height: 28, borderRadius: 8, display: "flex",
  alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
  background: active ? "#4f46e5" : "rgba(255,255,255,0.07)",
  color: active ? "#fff" : "rgba(255,255,255,0.2)",
  }}>{d[0]}</div>
);
  })}
  </div>
  </div>
)}
  <div style={{ marginTop: 10, color: "#818cf8", fontSize: 13, fontWeight: 700 }}>Select {hovered ? "→→" : "→"}</div>
  </button>
);
}

const panelStyle = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20, padding: 22, marginBottom: 20,
};

const primaryBtnStyle = {
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", border: "none",
  borderRadius: 16, padding: "14px 24px", fontSize: 16, fontWeight: 800, cursor: "pointer",
  boxShadow: "0 8px 24px rgba(99,102,241,0.35)", flex: 1,
};

const secondaryBtnStyle = {
  background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer",
};

const backBtnStyle = {
  width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 18,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const comboBtnStyle = {
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff",
  fontSize: 12, fontWeight: 600, padding: "7px 12px", cursor: "pointer",
  display: "flex", alignItems: "center", gap: 5,
};

const combosLabelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700,
  marginBottom: 8, letterSpacing: 1, textTransform: "uppercase",
};

const warnStyle = {
  background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.4)",
  color: "#fde68a", fontSize: 12.5, borderRadius: 12, padding: "10px 14px",
  marginBottom: 16, lineHeight: 1.5,
};
