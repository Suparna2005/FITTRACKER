import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import WorkoutSplitBuilder from './WorkoutSplitBuilder'
import MuscleGuide from './MuscleGuide'
import VisionHub from './VisionHub'
import { AuthShell, TopBar, Panel, LOGIN_IMG, IRON_IMG, DARK_GYM_IMG, HERO_IMG } from './theme'

const EXERCISE_DB = {
  "Chest": ["Bench Press", "Incline Dumbbell Press", "Push-ups", "Cable Crossovers", "Chest Dip"],
  "Back": ["Pull-ups", "Barbell Row", "Lat Pulldown", "Deadlift", "Seated Cable Row"],
  "Legs": ["Barbell Squat", "Leg Press", "Walking Lunges", "Leg Extensions", "Romanian Deadlift", "Calf Raises"],
  "Shoulders": ["Overhead Press", "Lateral Raises", "Front Raises", "Face Pulls", "Upright Row"],
  "Arms": ["Barbell Bicep Curls", "Tricep Pushdowns", "Hammer Curls", "Skull Crushers"],
  "Core": ["Plank", "Crunches", "Leg Raises", "Russian Twists", "Ab Roller"]
}

const CUISINES = ["Generic Indian", "Bengali", "Gujarati", "Punjabi", "South Indian", "North Indian", "Maharashtrian", "Rajasthani", "Continental"]
const DIET_TYPES = ["No Preference", "Veg", "Non-Veg", "Eggetarian"]

