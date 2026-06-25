import React, { useState } from 'react';
import { UserProfile } from '../types';
import { generateAuntieShoshAdvice } from '../services/geminiService';
import { safeCopyToClipboard } from '../services/compat';
import { X, Sparkles, Send, Loader2, Info, Award, CircleHelp, Check, Copy, Share2, Coffee, Flame } from 'lucide-react';

interface AuntieShoshProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSendVerificationToChat?: (text: string) => void;
}

const PRESET_QUESTIONS = [
  { text: "My partner hasn't replied in 3 hours. Am I getting Nairobi Character Development?", icon: "💔" },
  { text: "How many cows should I budget to show serious traditional intentions?", icon: "🐄" },
  { text: "Is a Mombasa coastal getaway better than a Nairobi coffee date?", icon: "🏖️" },
  { text: "They wanted to split a KES 450 Nyama Choma bill. Is this a red flag?", icon: "🥩" },
];

const UGALI_OPTIONS = [
  { id: 'expert', label: 'Heavyweight Champion 🏆', desc: 'Fluffy, piping hot, perfectly dome-shaped, served with wet fry.', cowsBonus: 5 },
  { id: 'average', label: 'Standard Kericho Style ☕', desc: 'Edible, but sometimes needs extra butter or a prayer to slide down.', cowsBonus: 2 },
  { id: 'bad', label: 'Porridge Disaster 🥣', desc: 'Calling a fast courier because the dough refused to cooperate.', cowsBonus: -2 },
];

const MPESA_OPTIONS = [
  { id: 'fast', label: 'Lightning Thumb ⚡', desc: 'Transfers before they even finish saying "Send cash to this code".', cowsBonus: 4 },
  { id: 'careful', label: 'The Triple Checker 🧐', desc: 'Verifies the name twice, reads it out loud, then checks again.', cowsBonus: 3 },
  { id: 'delayed', label: 'The No-Balance King/Queen 💸', desc: '"Hey, please hold on, let me wait for my Chama dividend to clear."', cowsBonus: 0 },
];

const LIFESTYLE_OPTIONS = [
  { id: 'shamba', label: 'Shamba Saver 🚜', desc: 'Weekends are for visiting the shamba, buying wholesale onions, and checking cows.', cowsBonus: 6 },
  { id: 'hustler', label: 'Nairobi Grid Hustler 💻', desc: 'Sipping sweet chai while updating three side-gigs before Monday.', cowsBonus: 4 },
  { id: 'flexer', label: 'Kilimani Club Lounger 🥂', desc: 'Ordering cocktails on a budget because the vibes must be immaculate.', cowsBonus: 1 },
];

const TEA_OPTIONS = [
  { id: 'chai_addict', label: '5-Cups-a-Day Tea Master ☕', desc: 'Double ginger, strong milk, bubbling hot under any weather.', cowsBonus: 5 },
  { id: 'coastal_spiced', label: 'Mombasa Kahawa Tungu 🌶️', desc: 'Spiced aromatic coffee/tea that warms up the soul on chilly nights.', cowsBonus: 4 },
  { id: 'iced', label: 'Starbucks Iced Latte Fan 🧊', desc: '"Chai without cold foam? Aiya, please no!"', cowsBonus: 1 },
];

