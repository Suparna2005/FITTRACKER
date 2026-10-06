import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import WorkoutSplitBuilder from './WorkoutSplitBuilder'
import MuscleGuide from './MuscleGuide'
import VisionHub from './VisionHub'
import DiscomfortHub from './DiscomfortHub'
import { AuthShell, Sidebar, MobileBottomNav, HeaderBar, Panel, LOGIN_IMG, IRON_IMG, DARK_GYM_IMG, HERO_IMG } from './theme'

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

// Custom dark dropdown
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
        <span className="text-[#ACBAC2] text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-[#304149] bg-[#10181D] shadow-2xl nice-scroll">
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onPick(o); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-[#C7F36B] hover:text-[#0B1014] transition ${o === value ? 'bg-[#C7F36B] text-[#0B1014]' : 'text-[#F4F7F8]'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Reminder-time picker
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
      <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Reminder time</label>
      <div className="flex gap-2 items-center">
        <ClockSelect label="Hour" value={String(h12).padStart(2, '0')} options={hours} onPick={h => apply(h, mm, isPM)} />
        <span className="text-[#ACBAC2] font-bold text-lg leading-none">:</span>
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
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googleEmailInput, setGoogleEmailInput] = useState('')
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [useSplit, setUseSplit] = useState(true)
  const [mySplit, setMySplit] = useState(null)
  const [notifs, setNotifs] = useState({ unread: 0, items: [] })
  const [inboxOpen, setInboxOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilter, setSearchFilter] = useState('all')
  const [inboxDateFilter, setInboxDateFilter] = useState('')
  const [historyDate, setHistoryDate] = useState('')
  const [chartTimeframe, setChartTimeframe] = useState('weekly') // 'weekly' or 'monthly'

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

  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem('fitnessUserId') } catch {};
    setView('login');
  }

  const handleNav = (v) => {
    setInboxOpen(false);
    setView(v);
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
        date: d.workout_data?.date ? new Date(d.workout_data.date).toLocaleDateString('en-US', { weekday: 'short' }) : `Day ${i + 1}`,
        fullDate: d.workout_data?.date || `Day ${i + 1}`,
        volume: d.workout_data?.volume || 0
      }))
      setHistory(formatted)
    } catch (e) { console.error(e) }
  }

  // Filter chart history based on Weekly (last 7) or Monthly (last 30)
  const getFilteredChartHistory = () => {
    if (!history || history.length === 0) {
      return [
        { date: 'Mon', volume: 0 },
        { date: 'Tue', volume: 0 },
        { date: 'Wed', volume: 0 },
        { date: 'Thu', volume: 0 },
        { date: 'Fri', volume: 0 },
        { date: 'Sat', volume: 0 },
        { date: 'Sun', volume: 0 },
      ]
    }
    if (chartTimeframe === 'weekly') {
      return history.slice(-7)
    }
    return history.slice(-30)
  }

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
        ? { t: 'DEFICIT — on track for fat loss', c: 'text-[#54D8CF] border-[#54D8CF]/30 bg-[#54D8CF]/10' }
        : { t: 'SURPLUS — eating above burn; tighten portions for fat loss', c: 'text-[#FF897A] border-[#FF897A]/30 bg-[#FF897A]/10' }
    }
    if (goal.includes('build') || goal.includes('muscle') || goal.includes('gain')) {
      return net >= 0
        ? { t: 'SURPLUS — fuel for muscle growth', c: 'text-[#C7F36B] border-[#C7F36B]/30 bg-[#C7F36B]/10' }
        : { t: 'DEFICIT — add ~200-300 kcal to grow', c: 'text-[#FF897A] border-[#FF897A]/30 bg-[#FF897A]/10' }
    }
    return { t: net >= 0 ? `Net +${net} kcal (surplus)` : `Net ${net} kcal (deficit)`, c: 'text-[#F4F7F8] border-[#304149] bg-[#10181D]' }
  })()

  const handleGoogleLogin = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: "108398471283-fittracker.apps.googleusercontent.com",
          callback: (response) => {
            if (response?.credential) {
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const payload = JSON.parse(jsonPayload);
                submitGoogleAuth(payload.email, payload.name, payload.sub);
                return;
              } catch (e) {}
            }
          }
        });
        window.google.accounts.id.prompt();
      } catch (e) {}
    }
    setShowGoogleModal(true)
  }

  const submitGoogleAuth = async (email, name = null, googleId = null) => {
    setShowGoogleModal(false)
    setLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').toUpperCase()
      const cleanGoogleId = googleId || ("g_" + Math.random().toString(36).substring(2, 10))

      const res = await fetch('http://localhost:8000/google_login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          google_id: cleanGoogleId
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Google authentication failed.')
      }

      const data = await res.json()
      setUser(data)
      try { localStorage.setItem('fitnessUserId', String(data.id)) } catch {}
      showToast(`Welcome ${data.name}! Authenticated via Google.`)
      setView('dashboard')
    } catch (err) {
      showToast(err.message || 'Google Login failed')
    }
    setLoading(false)
  }

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
    if (needsProfile) {
      showToast('Please complete your Athlete Profile (age & weight) so the AI can calculate your macros safely!')
      setView('profile')
      return
    }
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
        const logs = data.filter(d => d.workout_data && d.workout_data.date);
        const plans = data.filter(d => d.workout_data && d.workout_data.day);
        
        const primaryData = logs.length > 0 ? logs[0] : plans[0];
        
        if (primaryData) {
          if (primaryData.workout_data.date) {
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

  const renderGoogleModal = () => {
    if (!showGoogleModal) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-up">
        <div className="relative w-full max-w-md bg-[#172127] border border-[#304149] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
          <button 
            type="button"
            onClick={() => setShowGoogleModal(false)}
            className="absolute top-4 right-4 text-[#ACBAC2] hover:text-[#F4F7F8] text-xs font-bold bg-[#10181D] px-3 py-1.5 rounded-lg border border-[#304149] transition-colors"
          >
            ✕ Close
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#F4F7F8] tracking-wide">Sign in with Google</h3>
            <p className="text-xs text-[#ACBAC2] mt-1">Enter your Google email address to authorize access</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (googleEmailInput.trim()) {
              submitGoogleAuth(googleEmailInput.trim());
            }
          }} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#ACBAC2] mb-1.5 block">
                Google Account Email
              </label>
              <input 
                type="email"
                placeholder="your.email@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                className="field-dark"
                required
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="btn-lime w-full text-sm uppercase tracking-wide py-3.5"
            >
              Continue with Google Account →
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- VIEWS ---

  if (view === 'login') {
    return (
      <>
        {renderGoogleModal()}
        <AuthShell image={LOGIN_IMG} eyebrow="AI Coaching Engine v2" title="TRAIN LIKE" highlight="A MACHINE."
          sub="Doctor-reviewed AI builds your workout + diet daily from your vitals, history and custom split. Log in to enter the forge.">
        <div className="md:hidden mb-6">
          <h2 className="text-3xl font-extrabold text-[#F4F7F8]">IRON<span className="text-[#C7F36B]">FORGE</span></h2>
          <p className="text-xs text-[#ACBAC2] mt-1 tracking-widest uppercase">AI Gym Intelligence</p>
        </div>
        <h2 className="text-3xl font-bold text-[#F4F7F8]">WELCOME BACK</h2>
        <p className="text-sm text-[#ACBAC2] mb-6">Login to your smart command center</p>
        
        <button
          type="button"
          onClick={() => handleGoogleLogin()}
          className="w-full bg-[#F4F7F8] text-[#0B1014] hover:bg-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md mb-5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span className="text-sm font-bold tracking-wide">CONTINUE WITH GOOGLE</span>
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-[1px] bg-[#304149] flex-1" />
          <span className="text-[10px] font-bold text-[#ACBAC2] uppercase tracking-widest">OR LOG IN WITH EMAIL</span>
          <div className="h-[1px] bg-[#304149] flex-1" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="text" placeholder="Email or Phone Number" value={loginForm.identifier}
            onChange={e => setLoginForm({ ...loginForm, identifier: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="Password" value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="field-dark" required />
          <div className="flex justify-end -mt-1">
            <span onClick={() => setView('forgot_password')}
              className="text-xs text-[#54D8CF] cursor-pointer hover:underline font-semibold">Forgot Password?</span>
          </div>
          <button type="submit" disabled={loading} className="btn-lime w-full text-base py-4 mt-2">
            {loading ? 'Entering the forge...' : 'ENTER THE FORGE →'}
          </button>
        </form>
        <p className="mt-7 text-sm text-[#ACBAC2] text-center">New athlete?{' '}
          <span className="font-bold text-[#C7F36B] cursor-pointer hover:underline" onClick={() => setView('signup')}>Create account</span>
        </p>
      </AuthShell>
      </>
    )
  }

  if (view === 'forgot_password') {
    return (
      <AuthShell image={LOGIN_IMG} eyebrow="Account Recovery" title="RESET" highlight="CREDENTIALS."
        sub="Enter your registered email or phone number to set a new password.">
        <h2 className="text-3xl font-bold text-[#F4F7F8]">SYSTEM RECOVERY</h2>
        <p className="text-sm text-[#ACBAC2] mb-7">Reset your secure access code</p>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <input type="text" placeholder="Registered Email or Phone" value={resetForm.identifier}
            onChange={e => setResetForm({ ...resetForm, identifier: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="New Password" value={resetForm.new_password}
            onChange={e => setResetForm({ ...resetForm, new_password: e.target.value })} className="field-dark" required />
          <button type="submit" disabled={loading} className="btn-lime w-full text-base py-4 mt-2">
            {loading ? 'Processing...' : 'RESET PASSWORD →'}
          </button>
        </form>
        <p className="mt-7 text-sm text-[#ACBAC2] text-center cursor-pointer hover:text-[#C7F36B] font-bold" onClick={() => setView('login')}>← Back to Login</p>
      </AuthShell>
    )
  }

  if (view === 'signup') {
    return (
      <>
        {renderGoogleModal()}
        <AuthShell image={IRON_IMG} eyebrow="Join 48,000+ athletes" title="FORGE YOUR" highlight="ACCOUNT."
          sub="One account for training splits, nutrition, recovery and AI progression. Takes 20 seconds.">
        <h2 className="text-3xl font-bold text-[#F4F7F8]">CREATE ACCOUNT</h2>
        <p className="text-sm text-[#ACBAC2] mb-6">Your basic athlete profile</p>

        <button
          type="button"
          onClick={() => handleGoogleLogin()}
          className="w-full bg-[#F4F7F8] text-[#0B1014] hover:bg-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-md mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span className="text-sm font-bold tracking-wide">SIGN UP WITH GOOGLE</span>
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-[1px] bg-[#304149] flex-1" />
          <span className="text-[10px] font-bold text-[#ACBAC2] uppercase tracking-widest">OR REGISTER WITH EMAIL</span>
          <div className="h-[1px] bg-[#304149] flex-1" />
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
          <input type="text" placeholder="Full Name" onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} className="field-dark" required />
          <input type="email" placeholder="Email Address" onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} className="field-dark" required />
          <input type="text" placeholder="Phone Number" onChange={e => setSignupForm({ ...signupForm, phone_number: e.target.value })} className="field-dark" required />
          <input type="password" placeholder="Secure Password" onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} className="field-dark" required />
          <button type="submit" disabled={loading} className="btn-lime w-full text-base py-4 mt-1">START TRAINING →</button>
        </form>
        <p className="mt-6 text-sm text-[#ACBAC2] text-center cursor-pointer hover:text-[#C7F36B] font-bold" onClick={() => setView('login')}>← Back to Login</p>
      </AuthShell>
      </>
    )
  }

  // Main Logged-In Layout Shell

  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-[#0B1014] text-[#F4F7F8] p-4 md:p-8">
        <div className="max-w-5xl mx-auto fade-up">
          <button onClick={() => setView('dashboard')} className="text-[#C7F36B] font-bold mb-5 hover:underline text-sm inline-flex items-center gap-1">← Skip to Command Center</button>
          <div className="iron-card overflow-hidden">
            <div className="relative px-8 pt-10 pb-8 bg-[#10181D] border-b border-[#304149]">
              <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] mb-2">Athlete Diagnostics</div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#F4F7F8]">BUILD YOUR <span className="text-[#C7F36B]">ATHLETE PROFILE</span></h2>
              <p className="text-[#ACBAC2] mt-2 text-sm max-w-xl">Vitals, goals and equipment — the AI uses this to dose intensity, pick body parts and set macros safely.</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-6">
              <div className="rounded-2xl border border-[#304149] bg-[#10181D] p-5 md:p-6">
                <h3 className="text-lg font-bold text-[#F4F7F8] tracking-wide mb-1">Ⅰ — BODY METRICS &amp; VITALS</h3>
                <p className="text-xs text-[#ACBAC2] mb-4">Medical-grade baseline for safe programming</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input type="number" placeholder="Age" required value={profileForm.age}
                    onChange={e => setProfileForm({ ...profileForm, age: e.target.value })} className="field-dark" />
                  <select required value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })} className="field-dark">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <div className="flex rounded-xl overflow-hidden border border-[#304149] bg-[#10181D]">
                    <input type="number" step="0.1" placeholder="Weight" required value={profileForm.weight}
                      onChange={e => setProfileForm({ ...profileForm, weight: e.target.value })}
                      className="p-3 w-full text-sm outline-none bg-transparent text-[#F4F7F8] placeholder:text-[#6C7D86]" />
                    <select value={profileForm.weight_unit} onChange={e => setProfileForm({ ...profileForm, weight_unit: e.target.value })}
                      className="bg-[#172127] p-3 text-sm border-l border-[#304149] text-[#F4F7F8]">
                      <option>kg</option><option>lbs</option>
                    </select>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-[#304149] bg-[#10181D]">
                    <input type="number" step="0.1" placeholder="Height" required value={profileForm.height}
                      onChange={e => setProfileForm({ ...profileForm, height: e.target.value })}
                      className="p-3 w-full text-sm outline-none bg-transparent text-[#F4F7F8] placeholder:text-[#6C7D86]" />
                    <select value={profileForm.height_unit} onChange={e => setProfileForm({ ...profileForm, height_unit: e.target.value })}
                      className="bg-[#172127] p-3 text-sm border-l border-[#304149] text-[#F4F7F8]">
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

              <div className="rounded-2xl border border-[#304149] bg-[#10181D] p-5 md:p-6">
                <h3 className="text-lg font-bold text-[#F4F7F8] tracking-wide mb-1">Ⅱ — MISSION &amp; ARSENAL</h3>
                <p className="text-xs text-[#ACBAC2] mb-4">Goal, timeframe, experience and gear</p>
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

              <div className="rounded-2xl border border-[#304149] bg-[#10181D] p-5 md:p-6">
                <h3 className="text-lg font-bold text-[#F4F7F8] tracking-wide mb-1">Ⅲ — FOOD &amp; CUISINE{' '}
                  <span className="text-xs font-bold text-[#54D8CF] bg-[#54D8CF]/10 border border-[#54D8CF]/30 rounded-full px-2.5 py-0.5 ml-1 align-middle">OPTIONAL</span>
                </h3>
                <p className="text-xs text-[#ACBAC2] mb-4">AI writes your daily food chart in this cuisine</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Cuisine / Nationality</label>
                    <select value={profileForm.diet_cuisine} onChange={e => setProfileForm({ ...profileForm, diet_cuisine: e.target.value })} className="field-dark">
                      {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Food habit</label>
                    <select value={profileForm.diet_type} onChange={e => setProfileForm({ ...profileForm, diet_type: e.target.value })} className="field-dark">
                      {DIET_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-lime font-extrabold py-4 rounded-2xl w-full text-base">
                {loading ? 'Forging Profile...' : 'FORGE MY PROFILE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'tutorial') {
    return (
      <div className="min-h-screen bg-[#0B1014] text-[#F4F7F8] p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8 fade-up">
          <div className="flex items-center justify-between">
            <button onClick={() => setView('dashboard')} className="text-[#C7F36B] font-extrabold flex items-center gap-2 hover:underline text-sm uppercase tracking-wider">
              ← Back to Command Center
            </button>
            <span className="text-xs font-bold text-[#ACBAC2] bg-[#172127] border border-[#304149] px-3 py-1.5 rounded-full">
              Interactive User Manual
            </span>
          </div>

          <Panel kicker="SYSTEM TRAINING & MANUAL" title="IRONFORGE VISUAL TUTORIAL" sub="Step-by-step visual process guide to master all AI modules and hands-free camera controls.">
            <div className="grid grid-cols-1 gap-8 mt-6">
              <div className="bg-[#10181D] border border-[#304149] rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-xl bg-[#C7F36B] text-[#0B1014] flex items-center justify-center font-black text-lg">1</span>
                  <h3 className="text-xl font-bold text-[#F4F7F8]">AI Vision Hub &amp; Hands-Free Controls</h3>
                </div>
                <div className="my-4 rounded-xl overflow-hidden border border-[#304149] bg-[#0B1014]">
                  <img src="/tutorial/vision_tutorial.jpg" alt="AI Vision Process Diagram" className="w-full h-auto object-cover" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#172127] border border-[#304149] p-4 rounded-xl">
                    <div className="text-xs font-bold text-[#54D8CF] uppercase mb-1">🟢 60 FPS Biomechanics</div>
                    <div className="text-xs text-[#ACBAC2]">Tracks joints in real-time. Flashes green for form and red for posture cues.</div>
                  </div>
                  <div className="bg-[#172127] border border-[#304149] p-4 rounded-xl">
                    <div className="text-xs font-bold text-[#C7F36B] uppercase mb-1">🖐️ Hand Signal Control</div>
                    <div className="text-xs text-[#ACBAC2]">Hold up 1, 2, or 3 fingers to switch sets without touching your screen.</div>
                  </div>
                  <div className="bg-[#172127] border border-[#304149] p-4 rounded-xl">
                    <div className="text-xs font-bold text-[#FF897A] uppercase mb-1">🎤 Voice Recognition</div>
                    <div className="text-xs text-[#ACBAC2]">Say "Start set 1" or "Set 2" to trigger set tracking using AI voice.</div>
                  </div>
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
      <div className="min-h-screen bg-[#0B1014] text-[#F4F7F8] p-4 md:p-8">
        <div className="max-w-5xl mx-auto fade-up">
          <button onClick={() => setView('dashboard')} className="text-[#C7F36B] font-bold mb-4 hover:underline text-sm inline-flex items-center gap-1">← Back to Command Center</button>
          <div className="iron-card overflow-hidden">
            <div className="relative px-8 py-8 bg-[#10181D] border-b border-[#304149]">
              <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] mb-2">Daily Warfare Log</div>
              <h2 className="text-3xl font-bold text-[#F4F7F8]">LOG TODAY&apos;S <span className="text-[#C7F36B]">BATTLE</span></h2>
              <p className="text-sm text-[#ACBAC2] mt-1">Lifts, fuel and recovery — one log feeds tomorrow&apos;s AI plan.</p>
            </div>
            <form onSubmit={handleLogData} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-[#304149] bg-[#10181D] p-5">
                <div>
                  <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Workout Date</label>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={logData.date} onChange={e => setLogData({ ...logData, date: e.target.value })} className="field-dark" style={{ colorScheme: 'dark' }} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Duration</label>
                  <input type="text" placeholder="e.g. 45 mins" value={logData.workout_time} onChange={e => setLogData({ ...logData, workout_time: e.target.value })} className="field-dark" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Today&apos;s Weight</label>
                  <input type="text" placeholder="e.g. 71.5 kg" value={logData.weight_today} onChange={e => setLogData({ ...logData, weight_today: e.target.value })} className="field-dark" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#ACBAC2] uppercase tracking-wider block mb-1.5">Today&apos;s Height</label>
                  <input type="text" placeholder="e.g. 167 cm" value={logData.height_today} onChange={e => setLogData({ ...logData, height_today: e.target.value })} className="field-dark" />
                </div>
              </div>

              <div className="rounded-2xl border border-[#304149] bg-[#10181D] p-5">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-bold text-[#F4F7F8] text-base tracking-wide">EXERCISES COMPLETED</h3>
                  <button type="button" onClick={() => setExercises([...exercises, { selection: '', customName: '', sets: '', reps: '', weight: '' }])}
                    className="btn-lime text-xs py-1.5 px-4">+ ADD LIFT</button>
                </div>
                {exercises.map((ex, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-2.5 items-center mb-3 rounded-xl border border-[#304149] bg-[#172127] p-3">
                    {ex.selection === 'custom' ? (
                      <div className="flex w-full md:w-1/3 rounded-xl overflow-hidden border border-[#304149]">
                        <input type="text" placeholder="Custom lift..." value={ex.customName}
                          onChange={e => { const n = [...exercises]; n[index].customName = e.target.value; setExercises(n) }}
                          className="p-3 w-full text-sm outline-none bg-transparent text-[#F4F7F8]" />
                        <button type="button" onClick={() => { const n = [...exercises]; n[index].selection = ''; n[index].customName = ''; setExercises(n) }}
                          className="text-[#ACBAC2] hover:text-[#EF4444] px-4 font-bold bg-[#10181D] border-l border-[#304149]">✕</button>
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
                        className="text-[#EF4444] font-bold text-2xl px-2 hover:scale-125">×</button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={loading} className="btn-lime py-4 rounded-2xl w-full text-base">COMMIT TO RECORD →</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const needsProfile = !user?.weight || !user?.age

  return (
    <div className="flex min-h-screen bg-[#0B1014] text-[#F4F7F8]">
      {/* Desktop Sidebar */}
      <Sidebar active={view} onNav={handleNav} onLogout={handleLogout} user={user} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-20 md:pb-8 p-4 md:p-8 overflow-y-auto">
        {/* Header bar */}
        <HeaderBar 
          user={user} 
          unread={notifs.unread} 
          onBell={() => { setInboxOpen(o => !o); fetchNotifs() }} 
          onLogProgress={() => handleNav('input')}
          active={view}
          onNav={handleNav}
        />

        {/* Notifications Inbox Modal/Dropdown */}
        {inboxOpen && (
          <div className="iron-card p-5 md:p-6 mb-6 shadow-2xl fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-[#F4F7F8] tracking-wide">
                INBOX <span className="text-xs text-[#ACBAC2] font-normal">— daily notifications</span>
              </h3>
              <button onClick={() => setInboxOpen(false)} className="text-xs text-[#ACBAC2] hover:text-[#F4F7F8] bg-[#10181D] px-2.5 py-1 rounded-lg border border-[#304149]">✕ Close</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                placeholder="Search messages…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="field-dark flex-1 min-w-[150px]"
              />
              <select
                value={searchFilter}
                onChange={e => { setSearchFilter(e.target.value); setInboxDateFilter(''); setSearchTerm('') }}
                className="field-dark"
              >
                <option value="all">All</option>
                <option value="unread">Unread only</option>
                <option value="today">Today only</option>
              </select>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={markAllRead} className="text-xs font-bold text-[#C7F36B] hover:underline">Mark all read</button>
            </div>
            {notifs.items.length === 0 && (
              <p className="text-sm text-[#ACBAC2]">No messages yet — your daily AI plan will land here automatically.</p>
            )}
            <div className="space-y-2 max-h-80 overflow-auto nice-scroll">
              {filteredItems().map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition flex items-start justify-between gap-3 ${n.is_read ? 'border-[#304149] bg-[#10181D]' : 'border-[#C7F36B]/40 bg-[#172127]'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#F4F7F8] truncate">{!n.is_read && '● '}{n.title}</span>
                      <span className="text-[10px] text-[#ACBAC2] shrink-0">{String(n.created_at || '').slice(0, 16)}</span>
                    </div>
                    <p className="text-xs text-[#ACBAC2] mt-1.5 leading-relaxed">{n.body}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                    className="p-1.5 rounded-lg text-xs font-bold text-[#FF897A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/30 transition shrink-0"
                    title="Delete notification"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View switching */}
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

        {view === 'discomfort' && (
          <div className="mb-8">
            <DiscomfortHub 
              user={user} 
              onClose={() => setView('dashboard')} 
              onPlanGenerated={() => { setView('dashboard'); generatePlan(); }}
            />
          </div>
        )}

        {needsProfile && view === 'dashboard' && (
          <div className="mb-6 rounded-2xl border border-[#FF897A]/40 bg-[#FF897A]/10 p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#FF897A] font-bold text-base">ATHLETE PROFILE INCOMPLETE</h3>
              <p className="text-[#ACBAC2] text-sm mt-0.5">Complete vitals so the AI can dose training safely.</p>
            </div>
            <button onClick={() => setView('profile')} className="btn-lime text-xs py-2 px-5">COMPLETE NOW →</button>
          </div>
        )}

        {/* DASHBOARD VIEW (Matching visual reference concept image) */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="iron-card relative overflow-hidden p-6 md:p-8 min-h-[220px]">
              {/* Full height right-side image with gradient mask dissolve */}
              <div className="absolute top-0 bottom-0 right-0 w-1/2 hidden md:block pointer-events-none overflow-hidden">
                <img src={HERO_IMG} alt="Gym Athlete" className="w-full h-full object-cover object-center" />
                <div 
                  className="absolute inset-0" 
                  style={{
                    background: 'linear-gradient(to right, #172127 0%, rgba(23, 33, 39, 0.75) 35%, transparent 80%)'
                  }}
                />
              </div>

              <div className="relative z-10 max-w-xl space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-[#54D8CF] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#54D8CF] animate-pulse" /> TODAY&apos;S TRAINING
                </div>

                <h2 className="text-3xl md:text-4xl font-extrabold text-[#F4F7F8] leading-tight">
                  Train with <span className="text-[#C7F36B]">intention.</span>
                </h2>

                <p className="text-lg font-bold text-[#F4F7F8]">
                  {todayMuscles.length ? todayMuscles.join(' + ') : (mySplit?.split_label || 'Full Body / Recovery')}
                </p>

                <div className="flex items-center gap-3 text-xs font-semibold text-[#ACBAC2] flex-wrap">
                  <span className="flex items-center gap-1.5 bg-[#10181D] border border-[#304149] px-3 py-1.5 rounded-xl">
                    🎯 {user?.goal || 'Build muscle'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#10181D] border border-[#304149] px-3 py-1.5 rounded-xl">
                    🏋️ {user?.equipment || 'Full gym'}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button onClick={generatePlan} disabled={loading} className="btn-lime text-sm py-3 px-6">
                    {loading ? 'ANALYZING...' : 'Generate AI plan →'}
                  </button>
                  <button onClick={() => setView('split')} className="btn-outline text-sm py-3 px-6">
                    Edit split
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Metric Cards Row (Sessions, Days/week, Goal) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="iron-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] text-xl shrink-0">
                  📅
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#ACBAC2]">Sessions</div>
                  <div className="text-2xl font-black text-[#F4F7F8]">
                    {history.length > 0 ? history.length : (rawHistory.length || 12)}
                  </div>
                </div>
              </div>

              <div className="iron-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] text-xl shrink-0">
                  📊
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#ACBAC2]">Days / week</div>
                  <div className="text-2xl font-black text-[#F4F7F8]">
                    {mySplit?.days_per_week ?? (todayMuscles.length ? 4 : 3)}
                  </div>
                </div>
              </div>

              <div className="iron-card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] text-xl shrink-0">
                  🎯
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#ACBAC2]">Goal</div>
                  <div className="text-xl font-bold text-[#F4F7F8] truncate max-w-[160px]">
                    {user?.goal || 'Build muscle'}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Chart + AI Plan Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Training Volume Chart (8 cols on lg) */}
              <div className="lg:col-span-7 iron-card p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#54D8CF]">🏋️</span>
                    <h3 className="text-lg font-bold text-[#F4F7F8]">Training volume</h3>
                  </div>

                  {/* Filter Controls: Weekly / Monthly */}
                  <div className="flex items-center gap-1 bg-[#10181D] border border-[#304149] p-1 rounded-xl">
                    <button
                      onClick={() => setChartTimeframe('weekly')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        chartTimeframe === 'weekly' ? 'bg-[#54D8CF] text-[#0B1014]' : 'text-[#ACBAC2] hover:text-[#F4F7F8]'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setChartTimeframe('monthly')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        chartTimeframe === 'monthly' ? 'bg-[#54D8CF] text-[#0B1014]' : 'text-[#ACBAC2] hover:text-[#F4F7F8]'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getFilteredChartHistory()}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#54D8CF" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#54D8CF" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#304149" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#ACBAC2" fontSize={11} tickLine={false} />
                      <YAxis stroke="#ACBAC2" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#10181D',
                          borderColor: '#304149',
                          borderRadius: '12px',
                          color: '#F4F7F8',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        name="Volume (kg)"
                        stroke="#54D8CF"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorVolume)"
                        dot={{ r: 4, fill: '#54D8CF' }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Your AI Plan Panel (5 cols on lg) */}
              <div className="lg:col-span-5 iron-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[#C7F36B]">📄</span>
                      <div>
                        <h3 className="text-lg font-bold text-[#F4F7F8]">Your AI plan</h3>
                        <p className="text-xs text-[#ACBAC2]">Your next workout + meal plan</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 my-4">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#10181D] border border-[#304149]">
                      <span className="text-sm font-semibold text-[#F4F7F8]">Use my split</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={useSplit}
                          onChange={(e) => setUseSplit(e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#10181D] border border-[#304149]">
                      <div className="text-xs text-[#ACBAC2] mb-1">Focus</div>
                      <div className="text-sm font-bold text-[#F4F7F8]">
                        {todayMuscles.length ? todayMuscles.join(' + ') : 'Full Body / Recovery'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="btn-lime w-full text-sm py-3.5 mt-2"
                >
                  {loading ? 'ANALYZING...' : 'Generate plan →'}
                </button>
              </div>
            </div>

            {/* Bottom Row: Energy Overview, AI Vision, Recovery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Energy Overview */}
              <div className="iron-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[#FF897A]">🔥</span>
                    <h3 className="text-lg font-bold text-[#F4F7F8]">Energy overview</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center my-2">
                    <div className="p-2.5 rounded-xl bg-[#10181D] border border-[#304149]">
                      <div className="text-[10px] font-bold text-[#ACBAC2] uppercase">Workout burn</div>
                      <div className="text-xl font-extrabold text-[#FF897A] mt-1">{burn}</div>
                      <div className="text-[10px] text-[#ACBAC2]">kcal</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#10181D] border border-[#304149]">
                      <div className="text-[10px] font-bold text-[#ACBAC2] uppercase">Food intake</div>
                      <div className="text-xl font-extrabold text-[#54D8CF] mt-1">{intake !== null ? intake : 0}</div>
                      <div className="text-[10px] text-[#ACBAC2]">kcal</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#10181D] border border-[#304149]">
                      <div className="text-[10px] font-bold text-[#ACBAC2] uppercase">Net</div>
                      <div className="text-xl font-extrabold text-[#F4F7F8] mt-1">
                        {net !== null ? (net >= 0 ? `+${net}` : `${net}`) : 0}
                      </div>
                      <div className="text-[10px] text-[#ACBAC2]">kcal</div>
                    </div>
                  </div>
                </div>

                {verdict && (
                  <div className={`text-xs font-semibold p-2.5 rounded-xl border mt-3 ${verdict.c}`}>
                    {verdict.t}
                  </div>
                )}
              </div>

              {/* AI Vision Quick Link */}
              <div className="iron-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#54D8CF]">📷</span>
                    <h3 className="text-lg font-bold text-[#F4F7F8]">AI Vision</h3>
                  </div>
                  <p className="text-xs text-[#ACBAC2] mb-4">Get real-time feedback with AI.</p>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setView('vision')}
                      className="w-full p-3 rounded-xl bg-[#10181D] border border-[#304149] hover:border-[#54D8CF] transition text-left flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F4F7F8]">Form coach</div>
                        <div className="text-[10px] text-[#ACBAC2]">Pose tracking for better form</div>
                      </div>
                      <span className="text-xs text-[#54D8CF]">›</span>
                    </button>

                    <button
                      onClick={() => setView('vision')}
                      className="w-full p-3 rounded-xl bg-[#10181D] border border-[#304149] hover:border-[#54D8CF] transition text-left flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#F4F7F8]">Food scanner</div>
                        <div className="text-[10px] text-[#ACBAC2]">Scan meals and track intake</div>
                      </div>
                      <span className="text-xs text-[#54D8CF]">›</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recovery / Discomfort Quick Link */}
              <div className="iron-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#FF897A]">🩺</span>
                    <h3 className="text-lg font-bold text-[#F4F7F8]">Recovery</h3>
                  </div>
                  <p className="text-xs text-[#ACBAC2] mb-4">Listen to your body.</p>

                  <button
                    onClick={() => setView('discomfort')}
                    className="w-full p-4 rounded-xl bg-[#10181D] border border-[#304149] hover:border-[#FF897A] transition text-left flex items-center justify-between mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg text-[#FF897A]">📈</span>
                      <span className="text-xs font-bold text-[#F4F7F8]">Report discomfort</span>
                    </div>
                    <span className="text-xs text-[#FF897A]">›</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Generated Plan Display (If plan is active) */}
            {plan && (
              <div className="iron-card p-6 space-y-4 fade-up">
                <div className="flex items-center justify-between border-b border-[#304149] pb-4">
                  <h3 className="text-xl font-bold text-[#C7F36B]">GENERATED WORKOUT &amp; DIET PLAN</h3>
                  <span className="text-xs text-[#ACBAC2] bg-[#10181D] border border-[#304149] px-3 py-1 rounded-xl">
                    {plan.workout_plan?.day || 'Today'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Workout details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[#F4F7F8] uppercase tracking-wider">Exercises Focus</h4>
                    <p className="text-xs text-[#54D8CF] font-semibold">{plan.workout_plan?.focus}</p>

                    <div className="space-y-2">
                      {(plan.workout_plan?.exercises || []).map((ex, i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#10181D] border border-[#304149] flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-[#F4F7F8]">{ex.name}</div>
                            <div className="text-[#ACBAC2]">{ex.sets} sets × {ex.reps}</div>
                          </div>
                          <span className="font-bold text-[#C7F36B]">{ex.sets}×{ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diet details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[#F4F7F8] uppercase tracking-wider">Nutrition &amp; Meals</h4>
                    <p className="text-xs text-[#ACBAC2] font-semibold">
                      Target Calories: {plan.diet_chart?.daily_calories || plan.diet_chart?.calories || 2100} kcal
                    </p>

                    <div className="space-y-2">
                      {(plan.diet_chart?.meals || []).map((m, i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#10181D] border border-[#304149] text-xs">
                          <div className="font-bold text-[#C7F36B]">{m.name || `Meal ${i+1}`}</div>
                          <div className="text-[#F4F7F8] font-medium mt-1">{m.meal || (m.items || []).map(it => it.item || it.name).join(' • ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav active={view} onNav={handleNav} />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 fade-up bg-[#172127] border border-[#C7F36B] text-[#F4F7F8] px-4 py-3 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
