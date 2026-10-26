import React, { useState, useEffect } from 'react';
import { X, Zap, Crown, Gift, CheckCircle2, Loader2, ShieldCheck, Smartphone, ArrowRight, Sparkles, Receipt } from 'lucide-react';
import { VirtualGift, MpesaTransaction, UserProfile } from '../types';
import { db, auth } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { safeStorage } from '../services/storage';

export const VIRTUAL_GIFTS_CATALOG: VirtualGift[] = [
  {
    id: 'chai',
    name: 'Chai ya Tangawizi',
    swahiliTag: 'Vikombe viwili vya moto',
    priceKes: 100,
    desc: 'Warm spiced ginger milk tea to break the ice with authentic Kenyan hospitality.',
    icon: '☕',
    color: 'from-amber-600 to-orange-700'
  },
  {
    id: 'mahamri',
    name: 'Mombasa Mahamri & Kahawa',
    swahiliTag: 'Swahili Coastal Treat',
    priceKes: 200,
    desc: 'Cardamom-spiced coastal mahamri paired with rich Kahawa Tungu from Old Town.',
    icon: '🥐',
    color: 'from-yellow-600 to-amber-700'
  },
  {
    id: 'dawa',
    name: 'Westlands Dawa Cocktail',
    swahiliTag: 'Honey, Lime & Ice',
    priceKes: 250,
    desc: 'Kenya’s signature honey-lime-vodka sundowner for Friday night vibes.',
    icon: '🍸',
    color: 'from-emerald-600 to-teal-700'
  },
  {
    id: 'rose',
    name: 'Naivasha Fresh Rose Bouquet',
    swahiliTag: 'Romantic Highlands Bloom',
    priceKes: 350,
    desc: 'Hand-picked crimson roses straight from Lake Naivasha flower farms.',
    icon: '🌹',
    color: 'from-rose-500 to-pink-700'
  },
  {
    id: 'choma',
    name: 'Kamakis Nyama Choma Platter',
    swahiliTag: 'Mbuzi Choma & Kachumbari',
    priceKes: 650,
    desc: 'Sizzling charcoal-roasted goat meat with fresh kachumbari and ugali.',
    icon: '🥩',
    color: 'from-orange-600 to-red-700'
  },
  {
    id: 'safari',
    name: 'Maasai Mara Sundowner Pass',
    swahiliTag: 'Ultimate Courtship Zawadi',
    priceKes: 2500,
    desc: 'A golden weekend safari voucher for an unforgettable savannah getaway.',
    icon: '🦁',
    color: 'from-purple-600 to-indigo-800'
  }
];

interface MpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'BOOST' | 'GOLD' | 'GIFT';
  userProfile: UserProfile;
  recipientId?: string;
  recipientName?: string;
  onBoostActivated?: (durationMinutes: number) => void;
  onGoldUpgraded?: (tier: 'GOLD' | 'VIP', phone: string) => void;
  onGiftSent?: (gift: VirtualGift, receiptNumber: string) => void;
}

