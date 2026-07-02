'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { FolderOpen, Image as ImageIcon, Video, Music, Trash2, Upload } from 'lucide-react';

interface Asset {
  id: string;
  type: string;
  url: string;
  createdAt: string;
}

/* eslint-disable @next/next/no-img-element */
export default function AssetsPage() {
  useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => {
        setAssets(data.assets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const deleteAsset = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    setAssets(assets.filter(a => a.id !== id));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/assets/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setAssets(prev => [...prev, data]);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    e.target.value = '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 a-enter">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] dark:text-white">Media Assets</h1>
            <p className="text-[13px] text-[#A3A3A3] mt-1">Manage all uploaded images, video clips, and audio files.</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={handleUploadClick} className="btn-primary flex items-center gap-2">
            <Upload size={15} /> Upload File
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-[1.5px] border-[#E5E5E5] border-t-[#0A0A0A] a-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 card a-enter-1">
            <div className="w-14 h-14 bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="text-[#A3A3A3]" size={24} />
            </div>
            <p className="text-[15px] font-medium dark:text-white mb-1">Your library is empty</p>
            <p className="text-[13px] text-[#737373] text-center max-w-sm">
              Any files you upload while creating a video will automatically be saved here for future reuse.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 a-enter-2 border-t border-[#F0F0F0] dark:border-[#1F1F1F] pt-8">
            {assets.map((asset) => (
              <div key={asset.id} className="card overflow-hidden group">
                <div className="aspect-square bg-black relative">
                  {asset.type === 'video' ? (
                    <video src={asset.url} className="w-full h-full object-cover opacity-80" />
                  ) : asset.type === 'image' ? (
                    <img src={asset.url} alt="Asset" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#FAFAFA] dark:bg-[#1A1A1A] flex items-center justify-center">
                      <Music className="text-[#A3A3A3]" size={32} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteAsset(asset.id)} className="text-white hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {asset.type === 'video' ? <Video size={12} className="text-[#737373]"/> : 
                     asset.type === 'image' ? <ImageIcon size={12} className="text-[#737373]"/> : 
                     <Music size={12} className="text-[#737373]"/>}
                    <p className="text-[12px] font-medium truncate uppercase">{asset.type}</p>
                  </div>
                  <p className="text-[10px] text-[#A3A3A3]">{formatDate(asset.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
