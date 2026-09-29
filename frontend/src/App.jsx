import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const EXERCISE_DB = {
  "Chest": ["Bench Press", "Incline Dumbbell Press", "Push-ups", "Cable Crossovers", "Chest Dip"],
  "Back": ["Pull-ups", "Barbell Row", "Lat Pulldown", "Deadlift", "Seated Cable Row"],
  "Legs": ["Barbell Squat", "Leg Press", "Walking Lunges", "Leg Extensions", "Romanian Deadlift", "Calf Raises"],
  "Shoulders": ["Overhead Press", "Lateral Raises", "Front Raises", "Face Pulls", "Upright Row"],
  "Arms": ["Barbell Bicep Curls", "Tricep Pushdowns", "Hammer Curls", "Skull Crushers"],
  "Core": ["Plank", "Crunches", "Leg Raises", "Russian Twists", "Ab Roller"]
};

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('login')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  
  // Basic Signup
  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone_number: '', password: '' })

  // Detailed Health Profile (After Login)
  const [profileForm, setProfileForm] = useState({
      goal: 'Build Muscle', target_timeframe: '12 weeks', experience_level: 'Beginner', equipment: 'Full Gym', notification_time: '06:00',
      age: '', gender: 'Male', weight: '', weight_unit: 'kg', height: '', height_unit: 'cm', blood_pressure: '', blood_group: 'O+', medical_conditions: ''
  })

  // Unified Log State
  const [logData, setLogData] = useState({ 
      date: '', notes: '', workout_time: '', 
      supplements: '', diet_followed: '', 
      weight_today: '', height_today: '' 
  })
  
  const [exercises, setExercises] = useState([{ selection: '', customName: '', sets: '', reps: '', weight: '' }])

  useEffect(() => {
    if (user) {
      fetchHistory()
      // Pre-fill profile form if user already has data
      setProfileForm(prev => ({
          ...prev,
          goal: user.goal || 'Build Muscle',
          target_timeframe: user.target_timeframe || '',
          experience_level: user.experience_level || 'Beginner',
          equipment: user.equipment || 'Full Gym',
          age: user.age || '',
          gender: user.gender || 'Male',
          blood_pressure: user.blood_pressure || '',
          medical_conditions: user.medical_conditions || ''
      }))
    }
  }, [user])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:8000/users/${user.id}/history`)
      const data = await res.json()
      
      const formatted = data.map((d, i) => ({
        date: d.workout_data?.date || `Day ${i+1}`,
        volume: d.workout_data?.volume || 0
      }))
      
      if (formatted.length === 0) setHistory([ { date: 'No Data', volume: 0 } ])
      else setHistory(formatted)
    } catch(e) { console.error(e) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/login/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(loginForm)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to log in.')
      }
      const data = await res.json()
      setUser(data)
      setView('dashboard')
    } catch (err) { alert(err.message) }
    setLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/users/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(signupForm)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to sign up.')
      }
      const data = await res.json()
      setUser(data)
      setView('profile') // Immediately take them to complete profile
    } catch (err) { alert(err.message) }
    setLoading(false)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
        ...profileForm,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        weight: profileForm.weight ? `${profileForm.weight} ${profileForm.weight_unit}` : null,
        height: profileForm.height ? `${profileForm.height} ${profileForm.height_unit}` : null,
    }
    delete payload.weight_unit
    delete payload.height_unit
    
    try {
      const res = await fetch(`http://localhost:8000/users/${user.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to update profile.')
      const updatedUser = await res.json()
      setUser(updatedUser)
      setView('dashboard')
      alert("Health Profile Updated Successfully!")
    } catch (err) { alert(err.message) }
    setLoading(false)
  }

  const handleLogData = async (e) => {
    e.preventDefault()
    setLoading(true)

    for (let ex of exercises) {
        let name = ex.selection === 'custom' ? ex.customName : ex.selection;
        // Exercises are technically optional if they only want to log diet for a rest day
        if (name && name.trim().length < 3) {
            alert("Please select a valid exercise or type a custom exercise name (at least 3 characters long).");
            setLoading(false);
            return;
        }
    }
    
    const calcVolume = exercises.reduce((acc, curr) => {
        return acc + ((Number(curr.sets) || 0) * (Number(curr.reps) || 0) * (Number(curr.weight) || 0))
    }, 0)

    try {
      // 1. Log the unified history
      await fetch(`http://localhost:8000/log_history/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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

      // 2. Auto-update user profile weight/height if provided in log
      const userUpdatePayload = {}
      if (logData.weight_today) userUpdatePayload.weight = logData.weight_today
      if (logData.height_today) userUpdatePayload.height = logData.height_today
      
      if (Object.keys(userUpdatePayload).length > 0) {
          const res = await fetch(`http://localhost:8000/users/${user.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(userUpdatePayload)
          })
          const updatedUser = await res.json()
          setUser(updatedUser)
      }

      alert(`Daily Progress Logged successfully! AI is tracking your data.`)
      setView('dashboard')
      setExercises([{ selection: '', customName: '', sets: '', reps: '', weight: '' }])
      setLogData({ date: '', notes: '', workout_time: '', supplements: '', diet_followed: '', weight_today: '', height_today: '' })
      fetchHistory()
    } catch (err) { alert("Failed to log data") }
    setLoading(false)
  }

  const generatePlan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/generate_plan/?user_id=${user.id}&plan_type=1-day`, { method: 'POST' })
      const data = await response.json()
      setPlan(data)
    } catch (error) { alert("Error generating plan.") }
    setLoading(false)
  }

  // --- VIEWS ---

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-200">
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-96 text-center transform transition-all hover:scale-105 duration-300">
          <h2 className="text-4xl font-extrabold text-blue-600 mb-2">FitAI Pro</h2>
          <p className="text-sm text-gray-500 mb-8">Login to your smart dashboard</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-5 text-left">
            <input type="text" placeholder="Email or Phone Number" value={loginForm.identifier} onChange={e=>setLoginForm({...loginForm, identifier: e.target.value})} className="p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-shadow shadow-sm" required />
            <div>
                <input type="password" placeholder="Password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password: e.target.value})} className="p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-shadow shadow-sm" required />
                <div className="flex justify-end mt-2"><span onClick={() => setView('forgot_password')} className="text-xs text-blue-500 cursor-pointer hover:text-blue-700 font-semibold transition-colors">Forgot Password?</span></div>
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white font-extrabold py-4 rounded-xl hover:bg-blue-700 mt-2 shadow-lg hover:shadow-blue-500/50 transition-all duration-300">{loading ? 'Loading...' : 'Log In'}</button>
          </form>
          <p className="mt-8 text-sm text-gray-500">Don't have an account? <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => setView('signup')}>Sign up</span></p>
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-200">
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-96 text-center">
          <h2 className="text-4xl font-extrabold text-blue-600 mb-2">FitAI Pro</h2>
          <p className="text-sm text-gray-500 mb-8">Create your basic account</p>
          <form onSubmit={handleSignup} className="flex flex-col gap-4 text-left">
            <input type="text" placeholder="Full Name" onChange={e=>setSignupForm({...signupForm, name: e.target.value})} className="p-4 border border-gray-300 rounded-xl w-full" required />
            <input type="email" placeholder="Email Address" onChange={e=>setSignupForm({...signupForm, email: e.target.value})} className="p-4 border border-gray-300 rounded-xl w-full" required />
            <input type="text" placeholder="Phone Number" onChange={e=>setSignupForm({...signupForm, phone_number: e.target.value})} className="p-4 border border-gray-300 rounded-xl w-full" required />
            <input type="password" placeholder="Secure Password" onChange={e=>setSignupForm({...signupForm, password: e.target.value})} className="p-4 border border-gray-300 rounded-xl w-full" required />
            
            <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg mt-2">Sign Up</button>
          </form>
          <p className="mt-6 text-sm text-gray-500 cursor-pointer hover:text-blue-600 font-bold" onClick={() => setView('login')}>← Back to Login</p>
        </div>
      </div>
    )
  }

  if (view === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-200 py-10">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl">
          <button onClick={()=>setView('dashboard')} className="text-blue-600 font-bold mb-6 hover:underline">← Skip to Dashboard</button>
          <h2 className="text-4xl font-extrabold text-blue-600 mb-2 text-center">Complete Your Health Profile</h2>
          <p className="text-center text-gray-500 mb-8 text-sm">Fill this out so the AI can generate accurate, safe routines.</p>
          
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 shadow-inner">
              <h3 className="font-bold text-blue-800 mb-4 border-b border-blue-200 pb-2">Body Metrics & Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <input type="number" placeholder="Age" required value={profileForm.age} onChange={e=>setProfileForm({...profileForm, age: e.target.value})} className="p-3 border rounded-lg w-full text-sm" />
                <select required value={profileForm.gender} onChange={e=>setProfileForm({...profileForm, gender: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white">
                    <option>Male</option><option>Female</option><option>Other</option>
                </select>
                <div className="flex border rounded-lg overflow-hidden bg-white">
                  <input type="number" step="0.1" placeholder="Weight" required value={profileForm.weight} onChange={e=>setProfileForm({...profileForm, weight: e.target.value})} className="p-3 w-full text-sm outline-none" />
                  <select value={profileForm.weight_unit} onChange={e=>setProfileForm({...profileForm, weight_unit: e.target.value})} className="bg-gray-100 p-3 text-sm border-l"><option>kg</option><option>lbs</option></select>
                </div>
                <div className="flex border rounded-lg overflow-hidden bg-white">
                  <input type="number" step="0.1" placeholder="Height" required value={profileForm.height} onChange={e=>setProfileForm({...profileForm, height: e.target.value})} className="p-3 w-full text-sm outline-none" />
                  <select value={profileForm.height_unit} onChange={e=>setProfileForm({...profileForm, height_unit: e.target.value})} className="bg-gray-100 p-3 text-sm border-l"><option>cm</option><option>feet</option><option>inch</option></select>
                </div>
                <select required value={profileForm.blood_group} onChange={e=>setProfileForm({...profileForm, blood_group: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white">
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <input type="text" required placeholder="Blood Pressure (e.g. 120/80)" value={profileForm.blood_pressure} onChange={e=>setProfileForm({...profileForm, blood_pressure: e.target.value})} className="p-3 border rounded-lg w-full text-sm" />
                  <input type="text" required placeholder="Medical Conditions (Type 'None' if clear)" value={profileForm.medical_conditions} onChange={e=>setProfileForm({...profileForm, medical_conditions: e.target.value})} className="p-3 border rounded-lg w-full text-sm" />
              </div>
            </div>

            <div className="p-6 bg-green-50 rounded-xl border border-green-100 shadow-inner">
              <h3 className="font-bold text-green-800 mb-4 border-b border-green-200 pb-2">Timebound Goal & Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select required value={profileForm.goal} onChange={e=>setProfileForm({...profileForm, goal: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white">
                  <option>Build Muscle</option><option>Lose Weight</option><option>Flexibility</option>
                </select>
                <input type="text" required placeholder="Target Timeframe (e.g. 30 days)" value={profileForm.target_timeframe} onChange={e=>setProfileForm({...profileForm, target_timeframe: e.target.value})} className="p-3 border border-purple-300 rounded-lg w-full text-sm bg-purple-50" />
                <select required value={profileForm.experience_level} onChange={e=>setProfileForm({...profileForm, experience_level: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white">
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
                <select required value={profileForm.equipment} onChange={e=>setProfileForm({...profileForm, equipment: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white">
                  <option>Full Gym</option><option>Dumbbells Only</option><option>Bodyweight</option>
                </select>
                <input type="time" required value={profileForm.notification_time} onChange={e=>setProfileForm({...profileForm, notification_time: e.target.value})} className="p-3 border rounded-lg w-full text-sm bg-white" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-5 rounded-xl w-full mt-4 transition-all duration-300 text-xl shadow-xl hover:shadow-blue-500/50">
              {loading ? 'Saving...' : 'Save Health Profile 🚀'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'input') {
    return (
      <div className="min-h-screen flex flex-col items-center p-8 bg-gradient-to-br from-gray-100 to-gray-200">
        <button onClick={()=>setView('dashboard')} className="self-start text-blue-600 font-bold mb-4 hover:underline">← Back to Dashboard</button>
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold mb-2 text-gray-800">Log Daily Progress</h2>
          <p className="text-sm text-gray-500 mb-8">All your daily tracking in one place for the AI to analyze.</p>
          
          <form onSubmit={handleLogData} className="flex flex-col gap-8 text-left">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Workout Date</label>
                <input type="date" value={logData.date} onChange={e=>setLogData({...logData, date: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Workout Duration</label>
                <input type="text" placeholder="e.g. 45 mins" value={logData.workout_time} onChange={e=>setLogData({...logData, workout_time: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Today's Weight</label>
                <input type="text" placeholder="e.g. 71.5 kg" value={logData.weight_today} onChange={e=>setLogData({...logData, weight_today: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Today's Height</label>
                <input type="text" placeholder="e.g. 167 cm" value={logData.height_today} onChange={e=>setLogData({...logData, height_today: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">Exercises Completed (Optional for Rest Days)</h3>
                  <button type="button" onClick={() => setExercises([...exercises, {selection:'', customName:'', sets:'', reps:'', weight:''}])} className="text-sm bg-green-500 text-white font-bold py-2 px-4 rounded-full shadow hover:bg-green-600 transition">+ Add Exercise</button>
              </div>
              {exercises.map((ex, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-center mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      {ex.selection === 'custom' ? (
                          <div className="flex w-full md:w-1/3 bg-white border rounded-lg shadow-sm overflow-hidden">
                              <input type="text" placeholder="Custom..." value={ex.customName} onChange={e => { const newEx = [...exercises]; newEx[index].customName = e.target.value; setExercises(newEx); }} className="p-3 w-full text-sm outline-none" />
                              <button type="button" onClick={() => { const newEx = [...exercises]; newEx[index].selection = ''; newEx[index].customName = ''; setExercises(newEx); }} className="text-gray-400 hover:text-red-500 px-4 font-bold bg-gray-100 border-l">✕</button>
                          </div>
                      ) : (
                          <select value={ex.selection} onChange={e => { const newEx = [...exercises]; newEx[index].selection = e.target.value; setExercises(newEx); }} className="p-3 border rounded-lg w-full md:w-1/3 text-sm bg-white font-semibold text-gray-700 cursor-pointer shadow-sm">
                              <option value="" disabled>Select Exercise...</option>
                              {Object.keys(EXERCISE_DB).map(category => (
                                  <optgroup key={category} label={`--- ${category.toUpperCase()} ---`}>
                                      {EXERCISE_DB[category].map(name => (
                                          <option key={name} value={name}>{name}</option>
                                      ))}
                                  </optgroup>
                              ))}
                              <optgroup label="--- OTHER ---"><option value="custom">➕ Custom...</option></optgroup>
                          </select>
                      )}
                      <input type="number" placeholder="Sets" value={ex.sets} onChange={e => { const newEx = [...exercises]; newEx[index].sets = e.target.value; setExercises(newEx); }} className="p-3 border rounded-lg w-full md:w-1/6 text-sm shadow-sm" />
                      <input type="number" placeholder="Reps" value={ex.reps} onChange={e => { const newEx = [...exercises]; newEx[index].reps = e.target.value; setExercises(newEx); }} className="p-3 border rounded-lg w-full md:w-1/6 text-sm shadow-sm" />
                      <input type="number" placeholder="Weight" value={ex.weight} onChange={e => { const newEx = [...exercises]; newEx[index].weight = e.target.value; setExercises(newEx); }} className="p-3 border rounded-lg w-full md:w-1/4 text-sm shadow-sm" />
                      {exercises.length > 1 && (<button type="button" onClick={() => { const newEx = exercises.filter((_, i) => i !== index); setExercises(newEx); }} className="text-red-500 font-bold text-2xl px-2 hover:scale-125">×</button>)}
                  </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50 p-5 rounded-xl border border-green-100 shadow-inner">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">Diet Plan Followed Today</label>
                <textarea placeholder="e.g. 3 eggs, chicken and rice..." value={logData.diet_followed} onChange={e=>setLogData({...logData, diet_followed: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" rows="3"></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">Supplements Taken (Names)</label>
                <textarea placeholder="e.g. Whey Protein, Creatine 5g..." value={logData.supplements} onChange={e=>setLogData({...logData, supplements: e.target.value})} className="p-3 border rounded-lg w-full shadow-sm" rows="3"></textarea>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl w-full transition duration-300 text-xl shadow-lg mt-4">Save Daily Progress</button>
          </form>
        </div>
      </div>
    )
  }

  const isNewUser = history.length === 0 || (history.length === 1 && history[0].date === 'No Data');
  const needsProfile = !user?.weight || !user?.age;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-800">
      <header className="mb-10 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">Hello, {user?.name}!</h1>
          <p className="text-lg text-gray-500 font-medium">Your intelligent fitness dashboard.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={()=>setView('profile')} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-200">👤 Update Profile</button>
          <button onClick={()=>setView('input')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-200">➕ Log Daily Progress</button>
          <button onClick={()=>{setUser(null); setView('login')}} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl transition duration-200">Logout</button>
        </div>
      </header>

      {needsProfile && (
        <div className="mb-8 bg-yellow-100 border-l-4 border-yellow-500 p-6 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-yellow-800 font-bold text-lg">⚠️ Action Required: Incomplete Health Profile</h3>
                <p className="text-yellow-700 mt-1">Please complete your health profile so the AI can generate safe and accurate routines.</p>
            </div>
            <button onClick={()=>setView('profile')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg shadow">Complete Profile Now</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Actual Volume History</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}/>
                <Legend />
                <Line type="monotone" dataKey="volume" name="Total Volume (lbs/kg)" stroke="#3b82f6" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-center items-center text-center">
          
          {isNewUser ? (
            <>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800">Welcome to Day 1!</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">Since you are a new user, the AI will use your profile data to generate a perfect Foundation Plan to get you started.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-4">📈</div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800">Ready for Tomorrow?</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">The AI has tracked your history. It will dynamically adapt your macros and exercises to hit your target timeframe.</p>
            </>
          )}
          
          <button 
            onClick={generatePlan}
            disabled={loading || needsProfile}
            className={`font-extrabold py-4 px-8 rounded-xl transition-all duration-300 w-full text-lg ${(loading || needsProfile) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-blue-500/40'}`}
          >
            {loading ? 'Analyzing Data...' : 'Generate Next AI Plan'}
          </button>

          {plan && (
            <div className="mt-8 w-full text-left space-y-4 overflow-auto max-h-[32rem] pr-1">
              <h3 className="font-extrabold text-blue-900 text-lg">✨ Your Custom Plan is Ready!</h3>
              {plan.API_ERROR && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs p-3 rounded-lg">Showing fallback plan (AI error). Check backend terminal.</div>
              )}
              {/* Workout */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <h4 className="font-bold text-blue-900">🏋️ Workout — {plan.workout_plan?.day || 'Today'} </h4>
                <p className="text-sm text-blue-700 mb-3">{plan.workout_plan?.focus || ''}</p>
                <div className="space-y-2">
                  {(plan.workout_plan?.exercises || []).map((ex, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-gray-800">{ex.name}</div>
                        <div className="text-xs text-gray-500">{ex.sets} sets × {ex.reps}{ex.rest ? ` • Rest ${ex.rest}` : ''}</div>
                      </div>
                      <div className="text-blue-600 font-bold text-sm">{ex.sets}×{ex.reps}</div>
                    </div>
                  ))}
                  {(!plan.workout_plan?.exercises || plan.workout_plan.exercises.length === 0) && (
                    <p className="text-sm text-gray-500">No exercises found.</p>
                  )}
                </div>
              </div>
              {/* Diet */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                <h4 className="font-bold text-green-900">🥗 Diet — {plan.diet_chart?.daily_calories || plan.diet_chart?.calories || ''} {plan.diet_chart?.daily_calories || plan.diet_chart?.calories ? 'kcal' : ''}</h4>
                {(plan.diet_chart?.macros || plan.diet_chart?.protein) && (
                  <div className="flex gap-2 mt-2 mb-3 text-xs">
                    <span className="bg-white px-2 py-1 rounded border">Protein: {plan.diet_chart.macros?.protein || plan.diet_chart.protein}</span>
                    <span className="bg-white px-2 py-1 rounded border">Carbs: {plan.diet_chart.macros?.carbs || plan.diet_chart.carbs}</span>
                    <span className="bg-white px-2 py-1 rounded border">Fats: {plan.diet_chart.macros?.fats || plan.diet_chart.fats}</span>
                  </div>
                )}
                <div className="space-y-2">
                  {(plan.diet_chart?.meals || []).map((m, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-green-100">
                      <div className="font-bold text-sm text-gray-800">{m.time || m.name || `Meal ${i+1}`}</div>
                      {m.meal && <div className="text-sm text-gray-600">{m.meal}</div>}
                      {m.items && (
                        <ul className="text-xs text-gray-600 list-disc ml-4 mt-1">
                          {m.items.map((it, j) => (
                            <li key={j}>{it.item || it.name} {it.quantity ? `— ${it.quantity}` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
