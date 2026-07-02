'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessageType('success');
      setMessage('Settings updated successfully!');
    } catch (e) {
      setMessageType('error');
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This permanently deletes your account and all content.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/login');
    } catch (e) {
      setMessageType('error');
      setMessage(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8 a-enter">
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] dark:text-white mb-1">Account Settings</h1>
          <p className="text-[13px] text-[#A3A3A3]">Update your profile information and preferences.</p>
        </div>

        <div className="flex flex-col gap-6 a-enter-1">
          {/* Profile Card */}
          <div className="card p-6">
            <h2 className="text-[15px] font-medium dark:text-white mb-5">Profile Details</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#737373]">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent outline-none text-[14px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#737373]">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent outline-none text-[14px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#737373]">Phone Number (Unchangeable)</label>
                <input 
                  type="text" 
                  value={user?.phone || 'Not Provided'} 
                  disabled
                  className="px-3.5 py-2.5 rounded-[10px] border border-[#F0F0F0] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#1A1A1A] outline-none text-[14px] opacity-70 cursor-not-allowed"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-[#F0F0F0] dark:border-[#1F1F1F] flex items-center justify-between">
                <p className={`text-[13px] ${messageType === 'error' ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>{message}</p>
                <button onClick={handleSave} disabled={saving} className="btn-primary !w-auto !px-6">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-red-100 dark:border-red-900/30 rounded-[16px] p-6 a-enter-2">
            <h2 className="text-[15px] font-medium dark:text-white mb-2 text-red-500">Danger Zone</h2>
            <p className="text-[13px] text-[#A3A3A3] mb-5">Permanently delete your account and all of your content.</p>
            <button onClick={handleDeleteAccount} disabled={deleting} className="px-4 py-2 rounded-[8px] bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[13px] font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
