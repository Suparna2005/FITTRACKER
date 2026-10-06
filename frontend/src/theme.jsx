import React from 'react';

// Shared IRONFORGE visual tokens and UI primitives

export const HERO_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop';
export const DARK_GYM_IMG =
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1920&auto=format&fit=crop';
export const IRON_IMG =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1920&auto=format&fit=crop';
export const LOGIN_IMG =
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=1920&auto=format&fit=crop';

// Brand Logo Component matching visual reference
export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      {/* Icon logo - Stylized F in shield/triangle container */}
      <div className="w-10 h-10 rounded-xl bg-[#C7F36B] flex items-center justify-center shrink-0 shadow-md">
        <svg className="w-6 h-6 text-[#0B1014]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v3.5H8.5V11H18v3.5H8.5V20H4V4z" />
        </svg>
      </div>
      <div>
        <div className={`font-black tracking-tight text-[#F4F7F8] leading-none ${compact ? 'text-lg' : 'text-xl'}`}>
          IRON<span className="text-[#C7F36B]">FORGE</span>
        </div>
        <div className="text-[9px] font-bold tracking-[0.25em] text-[#ACBAC2] uppercase mt-1">
          AI GYM INTELLIGENCE
        </div>
      </div>
    </div>
  );
}

// Icon Helper for Nav links
export function NavIcon({ name, className = "w-5 h-5" }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'split':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'vision':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'guide':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'discomfort':
    case 'recovery':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'tutorial':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'profile':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'logout':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'more':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    default:
      return null;
  }
}

// Sidebar Navigation Component (Desktop)
export function Sidebar({ active, onNav, onLogout, user }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'split', label: 'Workout Split', icon: 'split' },
    { id: 'vision', label: 'AI Vision', icon: 'vision' },
    { id: 'guide', label: 'Muscle Guide', icon: 'guide' },
    { id: 'discomfort', label: 'Recovery', icon: 'recovery' },
    { id: 'tutorial', label: 'Tutorial', icon: 'tutorial' },
  ];

  return (
    <aside className="w-64 bg-[#10181D] border-r border-[#304149] min-h-screen p-6 flex flex-col justify-between shrink-0 hidden md:flex">
      <div>
        <div className="mb-8">
          <Brand />
        </div>

        <nav className="space-y-1.5" aria-label="Main Navigation">
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C7F36B] text-[#0B1014] shadow-sm'
                    : 'text-[#ACBAC2] hover:text-[#F4F7F8] hover:bg-[#172127]'
                }`}
              >
                <NavIcon name={item.icon} className={`w-5 h-5 ${isActive ? 'text-[#0B1014]' : 'text-[#ACBAC2]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-1.5 pt-6 border-t border-[#304149]">
        <button
          onClick={() => onNav('profile')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
            active === 'profile'
              ? 'bg-[#C7F36B] text-[#0B1014]'
              : 'text-[#ACBAC2] hover:text-[#F4F7F8] hover:bg-[#172127]'
          }`}
        >
          <NavIcon name="profile" className="w-5 h-5" />
          <span>Profile</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-[#ACBAC2] hover:text-[#FF897A] hover:bg-[#172127] transition-all"
        >
          <NavIcon name="logout" className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

// Mobile Bottom Navigation Bar with More Menu and Safe-Area padding
export function MobileBottomNav({ active, onNav, onLogout }) {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const items = [
    { id: 'dashboard', label: 'Home', icon: 'dashboard' },
    { id: 'split', label: 'Split', icon: 'split' },
    { id: 'vision', label: 'Vision', icon: 'vision' },
    { id: 'profile', label: 'Profile', icon: 'profile' },
    { id: 'more', label: 'More', icon: 'more' },
  ];

  return (
    <>
      {/* Mobile More Sheet */}
      {showMoreMenu && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-[#0B1014]/80 backdrop-blur-sm flex flex-col justify-end fade-up"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="bg-[#10181D] border-t border-[#304149] rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#304149] pb-3">
              <div className="font-extrabold text-base text-[#F4F7F8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C7F36B]"></span>
                IRONFORGE MENU
              </div>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="text-xs font-bold text-[#ACBAC2] bg-[#172127] border border-[#304149] px-3 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => { setShowMoreMenu(false); onNav('guide'); }}
                className="iron-card p-4 flex flex-col items-center gap-2 text-center text-xs font-bold text-[#F4F7F8] hover:border-[#54D8CF]"
              >
                <NavIcon name="guide" className="w-6 h-6 text-[#54D8CF]" />
                <span>Muscle Guide</span>
              </button>

              <button
                onClick={() => { setShowMoreMenu(false); onNav('discomfort'); }}
                className="iron-card p-4 flex flex-col items-center gap-2 text-center text-xs font-bold text-[#F4F7F8] hover:border-[#FF897A]"
              >
                <NavIcon name="recovery" className="w-6 h-6 text-[#FF897A]" />
                <span>Recovery Hub</span>
              </button>

              <button
                onClick={() => { setShowMoreMenu(false); onNav('tutorial'); }}
                className="iron-card p-4 flex flex-col items-center gap-2 text-center text-xs font-bold text-[#F4F7F8] hover:border-[#C7F36B]"
              >
                <NavIcon name="tutorial" className="w-6 h-6 text-[#C7F36B]" />
                <span>User Tutorial</span>
              </button>

              <button
                onClick={() => { setShowMoreMenu(false); onLogout && onLogout(); }}
                className="iron-card p-4 flex flex-col items-center gap-2 text-center text-xs font-bold text-[#FF897A] hover:border-[#EF4444]"
              >
                <NavIcon name="logout" className="w-6 h-6 text-[#FF897A]" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div 
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#10181D]/95 backdrop-blur-md border-t border-[#304149] px-2 pt-2 flex justify-around items-center"
      >
        {items.map((item) => {
          const isActive = item.id === 'more' ? showMoreMenu : active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setShowMoreMenu(prev => !prev);
                } else {
                  setShowMoreMenu(false);
                  onNav(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-w-[64px] min-h-[44px] transition-all ${
                isActive ? 'text-[#C7F36B]' : 'text-[#ACBAC2]'
              }`}
            >
              <NavIcon name={item.icon} className={`w-5 h-5 ${isActive ? 'text-[#C7F36B]' : 'text-[#ACBAC2]'}`} />
              <span className="text-[11px] font-bold mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// Header Bar Component
