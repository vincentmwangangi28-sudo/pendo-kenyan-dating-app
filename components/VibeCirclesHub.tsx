import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Calendar,
  MapPin,
  Users,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Compass,
  Loader2,
  Shield,
} from 'lucide-react';
import { UserProfile, VibeMeetupEvent } from '../types';
import {
  VIBE_CIRCLE_RULES,
  VIBE_COMPATIBILITY_QUIZ,
  scoreVibeCompatibilityQuiz,
} from '../src/lib/vibeCirclesData';
import { calculateTrustScore } from '../src/lib/trustScore';

interface VibeCirclesHubProps {
  userProfile: UserProfile;
  lastMeetupUpdate?: VibeMeetupEvent | null;
  onSaveQuizResult: (result: { recommendedCircle: string; vibeCircle: string }) => void;
  onEnterCircleChat: (groupChatId: string) => void;
  onExploreCircleProfiles: (circleName: string) => void;
  onOpenVerification: () => void;
  onOpenSafetyCheckin: (venueName: string) => void;
}

export const VibeCirclesHub: React.FC<VibeCirclesHubProps> = ({
  userProfile,
  lastMeetupUpdate,
  onSaveQuizResult,
  onEnterCircleChat,
  onExploreCircleProfiles,
  onOpenVerification,
  onOpenSafetyCheckin,
}) => {
  const [activeTab, setActiveTab] = useState<'CIRCLES' | 'MEETUPS' | 'QUIZ'>('CIRCLES');
  const [meetups, setMeetups] = useState<VibeMeetupEvent[]>([]);
  const [loadingMeetups, setLoadingMeetups] = useState(true);
  const [rsvpPendingId, setRsvpPendingId] = useState<string | null>(null);
  const [rsvpFeedback, setRsvpFeedback] = useState<{ eventId: string; type: 'ok' | 'err'; msg: string } | null>(null);

  // 4-Question Vibe Compatibility Quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizOutcome, setQuizOutcome] = useState<ReturnType<typeof scoreVibeCompatibilityQuiz> | null>(
    userProfile.vibeQuizCompleted && userProfile.recommendedVibeCircle
      ? {
          recommendedCircle: userProfile.recommendedVibeCircle,
          compatibilityPercent: 94,
          runnerUpCircle: 'Soft Life',
          sheshSummary: VIBE_CIRCLE_RULES[userProfile.recommendedVibeCircle]?.tagline || 'Verified Kenyan community match.',
        }
      : null
  );

  const userId = userProfile.uid || 'guest_user';
  const trustScore = userProfile.trustScore || calculateTrustScore(userProfile).total;
  const userAge = userProfile.age || 18;

  useEffect(() => {
    let cancelled = false;
    setLoadingMeetups(true);
    fetch(`/api/vibes/meetups?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.meetups) {
          setMeetups(data.meetups);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMeetups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!lastMeetupUpdate) return;
    setMeetups((prev) =>
      prev.map((m) => (m.id === lastMeetupUpdate.id ? { ...m, rsvpCount: lastMeetupUpdate.rsvpCount } : m))
    );
  }, [lastMeetupUpdate]);

  const handleAnswerQuiz = (questionId: string, optionId: string) => {
    const nextAnswers = { ...quizAnswers, [questionId]: optionId };
    setQuizAnswers(nextAnswers);

    if (quizStep + 1 < VIBE_COMPATIBILITY_QUIZ.length) {
      setQuizStep(quizStep + 1);
    } else {
      const outcome = scoreVibeCompatibilityQuiz(nextAnswers);
      setQuizOutcome(outcome);
      onSaveQuizResult({
        recommendedCircle: outcome.recommendedCircle,
        vibeCircle: outcome.recommendedCircle,
      });
    }
  };

  const handleToggleRsvp = async (event: VibeMeetupEvent) => {
    setRsvpPendingId(event.id);
    setRsvpFeedback(null);
    try {
      const res = await fetch('/api/vibes/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          userId,
          userName: userProfile.name || 'Pendo Member',
          userAge,
          userTrustScore: trustScore,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRsvpFeedback({
          eventId: event.id,
          type: 'err',
          msg: data?.error || 'Unable to RSVP for this meetup right now.',
        });
        return;
      }
      if (data?.event) {
        setMeetups((prev) => prev.map((m) => (m.id === data.event.id ? data.event : m)));
        setRsvpFeedback({
          eventId: event.id,
          type: 'ok',
          msg:
            data.action === 'JOINED'
              ? 'RSVP confirmed! Activate Matatu Fare Shield before heading out.'
              : 'RSVP cancelled.',
        });
      }
    } catch {
      setRsvpFeedback({
        eventId: event.id,
        type: 'err',
        msg: 'Network error confirming meetup RSVP.',
      });
    } finally {
      setRsvpPendingId(null);
    }
  };

  const circles = Object.values(VIBE_CIRCLE_RULES);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Kenyan Vibe Circles
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Age {userAge}+ · Ngao Trust{' '}
              <span className="font-mono font-bold tabular-nums text-emerald-700">{trustScore}%</span>
              {userProfile.recommendedVibeCircle ? ` · Match: ${userProfile.recommendedVibeCircle}` : ''}
            </p>
          </div>
          {trustScore < 70 && (
            <button
              type="button"
              onClick={onOpenVerification}
              className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ShieldCheck size={15} />
              <span>Verify 70%+</span>
            </button>
          )}
        </div>

        {/* Sub-Navigation Pills */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'CIRCLES', label: 'Circle Lounges' },
            { id: 'MEETUPS', label: `Meetups (${meetups.length})` },
            { id: 'QUIZ', label: quizOutcome ? 'Quiz Result' : 'Vibe Quiz' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`min-h-[40px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* TAB 1: GATED KENYAN VIBE CIRCLES */}
        {activeTab === 'CIRCLES' && (
          <div className="space-y-3">
            {!quizOutcome && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles size={14} /> 30-Second Kenyan Vibe Quiz
                  </p>
                  <p className="text-xs text-slate-200 mt-0.5">
                    Find out whether you belong in Kilimani Mums, Mama wa Harrier, Ben 10, or Wababa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('QUIZ')}
                  className="min-h-[44px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Take Quiz
                </button>
              </div>
            )}

            {circles.map((circle) => {
              const meetsAge = userAge >= circle.minAge;
              const meetsTrust = trustScore >= circle.minTrustScore;
              const unlocked = meetsAge && meetsTrust;
              const isRecommended = userProfile.recommendedVibeCircle === circle.name;

              return (
                <article
                  key={circle.name}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900">{circle.name}</h2>
                        {isRecommended && (
                          <span className="text-[11px] font-bold text-rose-600">· Top Quiz Fit</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{circle.tagline}</p>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold tabular-nums shrink-0 ${
                        unlocked ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {unlocked ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={14} /> Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Lock size={13} /> {circle.minAge}+ · {circle.minTrustScore}%
                        </span>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{circle.description}</p>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Entry Gate: <span className="font-mono tabular-nums">{circle.minAge}+ yrs</span> · Trust{' '}
                    <span className="font-mono tabular-nums">{circle.minTrustScore}%+</span>
                    {circle.recommendedTier !== 'FREE' ? ` · ${circle.recommendedTier} Priority` : ''}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {unlocked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEnterCircleChat(circle.groupChatId)}
                          className="flex-1 min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={15} />
                          <span>Enter Lounge</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onExploreCircleProfiles(circle.name)}
                          className="flex-1 min-h-[44px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Compass size={15} />
                          <span>Browse Singles</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenVerification}
                        className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck size={15} />
                        <span>
                          {!meetsAge
                            ? `Requires Age ${circle.minAge}+ in Profile`
                            : `Verify Selfie to Unlock (${trustScore}% / ${circle.minTrustScore}%)`}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* TAB 2: VIBE CIRCLE EVENT MEETUPS & RSVPS */}
        {activeTab === 'MEETUPS' && (
          <div className="space-y-3">
            {loadingMeetups ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 size={24} className="animate-spin text-rose-600" />
                <span className="text-xs font-medium">Loading Kenyan Vibe Meetups...</span>
              </div>
            ) : (
              meetups.map((event) => {
                const isPending = rsvpPendingId === event.id;
                const feedback = rsvpFeedback?.eventId === event.id ? rsvpFeedback : null;
                return (
                  <article
                    key={event.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-rose-600">
                          {event.vibeCircle} · {event.city}
                        </p>
                        <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{event.title}</h2>
                      </div>
                      <span className="text-xs font-mono font-bold tabular-nums text-emerald-700 shrink-0">
                        {event.coverKes === 0 ? 'Free Entry' : `KES ${event.coverKes.toLocaleString()}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>

                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-rose-600 shrink-0" />
                        <span className="font-semibold">{event.venueName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} /> {event.dateLabel}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold text-slate-700">
                          <Users size={13} /> {event.rsvpCount}/{event.maxCapacity} going
                        </span>
                        <span>·</span>
                        <span>Host: {event.safeHostName}</span>
                      </div>
                    </div>

                    {feedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-semibold ${
                          feedback.type === 'ok'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {feedback.msg}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleRsvp(event)}
                        className={`flex-1 min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          event.hasRsvped
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        } disabled:opacity-60`}
                      >
                        {isPending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : event.hasRsvped ? (
                          <>
                            <CheckCircle2 size={15} />
                            <span>Going · Tap to Cancel</span>
                          </>
                        ) : (
                          <span>RSVP to Meetup</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSafetyCheckin(event.venueName)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Activate Matatu Fare Shield for this venue"
                      >
                        <Shield size={15} className="text-emerald-600" />
                        <span>Fare Shield</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: VIBE COMPATIBILITY QUIZ */}
        {activeTab === 'QUIZ' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            {quizOutcome ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                    Your Kenyan Vibe Circle Match
                  </span>
                  <span className="font-mono font-extrabold text-sm tabular-nums text-emerald-700">
                    {quizOutcome.compatibilityPercent}% Match
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">{quizOutcome.recommendedCircle}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{quizOutcome.sheshSummary}</p>
                <p className="text-xs text-slate-500">
                  Runner-up circle: <span className="font-bold text-slate-800">{quizOutcome.runnerUpCircle}</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onExploreCircleProfiles(quizOutcome.recommendedCircle)}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Meet {quizOutcome.recommendedCircle} Singles</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizOutcome(null);
                      setQuizAnswers({});
                      setQuizStep(0);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Retake Quiz
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-rose-600">Vibe Compatibility Quiz</span>
                  <span className="font-mono tabular-nums font-bold">
                    {quizStep + 1} / {VIBE_COMPATIBILITY_QUIZ.length}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {VIBE_COMPATIBILITY_QUIZ[quizStep].prompt}
                </h2>
                <div className="space-y-2.5">
                  {VIBE_COMPATIBILITY_QUIZ[quizStep].options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid="vibe-quiz-option"
                      onClick={() => handleAnswerQuiz(VIBE_COMPATIBILITY_QUIZ[quizStep].id, opt.id)}
                      className="w-full min-h-[48px] p-3.5 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/40 text-left text-xs font-bold text-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      <ArrowRight size={15} className="text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
