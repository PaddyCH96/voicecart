'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Play, Pause, Save, Video as VideoIcon, Image as ImageIcon, Music, Type, Clapperboard, Download, Plus, X } from 'lucide-react';

interface AssetLayer {
  id: string;
  type: 'video' | 'image' | 'text' | 'audio';
  content: string; // URL or text
  start: number;
  end: number;
}

/* eslint-disable @next/next/no-img-element */
export default function VideoEditorPage() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  interface ProjectData {
    id: string;
    name: string;
    status: string;
    renderUrl: string | null;
    assets?: { layers?: AssetLayer[] };
  }

  const [project, setProject] = useState<ProjectData | null>(null);
  const [layers, setLayers] = useState<AssetLayer[]>([]);
  const [status, setStatus] = useState<string>('draft');
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'text'>('media');
  
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.project) {
          setProject(d.project);
          setStatus(d.project.status);
          setRenderUrl(d.project.renderUrl);
          if (d.project.assets?.layers) {
            setLayers(d.project.assets.layers);
          }
        }
      });
  }, [id]);

  useEffect(() => {
    const interval = playing ? setInterval(() => {
      setTime(t => (t >= 10 ? 0 : t + 0.1));
    }, 100) : undefined;
    return () => clearInterval(interval);
  }, [playing]);

  const togglePlay = () => setPlaying(p => !p);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: { layers } }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRender = async () => {
    await saveDraft();
    setRendering(true);
    setStatus('processing');
    
    // Trigger render
    await fetch(`/api/projects/${id}/render`, { method: 'POST' });
    
    // Poll for completion
    const poll = setInterval(async () => {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.project?.status === 'completed') {
        clearInterval(poll);
        setStatus('completed');
        setRenderUrl(data.project.renderUrl);
        setRendering(false);
      }
    }, 2000);
  };

  const addMediaStub = (type: 'image' | 'video' | 'audio') => {
    const stubs = {
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
      video: 'https://res.cloudinary.com/demo/video/upload/v1642548238/dog.mp4',
      audio: 'Audio Track'
    };
    setLayers([...layers, {
      id: Math.random().toString(),
      type,
      content: stubs[type],
      start: 0,
      end: 5
    }]);
  };

  const addTextOverlay = () => {
    if (!textInput) return;
    setLayers([...layers, {
      id: Math.random().toString(),
      type: 'text',
      content: textInput,
      start: 0,
      end: 3
    }]);
    setTextInput('');
  };

  const removeLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.content.startsWith('blob:')) URL.revokeObjectURL(layer.content);
    setLayers(layers.filter(l => l.id !== layerId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    setLayers([...layers, {
      id: Math.random().toString(),
      type,
      content: URL.createObjectURL(file),
      start: 0,
      end: 5,
    }]);
  };

  if (authLoading || !project) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-[#0A0A0A] bg-white">
      <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] dark:border-[#2A2A2A] dark:border-t-white a-spin" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#0A0A0A] overflow-hidden text-[#0A0A0A] dark:text-white">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#F0F0F0] dark:border-[#1F1F1F] flex items-center justify-between px-4 shrink-0 bg-white dark:bg-[#0A0A0A] z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] text-[#737373] transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="h-4 w-px bg-[#F0F0F0] dark:bg-[#2A2A2A]" />
          <h1 className="text-[14px] font-medium">{project.name}</h1>
          {status === 'completed' && <span className="text-[10px] font-medium bg-[#F0FDF4] text-[#16A34A] dark:bg-[#0A2A1A] dark:text-[#4ADE80] px-1.5 py-0.5 rounded ml-2">Rendered</span>}
        </div>
        <div className="flex items-center gap-2">
          {rendering && <div className="text-[12px] text-[#E8590C] font-medium flex items-center gap-2 mr-2"><div className="w-2 h-2 rounded-full bg-[#E8590C] animate-pulse"/> Rendering video...</div>}
          <button onClick={saveDraft} disabled={saving || rendering} className="btn-ghost !py-1.5 gap-2 text-[12px]">
            <Save size={13} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handleRender} disabled={rendering || status === 'completed'} className="btn-primary !py-1.5 gap-2 text-[12px]">
            <Clapperboard size={13} /> Output Video
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Tools */}
        <aside className="w-72 border-r border-[#F0F0F0] dark:border-[#1F1F1F] bg-[#FAFAFA] dark:bg-[#121212] flex flex-col overflow-y-auto">
          <div className="flex p-2 gap-1 border-b border-[#F0F0F0] dark:border-[#1F1F1F]">
            <button onClick={() => setActiveTab('media')} className={`flex-1 py-1.5 text-[12px] font-medium rounded-[8px] transition-colors ${activeTab === 'media' ? 'bg-white dark:bg-[#2A2A2A] shadow-sm' : 'text-[#A3A3A3]'}`}>Media</button>
            <button onClick={() => setActiveTab('text')} className={`flex-1 py-1.5 text-[12px] font-medium rounded-[8px] transition-colors ${activeTab === 'text' ? 'bg-white dark:bg-[#2A2A2A] shadow-sm' : 'text-[#A3A3A3]'}`}>Text / Music</button>
          </div>
          
          <div className="p-4 flex flex-col gap-4">
            {activeTab === 'media' && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="label">Upload assets</p>
                    <label className="border border-dashed border-[#D4D4D4] dark:border-[#2A2A2A] rounded-[10px] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors group">
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" />
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2A2A2A] shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Plus size={16} />
                    </div>
                    <p className="text-[12px] font-medium mb-0.5">Click to upload stub</p>
                    <p className="text-[10px] text-[#A3A3A3]">JPG, MP4</p>
                  </label>
                </div>

                <div className="divider" />
                
                <div className="flex flex-col gap-2">
                  <p className="label">Stock Media</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addMediaStub('image')} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-[8px] flex flex-col items-center justify-center text-[#737373] hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                      <ImageIcon size={20} className="mb-1" />
                      <span className="text-[10px]">Image Stub</span>
                    </button>
                    <button onClick={() => addMediaStub('video')} className="aspect-square bg-blue-50 dark:bg-blue-950/20 rounded-[8px] flex flex-col items-center justify-center text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      <VideoIcon size={20} className="mb-1" />
                      <span className="text-[10px]">Video Stub</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'text' && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="label">Add Text</p>
                  <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type heading..." className="w-full px-3 py-2 rounded-[8px] border border-[#F0F0F0] dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] outline-none text-[13px]" />
                  <button onClick={addTextOverlay} disabled={!textInput} className="btn-primary !py-2 text-[12px]">Add to timeline</button>
                </div>

                <div className="divider" />

                <div className="flex flex-col gap-2">
                  <p className="label">Music Library (Royalty Free)</p>
                  <button onClick={() => addMediaStub('audio')} className="flex items-center justify-between p-2 rounded-[8px] border border-[#F0F0F0] dark:border-[#2A2A2A] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors text-left group">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#FFF1E6] dark:bg-[#2A1A0A] rounded-[6px] flex items-center justify-center"><Music size={12} className="text-[#E8590C]" /></div>
                      <div>
                        <p className="text-[12px] font-medium">Upbeat Corporate</p>
                        <p className="text-[10px] text-[#A3A3A3]">02:30</p>
                      </div>
                    </div>
                    <Plus size={14} className="text-[#A3A3A3] opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Center Canvas */}
        <section className="flex-1 flex flex-col items-center justify-center bg-[#F5F5F5] dark:bg-[#0A0A0A] p-4 relative overflow-hidden">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <span className="text-[12px] font-mono text-[#A3A3A3] bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded backdrop-blur">
              {time.toFixed(1)}s / 10.0s
            </span>
          </div>

          {/* 9:16 Canvas Area */}
          <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-[16px] shadow-2xl overflow-hidden shadow-black/10 border border-[#2A2A2A]">
            {status === 'completed' && renderUrl ? (
              <video src={renderUrl} controls className="w-full h-full object-cover" autoPlay />
            ) : (
              // Mockup Composition View
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
                {/* Visual Layers */}
                {layers.filter(l => l.type === 'image' || l.type === 'video').map((l, i) => (
                  <div key={l.id} className="absolute inset-0" style={{ zIndex: i }}>
                    {l.type === 'video' ? (
                       <video src={l.content} muted loop autoPlay className="w-full h-full object-cover opacity-80" />
                    ) : (
                       <img src={l.content} className="w-full h-full object-cover opacity-80" alt="stub" />
                    )}
                  </div>
                ))}

                {/* Text Layers */}
                {layers.filter(l => l.type === 'text').map((l, i) => (
                  <div key={l.id} className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-6">
                    <p className="text-[28px] font-bold text-white uppercase drop-shadow-md a-enter" style={{ animationDelay: `${i*0.2}s` }}>
                      {l.content}
                    </p>
                  </div>
                ))}
                
                {layers.length === 0 && (
                  <p className="text-[#A3A3A3] text-[13px] font-medium absolute z-10 text-center px-4">Add media or text from the left sidebar to build your video.</p>
                )}
              </div>
            )}
          </div>
          
          {status === 'completed' && renderUrl && (
            <a href={renderUrl} download className="btn-primary mt-6 !w-auto !px-6 gap-2">
              <Download size={14} /> Download Final Video
            </a>
          )}
        </section>
      </div>

      {/* Bottom Timeline */}
      <footer className="h-48 border-t border-[#F0F0F0] dark:border-[#1F1F1F] bg-[#FAFAFA] dark:bg-[#121212] shrink-0 flex flex-col">
        <div className="h-9 border-b border-[#F0F0F0] dark:border-[#1F1F1F] flex items-center px-4 justify-between bg-white dark:bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-1 rounded-[6px] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors">{playing ? <Pause size={14}/> : <Play size={14}/>}</button>
            <div className="w-px h-3 bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
            <span className="text-[11px] font-mono text-[#737373]">{time.toFixed(1)}s</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 relative">
          {/* Time ruler */}
          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 transition-all duration-100 pointer-events-none" style={{ left: `${(time/10)*100}%` }} />
          
          {layers.map((l) => (
            <div key={l.id} className="h-8 bg-white dark:bg-[#1A1A1A] rounded-[6px] border border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center px-2 shadow-sm text-[11px] font-medium group relative">
              <span className="w-6 shrink-0">{l.type === 'text' ? <Type size={12}/> : l.type === 'audio' ? <Music size={12}/> : <Clapperboard size={12}/>}</span>
              <span className="truncate flex-1 max-w-[150px] mr-4">{l.content}</span>
              
              {/* Dummy Timeline Block representing start/end */}
              <div className="absolute inset-y-1 right-2 left-48 rounded-[4px] opacity-70 border" style={{
                backgroundColor: l.type === 'text' ? '#EFF6FF' : l.type === 'audio' ? '#FFF1E6' : '#F5F5F5',
                borderColor: l.type === 'text' ? '#BFDBFE' : l.type === 'audio' ? '#FED7AA' : '#E5E5E5',
              }} />
              
              <button onClick={() => removeLayer(l.id)} className="absolute right-2 p-1 bg-white dark:bg-black rounded opacity-0 group-hover:opacity-100 shadow transition-opacity z-20 text-[#DC2626]">
                <X size={10} />
              </button>
            </div>
          ))}
          {layers.length === 0 && (
             <div className="h-full flex items-center justify-center text-[11px] text-[#A3A3A3]">Timeline empty</div>
          )}
        </div>
      </footer>
    </div>
  );
}
