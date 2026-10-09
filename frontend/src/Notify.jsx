import { useEffect, useState } from 'react'
import { API_URL } from './config'

export default function Notify({ onClose }) {
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [sms, setSms] = useState(true)
  const [email, setEmail] = useState(true)
  const [subject, setSubject] = useState('Your IronForge AI Plan ')
  const [message, setMessage] = useState('')
  const [useLatest, setUseLatest] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
  (async () => {
  try {
  const res = await fetch(`${API_URL}/users/`)
  const data = await res.json()
  if (Array.isArray(data)) {
  setUsers(data)
  if (data.length > 0) setUserId(String(data[0].id))
  }
  } catch { setError(`Could not reach backend (${API_URL}).`) }
  })
  }, [])

  const selected = users.find(u => String(u.id) === String(userId))

  const send = async (e) => {
  e.preventDefault()
  setSending(true); setResult(null); setError('')
  try {
  const channels = []
  if (sms) channels.push('sms')
  if (email) channels.push('email')
  const res = await fetch(`${API_URL}/notify/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  user_id: Number(userId),
  channels,
  subject,
  message: useLatest ? '' : message,
  use_latest_plan: useLatest,
  }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Send failed')
  setResult(data)
  } catch (err) { setError(err.message) }
  setSending(false)
  }

  return (<div className="glass rounded-3xl p-6 md:p-8 shadow-2xl">
  <div className="h-1 -m-6 md:-m-8 mb-6 rounded-t-3xl" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
  <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
  <div>
  <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-400 mb-1">Outreach Center</div>
  <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide"> MESSAGE & MAIL USERS</h2>
  <p className="text-sm text-zinc-400 mt-1">Send SMS, Email, or both — custom note or auto-built from the user's latest AI plan.</p>
  </div>
  {onClose && <button onClick={onClose} className="text-sm font-bold text-zinc-300 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-xl">✕ Close</button>}
  </div>

  <form onSubmit={send} className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-5">
  <div className="lg:col-span-2 space-y-4">
  <div>
  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Recipient</label>
  <select value={userId} onChange={e => setUserId(e.target.value)} className="field-dark">
  {users.map(u => (<option key={u.id} value={u.id}>{u.name} — {u.email || 'no email'} — {u.phone_number || 'no phone'}</option>
))}
  {users.length === 0 && <option>No users found</option>}
  </select>
  {selected && (<p className="text-[11px] text-zinc-500 mt-1.5">Goal: {selected.goal || '—'} • Reminder at: {selected.notification_time || '—'}</p>
)}
  </div>
  <div>
  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Channels</label>
  <div className="flex gap-2.5">
  <label className={`flex-1 flex items-center gap-2.5 rounded-2xl border-2 p-3.5 cursor-pointer transition ${sms ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
  <input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)} className="w-5 h-5 accent-yellow-400" />
  <span><span className="block font-extrabold text-zinc-100 text-sm"> SMS</span><span className="block text-[11px] text-zinc-500">via Twilio</span></span>
  </label>
  <label className={`flex-1 flex items-center gap-2.5 rounded-2xl border-2 p-3.5 cursor-pointer transition ${email ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
  <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} className="w-5 h-5 accent-yellow-400" />
  <span><span className="block font-extrabold text-zinc-100 text-sm"> Email</span><span className="block text-[11px] text-zinc-500">via SMTP</span></span>
  </label>
  </div>
  </div>
  {email && (<div>
  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Email subject</label>
  <input value={subject} onChange={e => setSubject(e.target.value)} className="field-dark" placeholder="Your IronForge AI Plan " />
  </div>
)}
  <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3.5">
  <input type="checkbox" checked={useLatest} onChange={e => setUseLatest(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-400" />
  <span>
  <span className="font-bold text-emerald-200 text-sm">Auto-build from latest AI plan</span>
  <span className="block text-[11px] text-zinc-400 mt-0.5">Workout + diet + calories composed automatically. Uncheck to write a custom message.</span>
  </span>
  </label>
  </div>

  <div className="lg:col-span-3 flex flex-col">
  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
  {useLatest ? 'Message preview (auto on send)' : 'Custom message'}
  </label>
  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12}
  disabled={useLatest} placeholder={useLatest ? 'Will be auto-composed from the latest plan at send time…' : 'Type the SMS / email body…'}
  className={`field-dark flex-1 nice-scroll ${useLatest ? 'opacity-50' : ''}`} />
  <button type="submit" disabled={sending || !userId || (!sms && !email)}
  className="gold-btn font-extrabold py-4 rounded-2xl w-full text-base mt-4">
  {sending ? 'SENDING…' : `SEND ${[sms && 'SMS', email && 'EMAIL'].filter(Boolean).join(' + ') || '—'} →`}
  </button>
  {error && <div className="text-xs font-bold text-red-300 border border-red-400/30 bg-red-400/10 rounded-xl p-3 mt-3">{error}</div>}
  {result && (<div className="text-xs border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 rounded-xl p-3.5 mt-3 space-y-1">
  <div className="font-extrabold"> Sent to {result.user}</div>
  {Object.entries(result.channels || {}).map(([ch, r]) => (<div key={ch}>• <strong className="uppercase">{ch}</strong> → {r.status}{r.to ? ` (${r.to})` : ''}{r.detail ? ` — ${r.detail}` : ''}</div>
))}
  <div className="text-emerald-200/60 text-[11px]">No SMS/Email keys? Backends mock-print to the terminal.</div>
  </div>
)}
  </div>
  </form>

  <div className="text-[11px] text-zinc-500 mt-5 border-t border-white/10 pt-4">
  Automatic: every user also gets their plan by SMS + Email daily at their <strong className="text-zinc-300">notification_time</strong> (profile) via the background scheduler — no Twilio/SMTP keys needed for testing, messages print to the backend terminal.
  </div>
  </div>
)
}
