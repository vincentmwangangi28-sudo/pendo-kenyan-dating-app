import { UserProfile } from '../../types';

export function calculateTrustScore(profile: UserProfile): {
  total: number;
  breakdown: { label: string; points: number; earned: boolean }[];
} {
  const hasPhotoAndName = Boolean(profile.name && profile.name.trim().length >= 2 && profile.photoUrl);
  const hasRichBioAndInterests = Boolean(profile.bio && profile.bio.length >= 20 && (profile.interests?.length || 0) >= 2);
  const hasVoiceIntro = Boolean(profile.voiceUrl);
  const hasMpesaOrGold = Boolean(profile.mpesaPhone || profile.subscriptionTier === 'GOLD' || profile.subscriptionTier === 'VIP');
  const isSelfieVerified = Boolean(profile.isVerified);

  const breakdown = [
    { label: 'Google SSO / Identity Profile', points: 20, earned: hasPhotoAndName },
    { label: 'Bio & Kenyan Interests Completed', points: 20, earned: hasRichBioAndInterests },
    { label: '15s Voice Intro Recorded', points: 15, earned: hasVoiceIntro },
    { label: 'M-Pesa / Pendo Gold Verified', points: 15, earned: hasMpesaOrGold },
    { label: 'Live AI Camera Gesture Selfie', points: 30, earned: isSelfieVerified }
  ];

  const total = breakdown.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0);
  return { total, breakdown };
}
