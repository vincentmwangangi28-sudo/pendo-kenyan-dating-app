import React, { useState } from 'react';
import { GroupProfile } from '../types';
import { Button } from './Button';
import { generateGroupDescription, generateGroupImage } from '../services/geminiService';
import { Sparkles, Image, Users, X, Loader2, Paintbrush } from 'lucide-react';
import { INTERESTS_LIST } from './ProfileSetup';

interface GroupCreationProps {
  onSave: (group: GroupProfile) => void;
  onCancel: () => void;
}

export const GroupCreation: React.FC<GroupCreationProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [interest, setInterest] = useState('');
  const [description, setDescription] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(`https://picsum.photos/seed/${Math.random()}/500/300`);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImageGen, setShowImageGen] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const handleAIHelp = async () => {
    if (!name || !interest) return;
    setIsGeneratingDesc(true);
    const desc = await generateGroupDescription(name, interest);
    setDescription(desc);
    setIsGeneratingDesc(false);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImg(true);
    const base64Image = await generateGroupImage(imagePrompt, imageSize);
    if (base64Image) {
        setPhotoUrl(base64Image);
        setShowImageGen(false);
    } else {
        alert("Failed to generate image. Try again.");
    }
    setIsGeneratingImg(false);
  };

  const handleSave = () => {
    if (!name || !interest) return;
    
    const newGroup: GroupProfile = {
      id: Date.now().toString(),
      name,
      interest,
      description,
      photoUrl,
      membersCount: 1
    };
    
    onSave(newGroup);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">Create New Group</h1>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Photo Placeholder */}
        <div className="w-full h-48 bg-slate-200 rounded-2xl overflow-hidden relative group shadow-inner">
           <img src={photoUrl} alt="Group Cover" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer gap-2">
             <button 
                onClick={() => setShowImageGen(true)}
                className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white text-slate-900"
             >
               <Paintbrush size={14} /> AI Gen
             </button>
           </div>
        </div>

        {/* AI Image Generation Panel */}
        {showImageGen && (
            <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-lg animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-rose-600 flex items-center gap-2"><Sparkles size={14} /> Generate Cover Image</h4>
                    <button onClick={() => setShowImageGen(false)}><X size={16} className="text-slate-400" /></button>
                </div>
                <input 
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="e.g., A happy group hiking on Mt Kenya..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 outline-none focus:border-rose-500"
                />
                
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500">Quality:</span>
                    {(['1K', '2K', '4K'] as const).map(size => (
                        <button
                            key={size}
                            onClick={() => setImageSize(size)}
                            className={`px-2 py-1 text-xs rounded border ${imageSize === size ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        >
                            {size}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImg || !imagePrompt}
                    className="w-full py-2 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isGeneratingImg ? <Loader2 size={14} className="animate-spin" /> : <Paintbrush size={14} />}
                    Generate Image
                </button>
            </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nairobi Hikers"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Main Topic</label>
          <select 
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none bg-white"
          >
            <option value="">Select an interest...</option>
            {INTERESTS_LIST.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <div className="relative">
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none min-h-[120px]"
            />
            <button 
              onClick={handleAIHelp}
              disabled={isGeneratingDesc || !name || !interest}
              className="absolute bottom-3 right-3 text-xs bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-rose-200 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isGeneratingDesc ? 'Thinking...' : 'AI Help'}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
             <Users size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">Community Rules</h4>
            <p className="text-xs text-blue-700 mt-1">Keep it respectful. Groups are for building community, not just dating.</p>
          </div>
        </div>

      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <Button onClick={handleSave} disabled={!name || !interest}>
          Create Group
        </Button>
      </div>
    </div>
  );
};