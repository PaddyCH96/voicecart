'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, FolderOpen, CreditCard, Settings, LogOut, Menu, X, Mic, Video, Moon, Sun, Share2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/omnipost', icon: Share2, label: 'OmniPost Free' },
  { href: '/assets', icon: FolderOpen, label: 'Assets' },
  { href: '/subscription', icon: CreditCard, label: 'Plan' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('vc-theme') === 'dark') {
      document.documentElement.classList.add('dark');
      return true;
    }
    return false;
  });

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('vc-theme', !dark ? 'dark' : 'light');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0A0A0A]">
      <aside className="hidden md:flex flex-col w-56 border-r border-[#F0F0F0] dark:border-[#1F1F1F] p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-[8px] bg-[#0A0A0A] dark:bg-white flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? '#0A0A0A' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-[14px] font-medium dark:text-white">VoiceCart</span>
        </div>

        <div className="flex flex-col gap-1.5 mb-6">
          <button onClick={() => router.push('/record')} className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] hover:opacity-90 transition-opacity">
            <Mic size={14} /> New Audio Ad
          </button>
          <button onClick={() => router.push('/video/new')} className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium border border-[#F0F0F0] dark:border-[#2A2A2A] text-[#525252] dark:text-[#A3A3A3] hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] transition-colors">
            <Video size={14} /> New Video Ad
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] transition-colors ${
                  active
                    ? 'bg-[#F5F5F5] dark:bg-[#1A1A1A] font-medium text-[#0A0A0A] dark:text-white'
                    : 'text-[#737373] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A]'
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[#F0F0F0] dark:border-[#1F1F1F]">
          <button onClick={toggleDark} className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] text-[#737373] hover:text-[#0A0A0A] dark:hover:text-white w-full transition-colors">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-[#E8590C] flex items-center justify-center text-[10px] text-white font-medium">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#0A0A0A] dark:text-white truncate">{user.name || user.phone || 'User'}</p>
              <p className="text-[10px] text-[#A3A3A3] capitalize">{user.plan || 'free'} plan</p>
            </div>
            <button onClick={logout} className="text-[#A3A3A3] hover:text-[#DC2626] transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#F0F0F0] dark:border-[#1F1F1F] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-[#0A0A0A] dark:bg-white flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={dark ? '#0A0A0A' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-[13px] font-medium dark:text-white">VoiceCart</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-8 h-8 flex items-center justify-center">
          {mobileOpen ? <X size={18} className="dark:text-white" /> : <Menu size={18} className="dark:text-white" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 right-4 w-48 bg-white dark:bg-[#171717] rounded-[14px] border border-[#F0F0F0] dark:border-[#2A2A2A] shadow-lg p-2 a-scale" onClick={(e) => e.stopPropagation()}>
            {navItems.map(item => (
              <button key={item.href} onClick={() => { router.push(item.href); setMobileOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] w-full ${pathname === item.href ? 'bg-[#F5F5F5] dark:bg-[#2A2A2A] font-medium text-[#0A0A0A] dark:text-white' : 'text-[#737373]'}`}>
                <item.icon size={14} />{item.label}
              </button>
            ))}
            <div className="my-1 h-px bg-[#F0F0F0] dark:bg-[#2A2A2A]" />
            <button onClick={toggleDark} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] text-[#737373] w-full">
              {dark ? <Sun size={14} /> : <Moon size={14} />}{dark ? 'Light' : 'Dark'}
            </button>
            <button onClick={logout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] text-[#DC2626] w-full">
              <LogOut size={14} />Sign out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 md:p-0 pt-14">
        {children}
      </main>
    </div>
  );
}
