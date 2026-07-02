'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Mic, Video, Clock, MoreHorizontal } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  adId?: string;
}

function computeTimeLabels(list: Project[]): Record<string, string> {
  const now = Date.now();
  const labels: Record<string, string> = {};
  for (const p of list) {
    const diff = now - new Date(p.updatedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) labels[p.id] = `${mins}m ago`;
    else {
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) labels[p.id] = `${hrs}h ago`;
      else labels[p.id] = `${Math.floor(hrs / 24)}d ago`;
    }
  }
  return labels;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLabels, setTimeLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = d.projects || [];
        setProjects(list);
        setTimeLabels(computeTimeLabels(list));
        setLoading(false);
      })
      .catch(() => setLoading(false));
    const id = setInterval(() => {
      setProjects(current => {
        setTimeLabels(computeTimeLabels(current));
        return current;
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <DashboardLayout>
      <div className="px-6 py-8 md:py-12 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 a-enter">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] dark:text-white">
              {user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-[13px] text-[#A3A3A3] mt-0.5">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              {user?.plan === 'free' && ' · Free plan (5 max)'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-8 a-enter-1">
          <button onClick={() => router.push('/record')}
            className="card-raised p-4 flex items-center gap-3 hover:border-[#D4D4D4] dark:hover:border-[#3A3A3A] transition-colors group">
            <div className="w-9 h-9 rounded-[10px] bg-[#FFF1E6] dark:bg-[#2A1A0A] flex items-center justify-center">
              <Mic size={16} className="text-[#E8590C]" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-medium dark:text-white">Audio Ad</p>
              <p className="text-[11px] text-[#A3A3A3]">Voice → AI copy</p>
            </div>
          </button>
          <button onClick={() => router.push('/video/new')}
            className="card-raised p-4 flex items-center gap-3 hover:border-[#D4D4D4] dark:hover:border-[#3A3A3A] transition-colors group">
            <div className="w-9 h-9 rounded-[10px] bg-[#EFF6FF] dark:bg-[#0A1A2A] flex items-center justify-center">
              <Video size={16} className="text-[#3B82F6]" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-medium dark:text-white">Video Ad</p>
              <p className="text-[11px] text-[#A3A3A3]">9:16 for reels</p>
            </div>
          </button>
        </div>

        <div className="a-enter-2">
          <div className="flex items-center justify-between mb-4">
            <p className="label">Projects</p>
            <button onClick={() => router.push('/record')} className="text-[12px] font-medium text-[#E8590C] flex items-center gap-1">
              <Plus size={13} /> New
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#F5F5F5] dark:bg-[#1A1A1A] flex items-center justify-center">
                <Plus size={18} className="text-[#A3A3A3]" />
              </div>
              <p className="text-[14px] font-medium dark:text-white mb-1">No projects yet</p>
              <p className="text-[12px] text-[#A3A3A3] mb-4">Create your first audio or video ad</p>
              <button onClick={() => router.push('/record')} className="btn-primary mx-auto !w-auto !px-6 !text-[13px]">
                Get started
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.map(p => (
                <button key={p.id} onClick={() => router.push(p.type === 'video' ? `/video/${p.id}` : `/preview?adId=${p.adId}`)}
                  className="card p-3.5 flex items-center gap-3 hover:border-[#D4D4D4] dark:hover:border-[#3A3A3A] transition-colors text-left w-full group">
                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${p.type === 'video' ? 'bg-[#EFF6FF] dark:bg-[#0A1A2A]' : 'bg-[#FFF1E6] dark:bg-[#2A1A0A]'}`}>
                    {p.type === 'video' ? <Video size={14} className="text-[#3B82F6]" /> : <Mic size={14} className="text-[#E8590C]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium dark:text-white truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        p.status === 'completed' ? 'bg-[#F0FDF4] text-[#16A34A] dark:bg-[#0A2A1A] dark:text-[#4ADE80]' :
                        p.status === 'processing' ? 'bg-[#FFF7ED] text-[#E8590C] dark:bg-[#2A1A0A]' :
                        'bg-[#F5F5F5] text-[#737373] dark:bg-[#1A1A1A]'
                      }`}>{p.status}</span>
                      <span className="text-[10px] text-[#A3A3A3] flex items-center gap-0.5"><Clock size={9} />{timeLabels[p.id]}</span>
                    </div>
                  </div>
                  <MoreHorizontal size={14} className="text-[#D4D4D4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
