// Shared premium AI-GYM theme primitives (dark + gold, formal massive look)
export const HERO_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop';
export const DARK_GYM_IMG =
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1920&auto=format&fit=crop';
export const IRON_IMG =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1920&auto=format&fit=crop';
// Login hero: athlete hoisting a barbell overhead — dark, dramatic, machine-like
export const LOGIN_IMG =
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=1920&auto=format&fit=crop';

export function Brand({ compact = false }) {
  return (<div className="flex items-center gap-3">
  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-black text-zinc-950 shrink-0"
  style={{ background: 'linear-gradient(135deg,#fde047,#f59e0b)', boxShadow: '0 8px 24px rgba(250,204,21,.35)' }}>
  AI
  </div>
  <div>
  <div className={`font-display font-700 font-bold text-white leading-none tracking-wide ${compact ? 'text-xl' : 'text-2xl'}`}>
  IRON<span className="gold-text">FORGE</span>
  </div>
  <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase mt-1">
  AI Gym Intelligence
  </div>
  </div>
  </div>
);
}

export function AuthShell({ image, eyebrow, title, highlight, sub, children, wide = false }) {
  return (<div className="min-h-screen relative flex items-center justify-center p-4 md:p-8 overflow-hidden"
  style={{
  backgroundImage: `linear-gradient(115deg, rgba(9,9,11,.96) 20%, rgba(9,9,11,.78) 55%, rgba(9,9,11,.55) 100%), url('${image}')`,
  backgroundSize: 'cover', backgroundPosition: 'center',
  }}>
  {/* gold top line */}
  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
  <div className="relative w-full fade-up" style={{ maxWidth: wide ? 1120 : 960 }}>
  <div className="relative grid md:grid-cols-[13fr_8fr] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
  style={{ background: 'rgba(10,10,12,.88)', backdropFilter: 'blur(20px)' }}>
  {/* Left brand panel */}
  <div className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
  style={{
  backgroundImage: `linear-gradient(180deg, rgba(9,9,11,.5), rgba(9,9,11,.88)), url('${image}')`,
  backgroundSize: 'cover', backgroundPosition: 'center',
  // melt the photo's right edge into the black panel (no hard seam)
  maskImage: 'linear-gradient(to right, black 62%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to right, black 62%, transparent 100%)',
  }}>
  <Brand />
  <div>
  <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1.5 mb-4">
  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> {eyebrow}
  </div>
  <h2 className="font-display text-4xl font-bold text-white leading-tight">
  {title} <span className="gold-text">{highlight}</span>
  </h2>
  <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{sub}</p>
  <div className="flex gap-6 mt-8">
  {[['2M+', 'Lifts logged'], ['48K', 'Athletes'], ['99%', 'Plan adherence']].map(([v, l]) => (<div key={l}>
  <div className="font-display text-2xl font-bold text-white">{v}</div>
  <div className="text-[11px] text-zinc-500 uppercase tracking-wider">{l}</div>
  </div>
))}
  </div>
  </div>
  <div className="text-[11px] text-zinc-500">Private • Doctor-reviewed • AI-personalized</div>
  </div>
  {/* Melted blur seam — photo dissolves into black (desktop only) */}
  <div aria-hidden="true" className="hidden md:block pointer-events-none absolute inset-y-0"
  style={{
  left: 'calc(62% - 115px)', width: 130,
  background: 'linear-gradient(to right, rgba(10,10,12,0) 0%, rgba(10,10,12,.55) 45%, rgba(10,10,12,.95) 100%)',
  backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
  maskImage: 'linear-gradient(to right, transparent, black 35%, black 75%, transparent)',
  WebkitMaskImage: 'linear-gradient(to right, transparent, black 35%, black 75%, transparent)',
  }} />
  {/* Right form panel */}
  <div className="relative p-7 md:p-9 md:-ml-8">{children}</div>
  </div>
  </div>
  </div>
);
}

export function TopBar({ user, onNav, onLogout, active, unread = 0, onBell }) {
  const btn = (id, label, primary = false) => (<button key={id} onClick={() => onNav(id)}
  className={`font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 border ${
  active === id
  ? 'text-zinc-950 border-transparent'
  : 'text-zinc-200 border-white/10 bg-white/5 hover:bg-white/10'
  }`}
  style={active === id ? { background: 'linear-gradient(135deg,#fde047,#f59e0b)' } : undefined}>
  {label}
  </button>
);
  return (<header className="relative glass rounded-3xl p-5 md:p-6 mb-8 shadow-2xl overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
  <div className="flex flex-wrap items-center justify-between gap-5">
  <div className="flex items-center gap-5">
  <Brand compact />
  <div className="hidden lg:block w-px h-12 bg-white/10" />
  <div className="hidden lg:block">
  <h1 className="font-display text-3xl font-bold text-white leading-none">
  WELCOME BACK, <span className="gold-text">{(user?.name || 'ATHLETE').toUpperCase()}</span>
  </h1>
  <p className="text-sm text-zinc-400 mt-1.5">
  {user?.goal || 'Build Muscle'} • {user?.experience_level || 'Beginner'} • {user?.equipment || 'Full Gym'}
  </p>
  </div>
  </div>
  <div className="flex gap-2.5 flex-wrap items-center">
  {btn('profile', 'Profile')}
  {btn('guide', 'Muscle Guide')}
  {btn('split', 'Workout Split')}
  <button onClick={onBell} title="Notifications — always delivered, no keys needed"
  className="relative font-bold text-sm px-4 py-2.5 rounded-xl text-zinc-200 border border-white/10 bg-white/5 hover:bg-white/10 transition">
  Inbox
  {unread > 0 && (<span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-extrabold text-zinc-950 flex items-center justify-center"
  style={{ background: 'linear-gradient(135deg,#fde047,#f59e0b)' }}>{unread > 99 ? '99+' : unread}</span>
)}
  </button>
  {btn('input', 'Log Progress')}
  <button onClick={onLogout}
  className="font-bold text-sm px-5 py-2.5 rounded-xl text-zinc-400 border border-white/10 hover:bg-white/5 transition">
  Logout
  </button>
  </div>
  </div>
  </header>
);
}

export function Panel({ title, sub, kicker, action, children, className = '' }) {
  return (<section className={`glass rounded-3xl p-6 md:p-8 shadow-xl ${className}`}>
  {(kicker || title) && (<div className="flex items-start justify-between gap-4 mb-6">
  <div>
  {kicker && (<div className="text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-400 mb-2">{kicker}</div>
)}
  {title && <h2 className="font-display text-2xl font-bold text-white tracking-wide">{title}</h2>}
  {sub && <p className="text-sm text-zinc-400 mt-1">{sub}</p>}
  </div>
  {action}
  </div>
)}
  {children}
  </section>
);
}