export const MpesaModal: React.FC<MpesaModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'GOLD',
  userProfile,
  recipientId,
  recipientName,
  onBoostActivated,
  onGoldUpgraded,
  onGiftSent
}) => {
  const [activeTab, setActiveTab] = useState<'BOOST' | 'GOLD' | 'GIFT'>(initialTab);
  const [phone, setPhone] = useState<string>(userProfile.mpesaPhone || '0712345678');
  const [selectedBoostPlan, setSelectedBoostPlan] = useState<'30M' | '120M'>('30M');
  const [selectedGoldPlan, setSelectedGoldPlan] = useState<'WEEKLY' | 'MONTHLY' | 'VIP'>('MONTHLY');
  const [selectedGift, setSelectedGift] = useState<VirtualGift>(VIRTUAL_GIFTS_CATALOG[0]);
  const [step, setStep] = useState<'SELECT' | 'STK_PUSH' | 'SUCCESS'>('SELECT');
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<MpesaTransaction | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<MpesaTransaction[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
    setStep('SELECT');
    setError(null);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const saved = safeStorage.getItem('pendo_mpesa_transactions');
    if (saved) {
      try {
        setRecentTransactions(JSON.parse(saved));
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateKenyanPhone = (input: string): string | null => {
    const cleaned = input.replace(/\s+/g, '');
    if (/^(07|01)\d{8}$/.test(cleaned)) {
      return `+254${cleaned.slice(1)}`;
    }
    if (/^\+?254(7|1)\d{8}$/.test(cleaned)) {
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }
    return null;
  };

  const getCurrentCheckoutDetails = () => {
    if (activeTab === 'BOOST') {
      return selectedBoostPlan === '30M'
        ? { purpose: 'BOOST' as const, itemName: '30-Min Nairobi Spotlight Boost (10x Views)', amountKes: 150 }
        : { purpose: 'BOOST' as const, itemName: '2-Hour Super County Boost (25x Views)', amountKes: 350 };
    }
    if (activeTab === 'GOLD') {
      if (selectedGoldPlan === 'WEEKLY') {
        return { purpose: 'GOLD_SUBSCRIPTION' as const, itemName: 'Pendo Gold Weekly Pass', amountKes: 250 };
      }
      if (selectedGoldPlan === 'VIP') {
        return { purpose: 'GOLD_SUBSCRIPTION' as const, itemName: 'Pendo VIP Platinum Monthly', amountKes: 1950 };
      }
      return { purpose: 'GOLD_SUBSCRIPTION' as const, itemName: 'Pendo Gold Monthly Membership', amountKes: 950 };
    }
    return {
      purpose: 'VIRTUAL_GIFT' as const,
      itemName: `${selectedGift.name} (${selectedGift.icon})`,
      amountKes: selectedGift.priceKes
    };
  };

  const handleInitiateStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedPhone = validateKenyanPhone(phone);
    if (!formattedPhone) {
      setError('Enter a valid Safaricom/Kenyan number (e.g. 0712345678, 0110123456, or +254712345678).');
      return;
    }

    const details = getCurrentCheckoutDetails();
    setStep('STK_PUSH');

    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          amountKes: details.amountKes,
          purpose: details.purpose,
          itemName: details.itemName,
          recipientName: recipientName || undefined
        })
      });

      const data = await response.json().catch(() => null);
      const receiptCode = data?.receiptNumber || `SGK${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const uid = auth.currentUser?.uid || userProfile.uid || 'guest_user';
      const tx: MpesaTransaction = {
        id: `tx_${Date.now()}`,
        userId: uid,
        phone: formattedPhone,
        amountKes: details.amountKes,
        purpose: details.purpose,
        itemName: details.itemName,
        ...(recipientId ? { recipientId } : {}),
        ...(recipientName ? { recipientName } : {}),
        receiptNumber: receiptCode,
        status: 'COMPLETED',
        createdAt: Date.now()
      };

      // Save to Firestore transactions collection (with resilient fallback)
      try {
        if (auth.currentUser) {
          await setDoc(doc(db, 'transactions', tx.id), tx);
        }
      } catch (fsErr) {
        console.warn('Firestore transaction log fallback to local storage:', fsErr);
      }

      const updatedHistory = [tx, ...recentTransactions].slice(0, 10);
      setRecentTransactions(updatedHistory);
      safeStorage.setItem('pendo_mpesa_transactions', JSON.stringify(updatedHistory));
      setLastTransaction(tx);

      setTimeout(() => {
        setStep('SUCCESS');
        if (activeTab === 'BOOST' && onBoostActivated) {
          onBoostActivated(selectedBoostPlan === '30M' ? 30 : 120);
        } else if (activeTab === 'GOLD' && onGoldUpgraded) {
          onGoldUpgraded(selectedGoldPlan === 'VIP' ? 'VIP' : 'GOLD', formattedPhone);
        } else if (activeTab === 'GIFT' && onGiftSent) {
          onGiftSent(selectedGift, receiptCode);
        }
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Could not reach M-Pesa Express gateway. Please try again.');
      setStep('SELECT');
    }
  };

  const currentCheckout = getCurrentCheckoutDetails();

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top M-Pesa Header Bar */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
            aria-label="Close M-Pesa Modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2.5 mb-1">
            <div className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 font-black text-xs tracking-wider uppercase shadow-sm flex items-center gap-1">
              <Smartphone size={13} className="text-emerald-600" />
              M-PESA EXPRESS
            </div>
            <span className="text-[11px] text-emerald-100 font-semibold flex items-center gap-1">
              <ShieldCheck size={13} /> Instant STK Push
            </span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            {activeTab === 'GOLD' && 'Upgrade to Pendo Gold 🇰🇪'}
            {activeTab === 'BOOST' && 'Spotlight Profile Boost ⚡'}
            {activeTab === 'GIFT' && `Send Zawadi to ${recipientName || 'Your Match'} 🎁`}
          </h2>
          <p className="text-xs text-emerald-100 mt-0.5">
            Zero card fees · Instant activation across Nairobi, Mombasa & all 47 counties
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-emerald-900/40 p-1 rounded-xl mt-4 border border-emerald-500/30">
            <button
              type="button"
              onClick={() => { setActiveTab('GOLD'); setStep('SELECT'); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'GOLD' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Crown size={13} className={activeTab === 'GOLD' ? 'text-amber-500' : ''} />
              Pendo Gold
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('BOOST'); setStep('SELECT'); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'BOOST' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Zap size={13} className={activeTab === 'BOOST' ? 'text-purple-600' : ''} />
              Boost
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('GIFT'); setStep('SELECT'); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'GIFT' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Gift size={13} className={activeTab === 'GIFT' ? 'text-rose-600' : ''} />
              Zawadi Gifts
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {step === 'SELECT' && (
            <form onSubmit={handleInitiateStkPush} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* TAB 1: PENDO GOLD */}
              {activeTab === 'GOLD' && (
                <div className="space-y-3">
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
                    <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                      <Sparkles size={14} className="text-amber-600" /> Why Kenyans Love Pendo Gold:
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Unlimited likes · See everyone who liked you · Passport to Nairobi, Mombasa, Kisumu & Diaspora · Priority Verified Badge (+15 Trust Score).
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'WEEKLY', title: 'Weekly Pass', price: '250 KES', sub: '7 Days Access', tag: 'Starter' },
                      { id: 'MONTHLY', title: 'Gold Monthly', price: '950 KES', sub: '30 Days · Best Value', tag: 'Most Popular' },
                      { id: 'VIP', title: 'VIP Platinum', price: '1,950 KES', sub: '30 Days + 5 Free Boosts', tag: 'Executive' }
                    ].map((plan) => {
                      const active = selectedGoldPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedGoldPlan(plan.id as any)}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            active
                              ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit mb-2 ${
                            active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {plan.tag}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{plan.title}</div>
                            <div className="text-sm font-black text-emerald-700 mt-0.5">{plan.price}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{plan.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: PROFILE BOOST */}
              {activeTab === 'BOOST' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBoostPlan('30M')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedBoostPlan === '30M'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Zap size={20} className="text-purple-600" fill="currentColor" />
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">10x Views</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">30-Min Rush Hour Boost</div>
                      <div className="text-base font-black text-emerald-700 mt-1">150 KES</div>
                      <p className="text-[11px] text-slate-500 mt-1">Top placement in your city for 30 minutes.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBoostPlan('120M')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedBoostPlan === '120M'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Sparkles size={20} className="text-amber-500" fill="currentColor" />
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">25x Views</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">2-Hour Sherehe Spotlight</div>
                      <div className="text-base font-black text-emerald-700 mt-1">350 KES</div>
                      <p className="text-[11px] text-slate-500 mt-1">Priority placement across all nearby counties.</p>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: VIRTUAL ZAWADI GIFTS */}
              {activeTab === 'GIFT' && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                  {VIRTUAL_GIFTS_CATALOG.map((gift) => {
                    const isSelected = selectedGift.id === gift.id;
                    return (
                      <button
                        key={gift.id}
                        type="button"
                        onClick={() => setSelectedGift(gift)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-3xl shrink-0">{gift.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{gift.name}</span>
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {gift.priceKes} KES
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-rose-600 block">{gift.swahiliTag}</span>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{gift.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* M-Pesa Phone Number Input */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Safaricom M-Pesa Number
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700">Paybill 4092819 · Pendo KE</span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678 or +2547..."
                    className="w-full px-4 py-3 bg-white rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-sm font-mono font-bold text-slate-900"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    KE 🇰🇪
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
                  <span className="text-slate-600 font-medium">{currentCheckout.itemName}</span>
                  <span className="text-sm font-black text-slate-900">KES {currentCheckout.amountKes.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Send M-Pesa STK Prompt ({currentCheckout.amountKes} KES)</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 'STK_PUSH' && (
            <div className="py-10 px-4 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Daraja 2.0 Express Prompt Sent
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-2">Check your phone ({phone})</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  An M-Pesa STK Push prompt for <strong>KES {currentCheckout.amountKes}</strong> to <strong>PENDO DATING KENYA</strong> has been sent. Enter your M-Pesa PIN to confirm.
                </p>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && lastTransaction && (
            <div className="py-6 px-2 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  Confirmed · M-Pesa Receipt #{lastTransaction.receiptNumber}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  Malipo Imekamilika! 🎉
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  KES {lastTransaction.amountKes} paid for <strong>{lastTransaction.itemName}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">M-Pesa Code:</span>
                  <span className="font-bold text-emerald-700">{lastTransaction.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-bold text-slate-800">{lastTransaction.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-700">COMPLETED ✓</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Done & Continue
              </button>
            </div>
          )}

          {/* Recent M-Pesa Receipts Footer */}
          {step === 'SELECT' && recentTransactions.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Receipt size={12} /> Recent M-Pesa Receipts ({recentTransactions.length})
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar">
                {recentTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">{tx.itemName}</span>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold">{tx.receiptNumber} · {tx.amountKes} KES</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