// Custom dark dropdown (native select is unreliable with dark theme)
function ClockSelect({ label, value, options, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} onClick={() => setOpen(o => !o)}
        className="field-dark flex items-center justify-between gap-1 min-w-[4.5rem] text-center font-bold">
        {value}
        <span className="text-zinc-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-white/15 bg-zinc-900 shadow-2xl nice-scroll">
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onPick(o); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-yellow-400 hover:text-zinc-950 transition ${o === value ? 'bg-yellow-400 text-zinc-950' : 'text-zinc-200'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Reminder-time picker: 12-hour clock with AM/PM.
// Stores "HH:MM" (24h) internally for backend compatibility.
function TimePicker({ value, onChange }) {
  const parts = (value || '06:00').split(':')
  const h24 = parseInt(parts[0] ?? '06', 10) || 0
  const mm = parts[1] ?? '00'
  const isPM = h24 >= 12
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const mins = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
  const apply = (hour12, minute, pm) => {
    const hour24 = ((parseInt(hour12, 10) % 12) + (pm ? 12 : 0)) % 24
    onChange(`${String(hour24).padStart(2, '0')}:${minute}`)
  }
  return (
    <div>
      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Reminder time</label>
      <div className="flex gap-2 items-center">
        <ClockSelect label="Hour" value={String(h12).padStart(2, '0')} options={hours} onPick={h => apply(h, mm, isPM)} />
        <span className="text-zinc-400 font-bold text-lg leading-none">:</span>
        <ClockSelect label="Minute" value={mm} options={mins} onPick={m => apply(String(h12).padStart(2, '0'), m, isPM)} />
        <ClockSelect label="AM or PM" value={isPM ? 'PM' : 'AM'} options={['AM', 'PM']} onPick={a => apply(String(h12).padStart(2, '0'), mm, a === 'PM')} />
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('login')
  const [history, setHistory] = useState([])
  const [rawHistory, setRawHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [useSplit, setUseSplit] = useState(true)
  const [mySplit, setMySplit] = useState(null)
  const [notifs, setNotifs] = useState({ unread: 0, items: [] })
  const [inboxOpen, setInboxOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilter, setSearchFilter] = useState('all')
  const [inboxDateFilter, setInboxDateFilter] = useState('')
  const [historyDate, setHistoryDate] = useState('')

  const fetchNotifs = async () => {
    if (!user) return
    try {
      const res = await (await fetch(`http://localhost:8000/users/${user.id}/notifications?limit=15`)).json()
      if (res && Array.isArray(res.items)) setNotifs(res)
    } catch {}
  }

  useEffect(() => {
    if (!user) return
    fetchNotifs()
    const t = setInterval(fetchNotifs, 30000)
    return () => clearInterval(t)
  }, [user])

  const markRead = async (id) => {
    try { await fetch(`http://localhost:8000/notifications/${id}/read`, { method: 'POST' }) } catch {}
    setNotifs(prev => ({
      unread: Math.max(0, prev.unread - (prev.items.find(n => n.id === id && !n.is_read) ? 1 : 0)),
      items: prev.items.map(n => n.id === id ? { ...n, is_read: true } : n)
    }))
  }

  const markAllRead = async () => {
    try { await fetch(`http://localhost:8000/users/${user.id}/notifications/read-all`, { method: 'POST' }) } catch {}
    setNotifs(prev => ({ unread: 0, items: prev.items.map(n => ({ ...n, is_read: true })) }))
  }

  const deleteNotif = async (notifId) => {
    try { await fetch(`http://localhost:8000/notifications/${notifId}`, { method: 'DELETE' }) } catch {}
    setNotifs(prev => ({ unread: prev.unread - (prev.items.find(i => i.id === notifId && !i.is_read) ? 1 : 0), items: prev.items.filter(i => i.id !== notifId) }))
  }

  const filteredItems = () => {
    let items = notifs.items
    if (searchFilter === "unread") items = items.filter(i => !i.is_read)
    if (searchFilter === "today") {
      const today = new Date().toISOString().slice(0, 10)
      items = items.filter(i => String(i.created_at || "").startsWith(today))
    }
    if (inboxDateFilter) {
      items = items.filter(i => String(i.created_at || "").startsWith(inboxDateFilter))
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(i => i.title.toLowerCase().includes(term) || i.body.toLowerCase().includes(term))
    }
    return items
  }

  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone_number: '', password: '' })
  const [resetForm, setResetForm] = useState({ identifier: '', new_password: '' })
  const [toast, setToast] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/reset_password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetForm)
      })
      if (!res.ok) throw new Error('Account not found')
      showToast('Password reset successfully! Please log in.')
      setView('login')
      setResetForm({ identifier: '', new_password: '' })
    } catch { showToast('Account not found with that email/phone.') }
    setLoading(false)
  }

  const [profileForm, setProfileForm] = useState({
    email: '', phone_number: '',
    goal: 'Build Muscle', target_timeframe: '12 weeks', experience_level: 'Beginner', equipment: 'Full Gym',
    notification_time: '06:00',
    age: '', gender: 'Male', weight: '', weight_unit: 'kg', height: '', height_unit: 'cm',
    blood_pressure: '', blood_group: 'O+', medical_conditions: '',
    diet_cuisine: 'Generic Indian', diet_type: 'No Preference', body_fat: ''
  })

  const [logData, setLogData] = useState({
    date: '', notes: '', workout_time: '',
    supplements: '', diet_followed: '',
    weight_today: '', height_today: ''
  })

  const [exercises, setExercises] = useState([{ selection: '', customName: '', sets: '', reps: '', weight: '' }])

  useEffect(() => { if (user && view === 'dashboard') fetchSplit() }, [view])

  useEffect(() => {
    if (user) {
      fetchHistory()
      fetchSplit()
      setProfileForm(prev => ({
        ...prev,
        email: user.email || '',
        phone_number: user.phone_number || '',
        goal: user.goal || 'Build Muscle',
        target_timeframe: user.target_timeframe || '',
        experience_level: user.experience_level || 'Beginner',
        equipment: user.equipment || 'Full Gym',
        age: user.age || '',
        gender: user.gender || 'Male',
        blood_pressure: user.blood_pressure || '',
        medical_conditions: user.medical_conditions || '',
        diet_cuisine: user.diet_cuisine || 'Generic Indian',
        diet_type: user.diet_type || 'No Preference',
        body_fat: user.body_fat || ''
      }))
    }
  }, [user])

  const fetchSplit = async () => {
    try {
      const data = await (await fetch(`http://localhost:8000/users/${user.id}/workout_plans`)).json()
      if (Array.isArray(data) && data.length > 0) setMySplit(data[0])
      else setMySplit(null)
    } catch {}
  }

  const fetchHistory = async () => {
    try {
      const data = await (await fetch(`http://localhost:8000/users/${user.id}/history`)).json()
      setRawHistory(Array.isArray(data) ? data : [])
      const formatted = data.map((d, i) => ({
        date: d.workout_data?.date || `Day ${i + 1}`,
        volume: d.workout_data?.volume || 0
      }))
      if (formatted.length === 0) setHistory([{ date: 'No Data', volume: 0 }])
      else setHistory(formatted)
    } catch (e) { console.error(e) }
  }

  // Numeric parser for calorie strings like "2,200 kcal"
  const parseNum = (v) => {
    if (v == null || v === '') return null
    const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? Math.round(n) : null
  }

  const burn = parseNum(plan?.workout_plan?.calories_burned ?? plan?.calorie_summary?.burned)
    ?? (((plan?.workout_plan?.exercises || []).length ? 120 + 70 * plan.workout_plan.exercises.length : 0))
  const intake = parseNum(plan?.diet_chart?.daily_calories ?? plan?.diet_chart?.calories ?? plan?.calorie_summary?.intake)
  const net = intake !== null ? intake - burn : null

  const verdict = (() => {
    if (net === null) return null
    const goal = (user?.goal || '').toLowerCase()
    if (goal.includes('lose')) {
      return net < 0
        ? { t: 'DEFICIT — on track for fat loss', c: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' }
        : { t: 'SURPLUS — eating above burn; tighten portions for fat loss', c: 'text-red-300 border-red-400/30 bg-red-400/10' }
    }
    if (goal.includes('build') || goal.includes('muscle') || goal.includes('gain')) {
      return net >= 0
        ? { t: 'SURPLUS — fuel for muscle growth', c: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' }
        : { t: 'DEFICIT — add ~200-300 kcal to grow', c: 'text-yellow-200 border-yellow-400/30 bg-yellow-400/10' }
    }
    return { t: net >= 0 ? `Net +${net} kcal (surplus)` : `Net ${net} kcal (deficit)`, c: 'text-zinc-300 border-white/10 bg-white/5' }
  })()

  // 7-day intake-vs-burn ledger from stored history
  const last7 = rawHistory.slice(-7)
  const burn7 = last7.reduce((acc, h) => acc + (parseNum(h.workout_data?.calories_burned) || 0), 0)
  const intake7 = last7.reduce((acc, h) => acc + (parseNum(h.diet_data?.daily_calories ?? h.diet_data?.calories) || 0), 0)
  const trackedDays = last7.filter(h =>
    parseNum(h.workout_data?.calories_burned) !== null ||
    parseNum(h.diet_data?.daily_calories ?? h.diet_data?.calories) !== null
  ).length

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to log in.')
      }
      const data = await res.json()
      setUser(data)
      try { localStorage.setItem('fitnessUserId', String(data.id)) } catch {}
      setView('dashboard')
    } catch (err) { showToast(err.message) }
    setLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to sign up.')
      }
      const data = await res.json()
      setUser(data)
      try { localStorage.setItem('fitnessUserId', String(data.id)) } catch {}
      setView('profile')
    } catch (err) { showToast(err.message) }
    setLoading(false)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...profileForm,
      age: profileForm.age ? parseInt(profileForm.age) : null,
      weight: profileForm.weight ? `${profileForm.weight} ${profileForm.weight_unit}` : null,
      height: profileForm.height ? `${profileForm.height} ${profileForm.height_unit}` : null
    }
    delete payload.weight_unit
    delete payload.height_unit
    try {
      const res = await fetch(`http://localhost:8000/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to update profile.')
      const updatedUser = await res.json()
      setUser(updatedUser)
      setView('dashboard')
      showToast('Health Profile Updated Successfully!')
    } catch (err) { showToast(err.message) }
    setLoading(false)
  }

  const handleLogData = async (e) => {
    e.preventDefault()
    setLoading(true)

    for (let ex of exercises) {
      let name = ex.selection === 'custom' ? ex.customName : ex.selection
      if (name && name.trim().length < 3) {
        showToast('Please select a valid exercise or type a custom exercise name (at least 3 characters long).')
        setLoading(false)
        return
      }
    }

    const calcVolume = exercises.reduce((acc, curr) => {
      return acc + ((Number(curr.sets) || 0) * (Number(curr.reps) || 0) * (Number(curr.weight) || 0))
    }, 0)

    try {
      await fetch('http://localhost:8000/log_history/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...logData,
          volume: calcVolume,
          exercises: exercises.filter(ex => ex.selection || ex.customName).map(ex => ({
            name: ex.selection === 'custom' ? ex.customName.trim() : ex.selection,
            sets: Number(ex.sets) || 0,
            reps: Number(ex.reps) || 0,
            weight: Number(ex.weight) || 0
          }))
        })
      })

      const userUpdatePayload = {}
      if (logData.weight_today) userUpdatePayload.weight = logData.weight_today
      if (logData.height_today) userUpdatePayload.height = logData.height_today

      if (Object.keys(userUpdatePayload).length > 0) {
        const updatedUser = await (await fetch(`http://localhost:8000/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userUpdatePayload)
        })).json()
        setUser(updatedUser)
      }

      showToast('Daily Progress Logged successfully! AI is tracking your data.')
      setView('dashboard')
      setExercises([{ selection: '', customName: '', sets: '', reps: '', weight: '' }])
      setLogData({ date: '', notes: '', workout_time: '', supplements: '', diet_followed: '', weight_today: '', height_today: '' })
      fetchHistory()
    } catch { showToast('Failed to log data') }
    setLoading(false)
  }

  const generatePlan = async () => {
    setLoading(true)
    try {
      const data = await (await fetch(
        `http://localhost:8000/generate_plan/?user_id=${user.id}&plan_type=1-day&use_split=${useSplit ? 'true' : 'false'}`,
        { method: 'POST' }
      )).json()
      setPlan(data)
    } catch { showToast('Error generating plan.') }
    setLoading(false)
  }

  const fetchOldPlan = async () => {
    if (!historyDate) { showToast('Please select a date.'); return; }
    setLoading(true)
    try {
      const data = await (await fetch(`http://localhost:8000/users/${user.id}/history?date=${historyDate}`)).json()
      if (data && data.length > 0) {
        // Separate logged history from generated plans
        const logs = data.filter(d => d.workout_data && d.workout_data.date);
        const plans = data.filter(d => d.workout_data && d.workout_data.day);
        
        const primaryData = logs.length > 0 ? logs[0] : plans[0];
        
        if (primaryData) {
          if (primaryData.workout_data.date) {
            // It's a Logged Workout (Manual or Webcam)
            setPlan({
              is_log: true,
              log_notes: primaryData.workout_data.notes,
              workout_plan: {
                day: `LOGGED BATTLE (${primaryData.workout_data.date})`,
                focus: "Actual exercises performed:",
                exercises: primaryData.workout_data.exercises || []
              },
              diet_chart: null
            });
          } else {
            // It's a Generated Plan
            setPlan({
              is_log: false,
              workout_plan: primaryData.workout_data,
              diet_chart: primaryData.diet_data,
              calorie_summary: primaryData.workout_data?.calorie_summary || null
            });
          }
        }
      } else {
        showToast('No history found for this date.')
        setPlan(null)
      }
    } catch { showToast('Error fetching history plan.') }
    setLoading(false)
  }

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayMuscles = mySplit?.schedule?.[todayName] || []

  // --- VIEWS ---

  if (view === 'login') {
    return (
      <AuthShell image={LOGIN_IMG} eyebrow="AI Coaching Engine v2" title="TRAIN LIKE" highlight="A MACHINE."
        sub="Doctor-reviewed AI builds your workout + diet daily from your vitals, history and custom split. Log in to enter the forge.">
        <div className="md:hidden mb-6">
          <h2 className="font-display text-3xl font-bold text-white">IRON<span className="gold-text">FORGE</span></h2>
          <p className="text-xs text-zinc-400 mt-1 tracking-widest uppercase">AI Gym Intelligence</p>
        </div>
        <h2 className="font-display text-3xl font-bold text-white">WELCOME BACK</h2>
        <p className="text-sm text-zinc-400 mb-7">Login to your smart command center</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="text" placeholder="Email or Phone Number" value={loginForm.identifier}
            onChange={e => setLoginForm({ ...loginForm, identifier: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="Password" value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="field-dark" required />
          <div className="flex justify-end -mt-1">
            <span onClick={() => setView('forgot_password')}
              className="text-xs text-yellow-400 cursor-pointer hover:text-yellow-300 font-semibold">Forgot Password?</span>
          </div>
          <button type="submit" disabled={loading} className="gold-btn font-extrabold py-4 rounded-2xl text-base">
            {loading ? 'Entering the forge...' : 'ENTER THE FORGE →'}
          </button>
        </form>
        <p className="mt-7 text-sm text-zinc-400 text-center">New athlete?{' '}
          <span className="font-bold text-yellow-400 cursor-pointer hover:underline" onClick={() => setView('signup')}>Create account</span>
        </p>
      </AuthShell>
    )
  }

  if (view === 'forgot_password') {
    return (
      <AuthShell image={LOGIN_IMG} eyebrow="Account Recovery" title="RESET" highlight="CREDENTIALS."
        sub="Enter your registered email or phone number to set a new password.">
        <div className="md:hidden mb-6">
          <h2 className="font-display text-3xl font-bold text-white">IRON<span className="gold-text">FORGE</span></h2>
        </div>
        <h2 className="font-display text-3xl font-bold text-white">SYSTEM RECOVERY</h2>
        <p className="text-sm text-zinc-400 mb-7">Reset your secure access code</p>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <input type="text" placeholder="Registered Email or Phone" value={resetForm.identifier}
            onChange={e => setResetForm({ ...resetForm, identifier: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="New Password" value={resetForm.new_password}
            onChange={e => setResetForm({ ...resetForm, new_password: e.target.value })} className="field-dark" required />
          <button type="submit" disabled={loading} className="gold-btn font-extrabold py-4 rounded-2xl text-base mt-2">
            {loading ? 'Processing...' : 'RESET PASSWORD →'}
          </button>
        </form>
        <p className="mt-7 text-sm text-zinc-400 text-center cursor-pointer hover:text-yellow-400 font-bold" onClick={() => setView('login')}>← Back to Login</p>
      </AuthShell>
    )
  }

  if (view === 'signup') {
    return (
      <AuthShell image={IRON_IMG} eyebrow="Join 48,000+ athletes" title="FORGE YOUR" highlight="ACCOUNT."
        sub="One account for training splits, nutrition, recovery and AI progression. Takes 20 seconds.">
        <div className="md:hidden mb-6">
          <h2 className="font-display text-3xl font-bold text-white">IRON<span className="gold-text">FORGE</span></h2>
        </div>
        <h2 className="font-display text-3xl font-bold text-white">CREATE ACCOUNT</h2>
        <p className="text-sm text-zinc-400 mb-7">Your basic athlete profile</p>
        <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
          <input type="text" placeholder="Full Name" onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} className="field-dark" required />
          <input type="email" placeholder="Email Address" onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} className="field-dark" required />
          <input type="text" placeholder="Phone Number" onChange={e => setSignupForm({ ...signupForm, phone_number: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="Secure Password" onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} className="field-dark" required />
          <button type="submit" disabled={loading} className="gold-btn font-extrabold py-4 rounded-2xl mt-1">START TRAINING →</button>
        </form>
        <p className="mt-6 text-sm text-zinc-400 text-center cursor-pointer hover:text-yellow-400 font-bold" onClick={() => setView('login')}>← Back to Login</p>
      </AuthShell>
    )
  }

  if (view === 'profile') {
    return (
      <div className="gym-page gym-page-alt py-10 px-4">
        <div className="max-w-5xl mx-auto fade-up">
          <button onClick={() => setView('dashboard')} className="text-yellow-400 font-bold mb-5 hover:underline text-sm">← Skip to Command Center</button>
          <div className="glass rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative px-8 pt-10 pb-8 overflow-hidden"
              style={{ backgroundImage: `linear-gradient(100deg, rgba(9,9,11,.94) 30%, rgba(9,9,11,.55)), url('${DARK_GYM_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="text-[11px] font-bold tracking-[0.3em] uppercase text-yellow-400 mb-2">Athlete Diagnostics</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">BUILD YOUR <span className="gold-text">FIGHTER PROFILE</span></h2>
              <p className="text-zinc-400 mt-2 text-sm max-w-xl">Vitals, goals and equipment — the AI uses this to dose intensity, pick body parts and set macros safely.</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-white tracking-wide mb-1">Ⅰ — BODY METRICS &amp; VITALS</h3>
                <p className="text-xs text-zinc-500 mb-4">Medical-grade baseline for safe programming</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input type="number" placeholder="Age" required value={profileForm.age}
                    onChange={e => setProfileForm({ ...profileForm, age: e.target.value })} className="field-dark" />
                  <select required value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })} className="field-dark">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/60">
                    <input type="number" step="0.1" placeholder="Weight" required value={profileForm.weight}
                      onChange={e => setProfileForm({ ...profileForm, weight: e.target.value })}
                      className="p-3.5 w-full text-sm outline-none bg-transparent text-zinc-100 placeholder:text-zinc-600" />
                    <select value={profileForm.weight_unit} onChange={e => setProfileForm({ ...profileForm, weight_unit: e.target.value })}
                      className="bg-zinc-900 p-3 text-sm border-l border-white/10 text-zinc-300">
                      <option>kg</option><option>lbs</option>
                    </select>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/60">
                    <input type="number" step="0.1" placeholder="Height" required value={profileForm.height}
                      onChange={e => setProfileForm({ ...profileForm, height: e.target.value })}
                      className="p-3.5 w-full text-sm outline-none bg-transparent text-zinc-100 placeholder:text-zinc-600" />
                    <select value={profileForm.height_unit} onChange={e => setProfileForm({ ...profileForm, height_unit: e.target.value })}
                      className="bg-zinc-900 p-3 text-sm border-l border-white/10 text-zinc-300">
                      <option>cm</option><option>feet</option><option>inch</option>
                    </select>
                  </div>
                  <select required value={profileForm.blood_group} onChange={e => setProfileForm({ ...profileForm, blood_group: e.target.value })} className="field-dark">
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <input type="text" required placeholder="Blood Pressure (e.g. 120/80)" value={profileForm.blood_pressure}
                    onChange={e => setProfileForm({ ...profileForm, blood_pressure: e.target.value })} className="field-dark" />
                  <input type="text" required placeholder="Medical Conditions (Type 'None' if clear)" value={profileForm.medical_conditions}
                    onChange={e => setProfileForm({ ...profileForm, medical_conditions: e.target.value })} className="field-dark" />
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-white tracking-wide mb-1">Ⅱ — MISSION &amp; ARSENAL</h3>
                <p className="text-xs text-zinc-500 mb-4">Goal, timeframe, experience and gear</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select required value={profileForm.goal} onChange={e => setProfileForm({ ...profileForm, goal: e.target.value })} className="field-dark">
                    <option>Build Muscle</option><option>Lose Weight</option><option>Flexibility</option>
                  </select>
                  <input type="text" required placeholder="Target (e.g. 30 days)" value={profileForm.target_timeframe}
                    onChange={e => setProfileForm({ ...profileForm, target_timeframe: e.target.value })} className="field-dark" />
                  <select required value={profileForm.experience_level} onChange={e => setProfileForm({ ...profileForm, experience_level: e.target.value })} className="field-dark">
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                  <input type="text" required placeholder="Available Equipment (e.g. Full Gym, or Dumbbells, Bench)" value={profileForm.equipment}
                    onChange={e => setProfileForm({ ...profileForm, equipment: e.target.value })} className="field-dark" />
                  <TimePicker value={profileForm.notification_time}
                    onChange={v => setProfileForm({ ...profileForm, notification_time: v })} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-white tracking-wide mb-1">Ⅲ — FOOD &amp; CUISINE{' '}
                  <span className="text-xs font-sans font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2.5 py-0.5 ml-1 align-middle">OPTIONAL</span>
                </h3>
                <p className="text-xs text-zinc-500 mb-4">AI writes your daily food chart in this cuisine — Breakfast → Morning Snack → Lunch → Afternoon Snack → Dinner</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Cuisine / Nationality</label>
                    <select value={profileForm.diet_cuisine} onChange={e => setProfileForm({ ...profileForm, diet_cuisine: e.target.value })} className="field-dark">
                      {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Food habit</label>
                    <select value={profileForm.diet_type} onChange={e => setProfileForm({ ...profileForm, diet_type: e.target.value })} className="field-dark">
                      {DIET_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.04] p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-white tracking-wide mb-1">Ⅳ — BODY STRUCTURE</h3>
                <p className="text-xs text-zinc-500 mb-4">Select your current estimated body fat. The AI uses this to calculate exact macro splits.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(() => {
                    const options = [
                      { 
                        val: "Shredded (6-9%)", label: "Shredded", desc: "Extremely lean, deep definition.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(0.85)"
                      },
                      { 
                        val: "Athletic (10-14%)", label: "Athletic", desc: "Visible abs, clear definition.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(0.95)"
                      },
                      { 
                        val: "Fit (15-19%)", label: "Fit", desc: "Healthy weight, some definition.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(1.05)"
                      },
                      { 
                        val: "Average (20-24%)", label: "Average", desc: "Normal build, slight softness.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(1.15)"
                      },
                      { 
                        val: "Heavy (25-29%)", label: "Heavy / Soft", desc: "Higher body fat, extra cushion.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(1.28)"
                      },
                      { 
                        val: "Obese (30%+)", label: "Obese", desc: "Significant body fat mass.", 
                        img: "https://wger.de/static/images/muscles/muscular_system_front.svg", scale: "scaleX(1.45)"
                      }
                    ];

                    return options.map(opt => (
                      <label key={opt.val} className={`group relative flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden ${
                        profileForm.body_fat === opt.val 
                          ? 'border-blue-400 bg-blue-400/10 shadow-[0_0_15px_rgba(96,165,250,0.15)]' 
                          : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20'
                      }`}>
                        <input type="radio" name="body_fat" value={opt.val} 
                          checked={profileForm.body_fat === opt.val}
                          onChange={e => setProfileForm({ ...profileForm, body_fat: e.target.value })} 
                          className="absolute opacity-0 w-0 h-0" />
                        
                        <div className="w-full h-44 relative flex items-center justify-center overflow-hidden bg-white/5 pt-2">
                          <img src={opt.img} alt={opt.label} style={{ transform: opt.scale }} className="w-full h-full object-contain filter invert opacity-70 group-hover:opacity-100 transition-all drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                          {profileForm.body_fat === opt.val && <div className="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,1)]"></div>}
                        </div>
                        
                        <div className="p-4 pt-1">
                          <span className="font-bold text-zinc-200 text-sm mt-2 block">{opt.label}</span>
                          <span className="text-[10px] font-bold text-blue-300 mt-0.5 block">{opt.val.split(' ').pop()}</span>
                          <span className="text-[11px] text-zinc-500 mt-2 leading-relaxed block">{opt.desc}</span>
                        </div>
                      </label>
                    ));
                  })()}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                <h3 className="font-display text-lg font-bold text-white tracking-wide mb-1">Ⅴ — ACCOUNT &amp; CONTACT</h3>
                <p className="text-xs text-zinc-500 mb-4">Where your daily AI plans are sent</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                    <input type="email" placeholder="Email" required value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="field-dark" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Phone Number</label>
                    <input type="text" placeholder="Phone (e.g. +1234567890)" required value={profileForm.phone_number}
                      onChange={e => setProfileForm({ ...profileForm, phone_number: e.target.value })} className="field-dark" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="gold-btn font-extrabold py-5 rounded-2xl w-full text-lg">
                {loading ? 'Forging...' : 'FORGE MY PROFILE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'tutorial') {
    return (
      <div className="gym-page py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8 fade-up">
          <button onClick={() => setView('dashboard')} className="text-yellow-400 font-bold mb-2 hover:underline text-sm">← Back to Command Center</button>
          <Panel kicker="SYSTEM TRAINING" title="INTERFACE TUTORIAL" sub="Learn exactly how to interact with the core modules.">
            <div className="grid grid-cols-1 gap-12 mt-6">
              
              {/* Step 1 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4"><span className="text-yellow-400">1.</span> Profile Form</h3>
                <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 md:p-8 relative">
                  <div className="grid grid-cols-2 gap-4 mb-4 opacity-50 pointer-events-none">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Age</label>
                      <div className="bg-black border border-white/10 rounded-lg p-3 text-sm text-white font-mono flex items-center gap-1">
                        <span>28</span><span className="border-r-2 border-yellow-400 animate-pulse h-4"></span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Goal</label>
                      <div className="bg-yellow-400/10 border border-yellow-400/50 text-yellow-200 rounded-lg p-3 text-sm relative shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        Build Muscle 
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mt-4 text-sm text-zinc-400">
                    <strong className="text-white">Action:</strong> Simply type your numbers in the fields. The AI uses your weight to calculate <span className="text-emerald-400 font-bold">calorie intake</span> and your goal to adjust <span className="text-orange-400 font-bold">workout volume</span>.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4"><span className="text-yellow-400">2.</span> Log Progress</h3>
                <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 md:p-8 relative">
                  <div className="space-y-3 mb-4 opacity-50 pointer-events-none">
                    <div className="flex gap-2">
                      <div className="bg-black border border-white/10 rounded-lg p-3 text-sm text-zinc-300 flex-1 relative hidden md:block">
                        <span className="text-zinc-500">Select exercise...</span>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                      </div>
                      <div className="bg-yellow-400/10 border border-yellow-400/50 rounded-lg p-3 text-sm text-yellow-200 font-mono w-20 text-center flex justify-center items-center gap-0.5 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        4<span className="border-r-2 border-yellow-400 animate-pulse h-4"></span>
                      </div>
                      <div className="bg-black border border-white/10 rounded-lg p-3 text-sm text-zinc-500 font-mono w-20 text-center">Reps</div>
                      <div className="bg-black border border-white/10 rounded-lg p-3 text-sm text-zinc-500 font-mono w-24 text-center">Weight</div>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mt-4 text-sm text-zinc-400">
                    <strong className="text-white">Action:</strong> Select an exercise from the dropdown (or type a custom one), then enter the <strong className="text-white">Sets</strong>, <strong className="text-white">Reps</strong>, and <strong className="text-white">Weight (kg)</strong> you actually lifted today. Click "Commit" to update your volume chart!
                  </div>
                </div>
              </div>

            {/* Step 3 */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4"><span className="text-yellow-400">3.</span> Command Center</h3>
              <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 md:p-8 relative">
                <div className="mb-4 opacity-50 pointer-events-none">
                  <div className="bg-yellow-400/10 border border-yellow-400/50 rounded-xl p-4 text-center relative shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                    <span className="font-bold text-yellow-400 tracking-widest">GENERATE AI PLAN</span>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mt-4 text-sm text-zinc-400">
                  <strong className="text-white">Action:</strong> Hit this button every day. The AI Engine reads your vitals from the <strong className="text-white">Profile</strong> and your lifting data from the <strong className="text-white">Log Progress</strong> tab to calculate the perfect daily workout and diet chart!
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4"><span className="text-yellow-400">4.</span> Muscle Guide</h3>
              <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 md:p-8 relative flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/3 bg-black border border-white/10 rounded-xl p-4 relative h-40 flex items-center justify-center opacity-50">
                   <div className="absolute inset-0 bg-[url('https://wger.de/static/images/muscles/muscular_system_front.svg')] bg-contain bg-center bg-no-repeat opacity-30"></div>
                   <div className="absolute top-[20%] left-[25%] w-10 h-10 bg-red-500 rounded-full blur-sm"></div>
                </div>
                
                <div className="flex-1 space-y-2 opacity-50 w-full pointer-events-none">
                  <div className="border-l-2 border-zinc-700 pl-3 py-1">
                    <div className="text-sm font-bold text-white">Front Deltoid</div>
                  </div>
                  
                  <div className="border-l-2 border-yellow-400 bg-white/5 pl-3 py-2 rounded-r-lg relative shadow-[0_0_15px_rgba(250,204,21,0.1)]">
                    <div className="text-sm font-bold text-yellow-400">Side Deltoid (Lateral)</div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mt-4 text-sm text-zinc-400">
                <strong className="text-white">Action:</strong> Jump into the <strong className="text-white">Muscle Guide</strong> and hover your cursor over any sub-muscle in the list. The anatomical diagram will immediately isolate and highlight that specific muscle head!
              </div>
            </div>

            </div>
          </Panel>
        </div>
      </div>
    )
  }

  if (view === 'input') {
    return (
      <div className="gym-page py-8 px-4">
        <div className="max-w-5xl mx-auto fade-up">
          <button onClick={() => setView('dashboard')} className="text-yellow-400 font-bold mb-4 hover:underline text-sm">← Back to Command Center</button>
          <div className="glass rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative px-8 py-8"
              style={{ backgroundImage: `linear-gradient(100deg, rgba(9,9,11,.94) 30%, rgba(9,9,11,.5)), url('${IRON_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="text-[11px] font-bold tracking-[0.3em] uppercase text-yellow-400 mb-2">Daily Warfare Log</div>
              <h2 className="font-display text-4xl font-bold text-white">LOG TODAY&apos;S <span className="gold-text">BATTLE</span></h2>
              <p className="text-sm text-zinc-400 mt-1">Lifts, fuel and recovery — one log feeds tomorrow&apos;s AI plan.</p>
            </div>
            <form onSubmit={handleLogData} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Workout Date</label>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={logData.date} onChange={e => setLogData({ ...logData, date: e.target.value })} className="field-dark" style={{ colorScheme: 'dark' }} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Duration</label>
                  <input type="text" placeholder="e.g. 45 mins" value={logData.workout_time} onChange={e => setLogData({ ...logData, workout_time: e.target.value })} className="field-dark" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Today&apos;s Weight</label>
                  <input type="text" placeholder="e.g. 71.5 kg" value={logData.weight_today} onChange={e => setLogData({ ...logData, weight_today: e.target.value })} className="field-dark" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Today&apos;s Height</label>
                  <input type="text" placeholder="e.g. 167 cm" value={logData.height_today} onChange={e => setLogData({ ...logData, height_today: e.target.value })} className="field-dark" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-display font-bold text-white text-lg tracking-wide">EXERCISES COMPLETED</h3>
                  <button type="button" onClick={() => setExercises([...exercises, { selection: '', customName: '', sets: '', reps: '', weight: '' }])}
                    className="text-xs font-extrabold px-4 py-2 rounded-full text-zinc-950"
                    style={{ background: 'linear-gradient(135deg,#fde047,#f59e0b)' }}>+ ADD LIFT</button>
                </div>
                {exercises.map((ex, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-2.5 items-center mb-3 rounded-2xl border border-white/10 bg-black/40 p-3.5">
                    {ex.selection === 'custom' ? (
                      <div className="flex w-full md:w-1/3 rounded-xl overflow-hidden border border-white/10">
                        <input type="text" placeholder="Custom lift..." value={ex.customName}
                          onChange={e => { const n = [...exercises]; n[index].customName = e.target.value; setExercises(n) }}
                          className="p-3 w-full text-sm outline-none bg-transparent text-zinc-100" />
                        <button type="button" onClick={() => { const n = [...exercises]; n[index].selection = ''; n[index].customName = ''; setExercises(n) }}
                          className="text-zinc-400 hover:text-red-400 px-4 font-bold bg-white/5 border-l border-white/10">✕</button>
                      </div>
                    ) : (
                      <select value={ex.selection}
                        onChange={e => { const n = [...exercises]; n[index].selection = e.target.value; setExercises(n) }}
                        className="field-dark md:w-1/3 font-semibold cursor-pointer">
                        <option value="" disabled>Select lift...</option>
                        {Object.keys(EXERCISE_DB).map(cat => (
                          <optgroup key={cat} label={`--- ${cat.toUpperCase()} ---`}>
                            {EXERCISE_DB[cat].map(name => <option key={name} value={name}>{name}</option>)}
                          </optgroup>
                        ))}
                        <optgroup label="--- OTHER ---"><option value="custom">+ Custom...</option></optgroup>
                      </select>
                    )}
                    <input type="number" placeholder="Sets" value={ex.sets}
                      onChange={e => { const n = [...exercises]; n[index].sets = e.target.value; setExercises(n) }} className="field-dark md:w-1/6" />
                    <input type="number" placeholder="Reps" value={ex.reps}
                      onChange={e => { const n = [...exercises]; n[index].reps = e.target.value; setExercises(n) }} className="field-dark md:w-1/6" />
                    <input type="number" placeholder="Weight" value={ex.weight}
                      onChange={e => { const n = [...exercises]; n[index].weight = e.target.value; setExercises(n) }} className="field-dark md:w-1/4" />
                    {exercises.length > 1 && (
                      <button type="button" onClick={() => setExercises(exercises.filter((_, i) => i !== index))}
                        className="text-red-400 font-bold text-2xl px-2 hover:scale-125">×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Fuel — diet today</label>
                  <textarea placeholder="e.g. 3 eggs, chicken and rice..." value={logData.diet_followed}
                    onChange={e => setLogData({ ...logData, diet_followed: e.target.value })} className="field-dark" rows="3"></textarea>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Arsenal — supplements</label>
                  <textarea placeholder="e.g. Whey Protein, Creatine 5g..." value={logData.supplements}
                    onChange={e => setLogData({ ...logData, supplements: e.target.value })} className="field-dark" rows="3"></textarea>
                </div>
              </div>

              <button type="submit" disabled={loading} className="gold-btn font-extrabold py-4 rounded-2xl w-full text-lg">COMMIT TO THE RECORD →</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const isNewUser = history.length === 0 || (history.length === 1 && history[0].date === 'No Data')
  const needsProfile = !user?.weight || !user?.age

  return (
    <div className="gym-page">
      <div className="max-w-7xl mx-auto p-4 md:p-8 fade-up">
        <TopBar user={user} active={view}
          onNav={(v) => { setInboxOpen(false); setView(v) }}
          unread={notifs.unread}
          onBell={() => { setInboxOpen(o => !o); fetchNotifs() }}
          onLogout={() => { setUser(null); try { localStorage.removeItem('fitnessUserId') } catch {}; setView('login') }} />

        {inboxOpen && (
          <div className="glass rounded-3xl p-5 md:p-6 mb-6 shadow-2xl fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl font-bold text-white tracking-wide">INBOX{' '}
                <span className="text-sm text-zinc-500 font-sans">— auto-delivered daily at {user?.notification_time || '06:00'}, no keys needed</span>
              </h3>
            </div>
            {/* Search & filter */}
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                placeholder="Search by keyword…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="field-dark flex-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none min-w-[150px]"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={inboxDateFilter}
                onChange={e => { setInboxDateFilter(e.target.value); setSearchFilter('all'); }}
                className="field-dark rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }}
              />
              <select
                value={searchFilter}
                onChange={e => { setSearchFilter(e.target.value); setInboxDateFilter(''); setSearchTerm('') }}
                className="field-dark rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <option value="all">All</option>
                <option value="unread">Unread only</option>
                <option value="today">Today only</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={markAllRead} className="text-[11px] font-bold text-yellow-300 hover:underline">Mark all read</button>
              <button onClick={() => setInboxOpen(false)}
                className="text-[11px] font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">✕</button>
            </div>
            {notifs.items.length === 0 && (
              <p className="text-sm text-zinc-500">No messages yet — your daily AI plan will land here automatically at your reminder time.</p>
            )}
            <div className="space-y-2 max-h-96 overflow-auto nice-scroll">
              {filteredItems().map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className={`rounded-2xl border p-3.5 cursor-pointer transition ${n.is_read ? 'border-white/5 bg-white/[0.02]' : 'border-yellow-400/30 bg-yellow-400/[0.06]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-zinc-100">{!n.is_read && '● '}{n.title}</span>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">{String(n.created_at || '').slice(0, 16)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                    className="text-[10px] font-bold text-red-400 hover:text-white bg-red-400/10 px-1.5 py-0.5 rounded mr-1">🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'split' && (
          <div className="mb-8">
            <WorkoutSplitBuilder userId={user?.id} onClose={() => setView('dashboard')} />
          </div>
        )}

        {view === 'guide' && (
          <MuscleGuide onClose={() => setView('dashboard')} />
        )}

        {view === 'vision' && (
          <VisionHub 
            user={user} 
            plan={plan}
            onClose={() => setView('dashboard')} 
            onNavigate={(v) => setView(v)} 
            updateUser={(updated) => { setUser(updated); showToast("Profile Updated from Vision Scanner!"); setView("profile"); }}
          />
        )}

        {needsProfile && view === 'dashboard' && (
          <div className="mb-6 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-yellow-300 font-bold">ATHLETE PROFILE INCOMPLETE</h3>
              <p className="text-yellow-100/70 text-sm mt-0.5">Complete vitals so the AI can dose training safely.</p>
            </div>
            <button onClick={() => setView('profile')} className="gold-btn font-extrabold py-2.5 px-6 rounded-xl text-sm">COMPLETE NOW →</button>
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-6">
              <div className="absolute inset-0"
                style={{ backgroundImage: `linear-gradient(100deg, rgba(9,9,11,.95) 25%, rgba(9,9,11,.65) 60%, rgba(9,9,11,.25)), url('${HERO_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
              <div className="relative p-8 md:p-12 flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3.5 py-1.5 mb-4">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> {todayName} — {todayMuscles.length ? todayMuscles.join(' + ').toUpperCase() : 'RECOVERY DAY'}
                  </div>
                  <h2 className="font-display font-bold text-white leading-[0.95]" style={{ fontSize: 'clamp(2.6rem,6vw,4.5rem)' }}>
                    TRAIN. <span className="gold-text">FUEL.</span><br />DOMINATE.
                  </h2>
                  <p className="text-zinc-400 mt-3 max-w-lg text-sm md:text-base">
                    {mySplit ? (
                      <>Locked split: <strong className="text-zinc-200">{mySplit.split_label}</strong> — today&apos;s iron:{' '}
                        <strong className="text-yellow-300">{todayMuscles.length ? todayMuscles.join(' + ') : 'Rest'}</strong>. AI builds sets, reps &amp; macros around it.</>
                    ) : (
                      <>No custom split yet — AI will auto-select today&apos;s body parts from your goal &amp; history, or forge a split first.</>
                    )}
                  </p>
                  <div className="flex gap-6 mt-6 flex-wrap">
                    {[
                      [String(history.length > 1 ? history.length : 0), 'Sessions'],
                      [mySplit?.days_per_week ?? todayMuscles.length ? String(mySplit?.days_per_week ?? '—') : '—', 'Days / week'],
                      [user?.goal || '—', 'Mission'],
                      [user?.diet_cuisine && user.diet_cuisine !== 'Generic Indian' ? user.diet_cuisine : 'Auto diet', 'Cuisine']
                    ].map(([val, label]) => (
                      <div key={label}>
                        <div className="font-display text-2xl font-bold text-white truncate max-w-[160px]">{val}</div>
                        <div className="text-[11px] text-zinc-500 uppercase tracking-widest">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full sm:w-auto">
                  <button onClick={generatePlan} disabled={loading || needsProfile}
                    className="gold-btn font-extrabold py-4 px-8 rounded-2xl text-base whitespace-nowrap">
                    {loading ? 'ANALYZING...' : 'GENERATE AI PLAN'}
                  </button>
                  <button onClick={() => setView('split')}
                    className="font-bold text-sm px-8 py-3.5 rounded-2xl text-zinc-100 border border-white/15 bg-white/5 hover:bg-white/10 transition whitespace-nowrap">
                    {mySplit ? 'Edit my split' : '＋ Forge my split'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Panel className="lg:col-span-2" kicker="Performance Telemetry" title="VOLUME HISTORY"
                sub="Total tonnage per logged day — the AI reads this curve."
                action={<span className="text-[11px] font-bold text-zinc-500 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">{history.length} logs</span>}>
                <div className="h-80 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', background: '#18181b', color: '#fff' }} />
                      <Legend wrapperStyle={{ color: '#a1a1aa' }} />
                      <Line type="monotone" dataKey="volume" name="Total Volume" stroke="#facc15" strokeWidth={4} dot={{ r: 5, fill: '#facc15' }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                  <div className="rounded-2xl border border-orange-400/25 bg-orange-400/[0.07] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-orange-300">Losing (burn)</div>
                    <div className="font-display text-2xl font-bold text-white">{trackedDays ? `${burn7.toLocaleString()} kcal` : '—'}</div>
                    <div className="text-[11px] text-zinc-500">7-day workouts</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Intake (diet)</div>
                    <div className="font-display text-2xl font-bold text-white">{trackedDays ? `${intake7.toLocaleString()} kcal` : '—'}</div>
                    <div className="text-[11px] text-zinc-500">7-day food charts</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Net</div>
                    <div className={`font-display text-2xl font-bold ${trackedDays ? (intake7 - burn7 >= 0 ? 'text-emerald-300' : 'text-yellow-300') : 'text-white'}`}>
                      {trackedDays ? `${intake7 - burn7 >= 0 ? '+' : ''}${(intake7 - burn7).toLocaleString()} kcal` : '—'}
                    </div>
                    <div className="text-[11px] text-zinc-500">{trackedDays ? `${trackedDays} days tracked` : 'no calorie data yet'}</div>
                  </div>
                </div>
              </Panel>

              <Panel kicker="AI Coach" title={isNewUser ? 'DAY ONE PROTOCOL' : 'NEXT MISSION'}
                sub={isNewUser ? 'Foundation plan from your profile.' : 'Adaptive macros + lifts for your timeframe.'}>
                <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] p-4 mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={useSplit} onChange={e => setUseSplit(e.target.checked)} className="mt-1 w-5 h-5 accent-yellow-400" />
                    <span>
                      <span className="font-bold text-yellow-200 text-sm">Custom split fuel (optional)</span>
                      <span className="block text-xs text-zinc-400 mt-1">
                        {mySplit ? (
                          <>Today: <strong className="text-zinc-200">{todayMuscles.length ? todayMuscles.join(' + ') : 'Rest'}</strong> • {mySplit.split_label}</>
                        ) : (
                          <>No split saved — AI auto-picks body parts.</>
                        )}
                      </span>
                      {!useSplit && <span className="block text-xs text-zinc-500 mt-1">OFF → pure AI auto mode.</span>}
                    </span>
                  </label>
                </div>

                <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] p-4 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-yellow-200 text-sm">Daily auto-plan → {user?.notification_time || '06:00'}</span>
                    <button onClick={() => setView('profile')} className="text-[11px] font-bold text-yellow-300 hover:underline whitespace-nowrap">Change →</button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5">Sent to your registered contacts every day at that time:
                    <span className="block mt-0.5 text-zinc-200 font-semibold">{user?.phone_number || 'no mobile saved'} • {user?.email || 'no email saved'}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-200 text-sm">Food chart: {user?.diet_cuisine || 'Generic Indian'}
                      {user?.diet_type && user.diet_type !== 'No Preference' ? ` • ${user.diet_type}` : ''}</span>
                    <button onClick={() => setView('profile')} className="text-[11px] font-bold text-emerald-300 hover:underline whitespace-nowrap">Change →</button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Routine: Breakfast → Morning Snack → Lunch → Afternoon Snack → Dinner, in your cuisine.</p>
                </div>

                <button onClick={generatePlan} disabled={loading || needsProfile}
                  className="gold-btn font-extrabold py-4 px-8 rounded-2xl w-full text-base shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  {loading ? 'ANALYZING DATA...' : 'GENERATE NEXT AI PLAN'}
                </button>
                
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Or view past workouts:</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      max={new Date().toISOString().slice(0, 10)}
                      value={historyDate} 
                      onChange={e => setHistoryDate(e.target.value)} 
                      className="field-dark flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                    <button onClick={fetchOldPlan} disabled={loading} className="font-bold text-xs px-4 rounded-xl text-yellow-300 border border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/20 transition whitespace-nowrap">
                      Search 🔍
                    </button>
                  </div>
                </div>

                {plan && (
                  <div className="mt-5 space-y-3 overflow-auto max-h-[32rem] pr-1 nice-scroll">
                    <h3 className="font-display font-bold text-yellow-300 text-lg tracking-wide">PLAN DEPLOYED</h3>
                    {plan.split_used?.custom && (
                      <div className="border border-yellow-400/30 bg-yellow-400/10 text-yellow-100 text-xs p-3 rounded-xl">
                        Split <strong>{plan.split_used.label}</strong> • {plan.split_used.day}:{' '}
                        <strong>{(plan.split_used.muscles || []).join(' + ') || 'Rest'}</strong>
                      </div>
                    )}
                    {!plan.split_used?.custom && (
                      <div className="border border-white/10 bg-white/5 text-zinc-400 text-xs p-3 rounded-xl">
                        Auto mode — AI selected today&apos;s focus from goal &amp; history.
                      </div>
                    )}
                    {plan.API_ERROR && (
                      <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 text-xs p-3 rounded-xl">
                        Fallback plan (AI error). Check backend terminal.
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2.5">Energy ledger — today</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-orange-400/25 bg-orange-400/[0.08] p-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Losing</div>
                          <div className="font-display text-xl font-bold text-white">{burn.toLocaleString()}
                            <span className="text-xs font-sans font-semibold text-zinc-500"> kcal</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">workout burn</div>
                        </div>
                        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] p-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Intake</div>
                          <div className="font-display text-xl font-bold text-white">{intake !== null ? intake.toLocaleString() : '—'}
                            <span className="text-xs font-sans font-semibold text-zinc-500"> kcal</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">food chart</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net</div>
                          <div className={`font-display text-xl font-bold ${net !== null ? (net >= 0 ? 'text-emerald-300' : 'text-yellow-300') : 'text-white'}`}>
                            {net !== null ? `${net >= 0 ? '+' : ''}${net.toLocaleString()}` : '—'}
                            <span className="text-xs font-sans font-semibold text-zinc-500"> kcal</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">intake − burn</div>
                        </div>
                      </div>
                      {verdict && <div className={`text-xs font-bold mt-2.5 p-2.5 rounded-xl border ${verdict.c}`}>{verdict.t}</div>}
                    </div>

                    <div className="border border-white/10 bg-black/40 p-4 rounded-2xl">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display font-bold text-white tracking-wide">WORKOUT — {plan.workout_plan?.day || 'Today'}</h4>
                        <span className="text-[11px] font-extrabold text-orange-200 bg-orange-400/15 border border-orange-400/30 rounded-full px-2.5 py-1 whitespace-nowrap">
                          ~{burn.toLocaleString()} kcal
                        </span>
                      </div>
                      <p className="text-sm text-yellow-300/90 mb-3 font-semibold">{plan.workout_plan?.focus || ''}</p>
                      
                      {plan.is_log && plan.log_notes && (
                        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-200 text-xs italic">
                          {plan.log_notes}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {(plan.workout_plan?.exercises || []).map((ex, i) => (
                          <div key={i} className="bg-white/[0.04] border border-white/10 p-3 rounded-xl flex justify-between items-center">
                            <div>
                              <div className="font-bold text-sm text-zinc-100">{ex.name}</div>
                              <div className="text-xs text-zinc-500">{ex.sets} sets × {ex.reps}{ex.rest ? ` • Rest ${ex.rest}` : ''}</div>
                            </div>
                            <div className="text-yellow-400 font-bold text-sm">{ex.sets}×{ex.reps}</div>
                          </div>
                        ))}
                        {(!plan.workout_plan?.exercises || plan.workout_plan.exercises.length === 0) && (
                          <p className="text-sm text-zinc-500">Recovery day — mobility + walk. Diet below still applies.</p>
                        )}
                      </div>
                    </div>

                    {!plan.is_log && (
                    <div className="border border-emerald-400/20 bg-emerald-400/[0.06] p-4 rounded-2xl">
                      <h4 className="font-display font-bold text-white tracking-wide">WAR-RATIONS — {plan.diet_chart?.daily_calories || plan.diet_chart?.calories || ''}{' '}
                        {(plan.diet_chart?.daily_calories || plan.diet_chart?.calories) ? 'kcal' : ''}</h4>
                      <div className="text-[11px] font-bold text-emerald-300 mt-1">
                        {(plan.diet_chart?.cuisine || plan.diet_used?.cuisine || user?.diet_cuisine)
                          ? `${plan.diet_chart?.cuisine || plan.diet_used?.cuisine || user?.diet_cuisine}` : ''}
                        {((plan.diet_chart?.diet_type || plan.diet_used?.diet_type || user?.diet_type) &&
                          (plan.diet_chart?.diet_type || plan.diet_used?.diet_type || user?.diet_type) !== 'No Preference')
                          ? ` • ${plan.diet_chart?.diet_type || plan.diet_used?.diet_type || user?.diet_type}` : ''}
                      </div>
                      {(plan.diet_chart?.macros || plan.diet_chart?.protein) && (
                        <div className="flex gap-2 mt-2 mb-3 text-xs flex-wrap">
                          <span className="bg-black/40 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-lg">Protein: {plan.diet_chart.macros?.protein || plan.diet_chart.protein}</span>
                          <span className="bg-black/40 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-lg">Carbs: {plan.diet_chart.macros?.carbs || plan.diet_chart.carbs}</span>
                          <span className="bg-black/40 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-lg">Fats: {plan.diet_chart.macros?.fats || plan.diet_chart.fats}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {[...(plan.diet_chart?.meals || [])].sort((a, b) => {
                          const order = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner']
                          const ia = order.indexOf(a.name), ib = order.indexOf(b.name)
                          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
                        }).map((m, i) => (
                          <div key={i} className="bg-black/40 p-3 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-bold text-sm text-zinc-100">{m.name || `Meal ${i + 1}`}</div>
                              {(m.time || m.kcal) && (
                                <div className="text-[11px] text-zinc-400 font-semibold whitespace-nowrap">
                                  {m.time || ''}{m.time && m.kcal ? ' • ' : ''}{m.kcal ? `${m.kcal} kcal` : ''}
                                </div>
                              )}
                            </div>
                            {m.meal && <div className="text-sm text-yellow-100/90 font-semibold mt-1">{m.meal}</div>}
                            {!m.meal && m.items && (
                              <div className="text-sm text-zinc-300 mt-1">{m.items.map(it => it.item || it.name).join(' • ')}</div>
                            )}
                            {m.items && (
                              <ul className="text-xs text-zinc-400 list-disc ml-4 mt-1.5 space-y-0.5">
                                {m.items.map((it, j) => (
                                  <li key={j}>{it.item || it.name} {it.quantity ? <span className="text-zinc-500">— {it.quantity}</span> : ''}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                        {(!plan.diet_chart?.meals || plan.diet_chart.meals.length === 0) && (
                          <p className="text-sm text-zinc-500">No meals returned — try regenerating.</p>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] fade-up bg-zinc-900 border border-yellow-400/50 shadow-[0_0_40px_rgba(250,204,21,0.3)] rounded-xl p-5 text-sm font-bold text-white min-w-[300px] flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
