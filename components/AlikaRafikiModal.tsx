import React, { useState } from 'react';
import { X, Share2, Copy, Check, Users, Sparkles, ShieldCheck, Zap, Heart } from 'lucide-react';
import { safeCopyToClipboard } from '../services/compat';

interface AlikaRafikiModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userCity?: string;
  onRewardEarned?: (type: 'BOOST' | 'TRUST') => void;
}

export const AlikaRafikiModal: React.FC<AlikaRafikiModalProps> = ({
  isOpen,
  onClose,
  userName = 'A Friend',
  userCity = 'Nairobi',
  onRewardEarned
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [hasShared, setHasShared] = useState(false);

  if (!isOpen) return null;

  const CANONICAL_URL = 'https://www.pendo.website/';

  const shareOptions = [
    {
      id: 'general',
      title: 'WhatsApp Status & Group Invite 🇰🇪',
      desc: 'Perfect for sharing to WhatsApp status or your trusted friend groups.',
      message: `Oya! 🔥 Cheki Pendo Dating Kenya — verified Kenyan singles pekee with Matatu Fare Shield & Voice Lounges! Join through my link: ${CANONICAL_URL}`,
      tag: 'Most Popular'
    },
    {
      id: 'bestie',
      title: 'Single Bestie Invite 💕',
      desc: 'Send directly to a friend looking for authentic love.',
      message: `Bana, I found our tribe on Pendo Kenya! Verified singles, zero catfishing, and curated date spots in ${userCity}. Join me hapa: ${CANONICAL_URL}`,
      tag: 'Bestie Special'
    },
    {
      id: 'safety',
      title: 'Safe Date & Matatu Shield Invite 🛡️',
      desc: 'Invite with emphasis on Pendo Ngao safety features.',
      message: `Dating in Kenya just got safe! Pendo has live date safety check-ins and verified selfie profiles. Check it out: ${CANONICAL_URL}`,
      tag: 'Safety First'
    }
  ];

  const handleShareToWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Reward user with boost/trust points on sharing
    if (!hasShared) {
      setHasShared(true);
      if (onRewardEarned) {
        onRewardEarned('TRUST');
      }
    }
  };

  const handleCopy = async (message: string, index: number) => {
    const success = await safeCopyToClipboard(message);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
      if (!hasShared) {
        setHasShared(true);
        if (onRewardEarned) {
          onRewardEarned('TRUST');
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-emerald-100 mb-2">
            <Users size={12} />
            <span>Alika Rafiki · Viral Referral Program</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            Invite Friends on WhatsApp 🇰🇪
          </h2>
          <p className="text-xs text-emerald-100 mt-1 leading-snug">
            Help grow Kenya's most authentic dating community and earn <strong className="text-amber-200">+10 Trust Points</strong> and priority matching!
          </p>

          {/* Reward Badges */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15">
            <div className="flex items-center gap-1 text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
              <ShieldCheck size={13} className="text-emerald-200" />
              <span>+10 Trust Score</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
              <Zap size={13} className="text-amber-300" />
              <span>Free Profile Boost</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {hasShared && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-fade-in">
              <Sparkles size={18} className="text-emerald-600 shrink-0" />
              <span>Asante sana! Your referral bonus points have been credited to your Pendo profile.</span>
            </div>
          )}

          <div className="space-y-3">
            {shareOptions.map((opt, idx) => (
              <div
                key={opt.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">{opt.title}</span>
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {opt.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-mono leading-relaxed select-all">
                  "{opt.message}"
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleShareToWhatsApp(opt.message)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Share2 size={13} />
                    <span>Share on WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(opt.message, idx)}
                    className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Copy message text"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Domain Copy Card */}
          <div className="p-3.5 bg-slate-100 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Your Shareable Link</p>
              <p className="font-mono font-bold text-slate-800">www.pendo.website</p>
            </div>
            <button
              onClick={() => handleCopy(CANONICAL_URL, 99)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copiedIndex === 99 ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