export function HeaderBar({ user, unread = 0, onBell, onLogProgress, active, onNav }) {
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';
  
  // Format current date matching mock: Mon, 12 May 2025 style
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-2">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F4F7F8] tracking-tight">
            Your fitness, <span className="text-[#C7F36B]">in focus.</span>
          </h1>
        </div>
        <p className="text-sm font-medium text-[#ACBAC2] mt-0.5">
          Welcome back, {user?.name || 'Athlete'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[#ACBAC2] bg-[#172127] border border-[#304149] px-3.5 py-2 rounded-xl hidden sm:inline-block">
          {dateStr}
        </span>

        <button
          onClick={onLogProgress}
          className="btn-lime text-xs py-2 px-4 whitespace-nowrap"
          title="Log Today's Workout & Progress"
        >
          + Log Progress
        </button>

        {/* Notifications bell */}
        <button
          onClick={onBell}
          className="relative p-2.5 rounded-xl bg-[#172127] border border-[#304149] text-[#F4F7F8] hover:border-[#ACBAC2] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Notifications Inbox"
        >
          <svg className="w-5 h-5 text-[#F4F7F8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black bg-[#FF897A] text-[#0B1014] flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* User avatar initial */}
        <button
          onClick={() => onNav('profile')}
          className="w-10 h-10 rounded-xl bg-[#304149] text-[#F4F7F8] font-bold text-sm flex items-center justify-center border border-[#304149] hover:border-[#C7F36B] transition shrink-0"
          title="Profile Settings"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}

// Panel Card Wrapper
export function Panel({ title, sub, kicker, action, children, className = '' }) {
  return (
    <section className={`iron-card p-6 md:p-7 ${className}`}>
      {(kicker || title) && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            {kicker && (
              <div className="text-[11px] font-bold tracking-widest uppercase text-[#54D8CF] mb-1">
                {kicker}
              </div>
            )}
            {title && (
              <h2 className="text-xl md:text-2xl font-bold text-[#F4F7F8] tracking-tight">
                {title}
              </h2>
            )}
            {sub && <p className="text-xs text-[#ACBAC2] mt-1">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Auth Shell Component
export function AuthShell({ image, eyebrow, title, highlight, sub, children }) {
  return (
    <div
      className="min-h-screen bg-[#0B1014] flex items-center justify-center p-4 md:p-8"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 0%, rgba(84, 216, 207, 0.08), transparent 70%), url('${image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-5xl fade-up">
        <div className="grid md:grid-cols-12 rounded-3xl overflow-hidden border border-[#304149] bg-[#172127]/95 backdrop-blur-xl shadow-2xl">
          {/* Left brand panel */}
          <div
            className="hidden md:flex md:col-span-6 flex-col justify-between p-10 relative overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(11,16,20,.6), rgba(11,16,20,.92)), url('${image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <Brand />

            <div className="my-8">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-[#54D8CF] bg-[#54D8CF]/10 border border-[#54D8CF]/30 rounded-full px-3 py-1 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#54D8CF] animate-pulse" /> {eyebrow}
                </div>
              )}
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#F4F7F8] leading-tight">
                {title} <span className="text-[#C7F36B]">{highlight}</span>
              </h2>
              {sub && <p className="text-sm text-[#ACBAC2] mt-3 leading-relaxed">{sub}</p>}
            </div>

            <div className="text-xs font-medium text-[#ACBAC2]">
              Private • Doctor-reviewed • AI-personalized
            </div>
          </div>

          {/* Right form panel */}
          <div className="md:col-span-6 p-7 md:p-10 flex flex-col justify-center bg-[#172127]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