export const AuntieShosh: React.FC<AuntieShoshProps> = ({ userProfile, onClose, onSendVerificationToChat }) => {
  const [activeTab, setActiveTab] = useState<'counsel' | 'dowry'>('counsel');
  
  // Counselor State
  const [question, setQuestion] = useState('');
  const [adviceHistory, setAdviceHistory] = useState<Array<{ q: string; a: string; timestamp: Date }>>([
    {
      q: "Auntie Shosh, introduce yourself!",
      a: "Aiya! Settle down, my child! Put away those fancy phones and listen to your Auntie Shosh. I am here to find you a good partner with a reliable character, not those Nairobi fly-by-night draft players. Ask me anything, or let me estimate your Courtship Worth in fine Naivasha cows!",
      timestamp: new Date()
    }
  ]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Dowry Estimator State
  const [ugali, setUgali] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [lifestyle, setLifestyle] = useState('');
  const [tea, setTea] = useState('');
  const [estimatedResult, setEstimatedResult] = useState<{
    cowsCount: number;
    title: string;
    description: string;
    verdict: string;
    items: string[];
  } | null>(null);
  const [calculatingDowry, setCalculatingDowry] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const handleAskShosh = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoadingAdvice(true);
    setQuestion('');
    
    try {
      const response = await generateAuntieShoshAdvice(queryText, userProfile);
      setAdviceHistory(prev => [
        { q: queryText, a: response, timestamp: new Date() },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleCalculateDowry = () => {
    if (!ugali || !mpesa || !lifestyle || !tea) return;
    setCalculatingDowry(true);

    setTimeout(() => {
      const uVal = UGALI_OPTIONS.find(o => o.id === ugali)?.cowsBonus ?? 0;
      const mVal = MPESA_OPTIONS.find(o => o.id === mpesa)?.cowsBonus ?? 0;
      const lVal = LIFESTYLE_OPTIONS.find(o => o.id === lifestyle)?.cowsBonus ?? 0;
      const tVal = TEA_OPTIONS.find(o => o.id === tea)?.cowsBonus ?? 0;

      // Base cows depending on age and positive profile details
      let baseCows = 12;
      if (userProfile.bio && userProfile.bio.length > 20) baseCows += 2;
      if (userProfile.interests && userProfile.interests.length >= 3) baseCows += 1;

      const totalCows = baseCows + uVal + mVal + lVal + tVal;
      
      let title = "Nairobi Royal Courtship Icon";
      let description = "You are a highly prized partner! Your family is guaranteed legendary negotiations.";
      let verdict = "Auntie Shosh Verdict: This one is standard matrimonial gold. Whoever wins your heart must deliver a full truck of fine livestock and sweet tea leaves!";
      let items = ["2 Premium Jiko Stoves", "1 Acre Shamba in Kericho", "Double Tea Harvest Basket"];

      if (totalCows >= 25) {
        title = "Pendo Traditional Matrimonial Legend 👑";
        description = "Unbelievable! You are the ultimate traditional courtship standard. Parents are already planning the traditional wedding feast!";
        verdict = "Shosh Verdict: Aiya! You cook ugali, save your cents, value the shamba, and drink authentic tea? You are a treasure! No cheap dates or playboys allowed around you!";
        items = ["28 High-Yielding Naivasha Cows 🐄", "2 prime shamba plots in Nakuru 🌾", "A lifetime supply of double-ginger milk tea ☕"];
      } else if (totalCows <= 14) {
        title = "Nairobi Modern Free-Spirited Dater 🏙️";
        description = "You lean fully into modern cosmopolitan life. The family elders will need a strong coffee session to understand your vibes!";
        verdict = "Shosh Verdict: Aiya, you need to practice your Ugali dome and learn how to save for Chama! But your city charm is undeniable. Let's negotiate with 10 goats and a very nice smartphone!";
        items = ["10 Healthy Mombasa Goats 🐐", "1 Instant hot shower heater 🚿", "6 packs of gourmet instant coffee ☕"];
      } else {
        title = "Chama-Approved Courtship Star ⭐";
        description = "A perfectly balanced blend of traditional hospitality and modern city hustle. Extremely reliable!";
        verdict = "Shosh Verdict: Good, honest, and very hardworking! You will find a partner who appreciates correct tea and real accountability. Highly recommended for a warm, stable home!";
        items = ["18 Healthy Longhorn Goats 🐐", "1 Milk-separating churn 🥛", "A traditional wooden tea chest 📦"];
      }

      setEstimatedResult({
        cowsCount: totalCows,
        title,
        description,
        verdict,
        items
      });
      setCalculatingDowry(false);
    }, 1500);
  };

  const handleShareResult = () => {
    if (!estimatedResult) return;
    const shareText = `👵 [Auntie Shosh Estimate] My Courtship worth on Pendo was rated at ${estimatedResult.cowsCount} Traditional Cows! Title: "${estimatedResult.title}". Shosh says: "${estimatedResult.description}" ❤️`;
    
    if (onSendVerificationToChat) {
      onSendVerificationToChat(shareText);
    } else {
      safeCopyToClipboard(shareText);
      setCopiedValue(true);
      setTimeout(() => setCopiedValue(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-amber-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in text-slate-800">
      <div className="bg-amber-50 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-0 shadow-2xl relative animate-slide-up max-h-[92vh] flex flex-col border border-amber-200/50 overflow-hidden">
        
        {/* Banner with traditional styling */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-850 p-5 pt-7 pb-6 text-white relative flex-shrink-0 border-b-4 border-amber-900">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/35 rounded-full text-amber-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-md animate-pulse">
              👵
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-amber-900/40 text-[9px] text-amber-250 font-black tracking-widest uppercase py-0.5 px-2 rounded-full border border-amber-600">
                  Elders Council
                </span>
                <span className="flex items-center gap-0.5 text-xs text-amber-300 font-bold">
                  <Flame size={12} fill="currentColor" /> Authentic Baraza
                </span>
              </div>
              <h2 className="text-xl font-black text-amber-100 tracking-tight leading-tight mt-1">Auntie Shosh's Counsel</h2>
              <p className="text-xs text-amber-200/90 leading-normal">Wise traditional dating advice & courtship worth</p>
            </div>
          </div>

          {/* Cultural Sub-tabs */}
          <div className="flex mt-5 bg-amber-950/40 p-1.5 rounded-2xl border border-amber-800/30">
            <button
              onClick={() => setActiveTab('counsel')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'counsel' ? 'bg-amber-600 text-amber-50 shadow-sm' : 'text-amber-250 hover:text-white'}`}
            >
              👵 Whisper to Shosh
            </button>
            <button
              onClick={() => setActiveTab('dowry')}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'dowry' ? 'bg-amber-600 text-amber-50 shadow-sm' : 'text-amber-250 hover:text-white'}`}
            >
              🐄 Dowry & Shamba Estimator
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-amber-50">
          
          {activeTab === 'counsel' ? (
            <div className="space-y-4 h-full flex flex-col min-h-0">
              
              {/* Question list for easy templates */}
              <div className="space-y-1.5 flex-shrink-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 flex items-center gap-1">
                  <CircleHelp size={12} /> Popular Courtship dilemmas:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_QUESTIONS.map((pq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskShosh(pq.text)}
                      disabled={loadingAdvice}
                      className="text-left p-2.5 bg-white border border-amber-200/80 hover:bg-amber-100/30 rounded-2xl transition-all cursor-pointer text-[11px] font-semibold text-slate-700 leading-snug flex items-start gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <span className="text-sm shrink-0">{pq.icon}</span>
                      <span className="line-clamp-3">{pq.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Log */}
              <div className="flex-1 space-y-3.5 min-h-[180px] overflow-y-auto border-t border-amber-200/50 pt-4 flex flex-col-reverse pr-1 no-scrollbar">
                {loadingAdvice && (
                  <div className="flex items-start gap-2.5 self-start mr-8">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-lg flex items-center justify-center shrink-0 border border-amber-300">👵</div>
                    <div className="bg-white rounded-3xl rounded-tl-none p-3 shadow-xs border border-amber-100 text-xs text-slate-500 font-bold flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-amber-700" />
                      Auntie is sipping tea & thinking...
                    </div>
                  </div>
                )}

                {adviceHistory.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* User Question */}
                    {item.q !== "Auntie Shosh, introduce yourself!" && (
                      <div className="flex items-start gap-2.5 self-end justify-end ml-8">
                        <div className="bg-amber-800 text-white rounded-3xl rounded-tr-none px-4 py-2.5 shadow-sm text-xs font-semibold leading-relaxed text-right">
                          {item.q}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-amber-950 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">ME</div>
                      </div>
                    )}
                    
                    {/* Shosh Answer */}
                    <div className="flex items-start gap-2.5 self-start mr-8">
                      <div className="w-8 h-8 rounded-full bg-amber-200 text-lg flex items-center justify-center shrink-0 border border-amber-300">👵</div>
                      <div className="bg-amber-100/40 rounded-3xl rounded-tl-none px-4 py-3 shadow-md border border-amber-200/40 text-xs text-slate-800 leading-relaxed font-bold text-left whitespace-pre-wrap relative">
                        <span className="absolute -top-1.5 -left-1.5 bg-amber-800 text-white text-[8px] font-black tracking-wider px-1 py-0.5 rounded uppercase">SHOSH</span>
                        {item.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Text Input Panel */}
              <div className="pt-3 border-t border-amber-200/50 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskShosh(question);
                  }}
                  className="relative flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask Shosh (e.g., family pressure, dating budgets)..."
                    className="w-full bg-white text-xs border border-amber-200 placeholder-amber-900/40 rounded-full pl-4 pr-10 py-3.5 outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 font-semibold"
                    disabled={loadingAdvice}
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || loadingAdvice}
                    className="absolute right-1.5 p-2 rounded-full bg-amber-700 hover:bg-amber-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              
              {!estimatedResult ? (
                <div className="space-y-4">
                  <div className="bg-amber-100/40 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                    <Info size={16} className="text-amber-800 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-600 font-bold leading-normal">
                      Answer Auntie Shosh's quick evaluation questionnaire to calculate your humorous traditional courtship evaluation score in Cows and Goats.
                    </p>
                  </div>

                  {/* Question 1 */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 flex items-center gap-1">
                      🍲 1. What is your hot Ugali-cooking skill level?
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {UGALI_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setUgali(opt.id)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            ugali === opt.id 
                              ? 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300 font-semibold'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span>{opt.label}</span>
                            {ugali === opt.id && <Check size={12} />}
                          </div>
                          <p className={`text-[10px] ${ugali === opt.id ? 'text-amber-100' : 'text-slate-500'}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 flex items-center gap-1">
                      💸 2. What is your M-Pesa transaction style?
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {MPESA_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setMpesa(opt.id)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            mpesa === opt.id 
                              ? 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300 font-semibold'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span>{opt.label}</span>
                            {mpesa === opt.id && <Check size={12} />}
                          </div>
                          <p className={`text-[10px] ${mpesa === opt.id ? 'text-amber-100' : 'text-slate-500'}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 3 */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 flex items-center gap-1">
                      🌾 3. What is your ideal Nairobi weekend lifestyle?
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {LIFESTYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setLifestyle(opt.id)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            lifestyle === opt.id 
                              ? 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300 font-semibold'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span>{opt.label}</span>
                            {lifestyle === opt.id && <Check size={12} />}
                          </div>
                          <p className={`text-[10px] ${lifestyle === opt.id ? 'text-amber-100' : 'text-slate-500'}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 4 */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 flex items-center gap-1">
                      ☕ 4. What is your essential morning beverage custom?
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {TEA_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setTea(opt.id)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            tea === opt.id 
                              ? 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs' 
                              : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300 font-semibold'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span>{opt.label}</span>
                            {tea === opt.id && <Check size={12} />}
                          </div>
                          <p className={`text-[10px] ${tea === opt.id ? 'text-amber-100' : 'text-slate-500'}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculate Trigger button */}
                  <div className="pt-2">
                    <button
                      onClick={handleCalculateDowry}
                      disabled={calculatingDowry || !ugali || !mpesa || !lifestyle || !tea}
                      className="w-full py-4 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black shadow-lg shadow-amber-900/20 text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {calculatingDowry ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white" />
                          Consulting the Elders Council...
                        </>
                      ) : (
                        <>
                          <Award size={16} />
                          Calculate Courtship Evaluation Worth
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in pb-2">
                  
                  {/* Result Showcase */}
                  <div className="bg-gradient-to-br from-amber-800 to-amber-950 rounded-3xl p-6 text-white text-center border-2 border-amber-400 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <span className="bg-amber-400 text-amber-950 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full inline-block shadow-sm">
                      Official Courtship Certificate
                    </span>

                    <h3 className="text-4xl font-black text-amber-100 tracking-tight mt-4 flex items-center justify-center gap-2">
                      <span>{estimatedResult.cowsCount}</span>
                      <span className="text-xl font-bold text-amber-300 shrink-0">Traditional Cows 🐄</span>
                    </h3>

                    <h4 className="font-extrabold text-sm text-yellow-300 uppercase letter tracking-wide mt-2">
                      "{estimatedResult.title}"
                    </h4>

                    <p className="text-[11px] text-amber-100 mt-2 font-medium leading-relaxed italic opacity-95">
                      "{estimatedResult.description}"
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                      <span className="text-[9px] text-amber-300 font-extrabold uppercase tracking-widest block text-left">
                        Additional Courtney Valuations:
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {estimatedResult.items.map((item, idx) => (
                          <span key={idx} className="bg-white/10 border border-white/10 text-[10px] font-bold px-2.5 py-1 rounded-xl">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Verdict text */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-2xl mt-0.5 shrink-0">👵</span>
                    <div className="text-left">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-900">Shosh's matronly review</h4>
                      <p className="text-xs text-amber-950 font-extrabold leading-normal mt-0.5 whitespace-pre-wrap italic">
                        {estimatedResult.verdict}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setEstimatedResult(null)}
                      className="py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold border border-slate-200 text-xs transition-colors cursor-pointer"
                    >
                      Retake Test 🔄
                    </button>
                    
                    <button
                      onClick={handleShareResult}
                      className="py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {onSendVerificationToChat ? (
                        <>
                          <Share2 size={13} />
                          Share Result to Chat
                        </>
                      ) : copiedValue ? (
                        <>
                          <Check size={13} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          Copy Result
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
