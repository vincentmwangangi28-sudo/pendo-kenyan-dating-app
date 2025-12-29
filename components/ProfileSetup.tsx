import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Button } from './Button';
import { enhanceBio, verifyPhotoGesture } from '../services/geminiService';
import { Sparkles, MapPin, Camera, Navigation, Mic, Square, Trash2, ShieldCheck, X, Loader2, CheckCircle2, RefreshCw, Info } from 'lucide-react';

interface ProfileSetupProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export const KENYAN_CITIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale", "Machakos",
  "Nyeri", "Naivasha", "Lamu", "Meru", "Kericho", "Kakamega", "Garissa", "Isiolo", "Embu",
  "Bungoma", "Busia", "Voi", "Kilifi", "Murang'a", "Homa Bay"
];

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Nairobi": { lat: -1.2921, lng: 36.8219 },
  "Mombasa": { lat: -4.0435, lng: 39.6682 },
  "Kisumu": { lat: -0.0917, lng: 34.7680 },
  "Nakuru": { lat: -0.3031, lng: 36.0800 },
  "Eldoret": { lat: 0.5143, lng: 35.2698 },
  "Thika": { lat: -1.0388, lng: 37.0834 },
  "Malindi": { lat: -3.2192, lng: 40.1169 },
  "Kitale": { lat: 1.0191, lng: 35.0023 },
  "Machakos": { lat: -1.5177, lng: 37.2634 },
  "Nyeri": { lat: -0.4167, lng: 36.9500 },
  "Naivasha": { lat: -0.7172, lng: 36.4310 },
  "Lamu": { lat: -2.2696, lng: 40.9020 },
  "Meru": { lat: 0.0463, lng: 37.6559 },
  "Kericho": { lat: -0.3689, lng: 35.2863 },
  "Kakamega": { lat: 0.2827, lng: 34.7519 },
  "Garissa": { lat: -0.4532, lng: 39.6461 },
  "Isiolo": { lat: 0.3546, lng: 37.5822 },
  "Embu": { lat: -0.5388, lng: 37.4587 },
  "Bungoma": { lat: 0.5635, lng: 34.5606 },
  "Busia": { lat: 0.4608, lng: 34.1115 },
  "Voi": { lat: -3.3915, lng: 38.5562 },
  "Kilifi": { lat: -3.6305, lng: 39.8499 },
  "Murang'a": { lat: -0.7167, lng: 37.1500 },
  "Homa Bay": { lat: -0.5273, lng: 34.4571 }
};

export const INTERESTS_LIST = [
  "Safari", "Afrobeats", "Tech", "Cooking", "Football", "Rugby", "Hiking", 
  "Nyama Choma", "Coffee", "Art", "Politics", "Traveling", "Dancing", "Matatu Culture", "Reggae"
];

const LANGUAGES_LIST = [
  "English", "Swahili", "Sheng", "Kikuyu", "Luo", "Kamba", "Kalenjin", "Luhya", "Kisii"
];

const VERIFICATION_GESTURES = [
  { id: 'peace', label: 'Peace Sign ✌️', icon: '✌️' },
  { id: 'thumbs_up', label: 'Thumbs Up 👍', icon: '👍' },
  { id: 'open_palm', label: 'Open Palm ✋', icon: '✋' },
  { id: 'ok_sign', label: 'OK Sign 👌', icon: '👌' },
];

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ initialProfile, onSave }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementSuccess, setEnhancementSuccess] = useState(false);
  const [justPolished, setJustPolished] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [usingGps, setUsingGps] = useState(!!initialProfile.coordinates);
  const [showGpsTooltip, setShowGpsTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(profile.voiceUrl || null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Verification State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'camera' | 'verifying' | 'success' | 'failed'>('idle');
  const [targetGesture, setTargetGesture] = useState(VERIFICATION_GESTURES[0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleInterestToggle = (interest: string) => {
    setProfile(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      }
      if (prev.interests.length >= 5) return prev; // Max 5
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleLanguageToggle = (lang: string) => {
    setProfile(prev => {
      const exists = prev.languages.includes(lang);
      if (exists) {
        return { ...prev, languages: prev.languages.filter(l => l !== lang) };
      }
      return { ...prev, languages: [...prev.languages, lang] };
    });
  };

  const handleAIEnhance = async () => {
    if (!profile.bio) return;
    setIsEnhancing(true);
    setEnhancementSuccess(false);
    try {
        const newBio = await enhanceBio(profile.bio, profile.interests, profile.name);
        setProfile(prev => ({ ...prev, bio: newBio }));
        setEnhancementSuccess(true);
        setJustPolished(true);
        setTimeout(() => setEnhancementSuccess(false), 2000);
        setTimeout(() => setJustPolished(false), 1000);
    } catch (e) {
        console.error(e);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    let newCoords = profile.coordinates;

    // If not explicitly using GPS, update coordinates based on city center
    if (!usingGps) {
        if (city && CITY_COORDINATES[city]) {
            newCoords = {
                latitude: CITY_COORDINATES[city].lat,
                longitude: CITY_COORDINATES[city].lng
            };
        } else {
            // Clear coordinates if city is deselected and GPS is off
            newCoords = undefined;
        }
    }
    
    setProfile({
        ...profile, 
        location: city,
        coordinates: newCoords
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile(prev => ({
          ...prev,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        setUsingGps(true);
        setGettingLocation(false);
      },
      (error: any) => {
        console.error("Error getting location:", error);
        
        let msg = "Unable to retrieve your location.";
        if (error.code === 1) { // PERMISSION_DENIED
            msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
            msg = "Location information is unavailable. Ensure GPS is enabled.";
        } else if (error.code === 3) { // TIMEOUT
            msg = "Location request timed out. Please try again.";
        } else if (error.message) {
            msg = `Location error: ${error.message}`;
        }
        
        alert(msg);
        setGettingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: Infinity }
    );
  };

  const handleRemoveLocation = () => {
    setUsingGps(false);
    // Revert to city coordinates if available
    if (profile.location && CITY_COORDINATES[profile.location]) {
         setProfile(prev => ({ 
             ...prev, 
             coordinates: {
                 latitude: CITY_COORDINATES[profile.location].lat,
                 longitude: CITY_COORDINATES[profile.location].lng
             } 
         }));
    } else {
        setProfile(prev => ({ ...prev, coordinates: undefined }));
    }
  };

  // --- Audio Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setProfile(prev => ({ ...prev, voiceUrl: url }));
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setProfile(prev => ({ ...prev, voiceUrl: undefined }));
  };

  // --- Verification Handlers ---
  const startVerification = async () => {
    const randomGesture = VERIFICATION_GESTURES[Math.floor(Math.random() * VERIFICATION_GESTURES.length)];
    setTargetGesture(randomGesture);
    setVerificationStep('camera');
    setShowVerificationModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera for verification. Please check permissions.");
      setShowVerificationModal(false);
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Draw video frame to canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());

      setVerificationStep('verifying');

      const isMatch = await verifyPhotoGesture(imageBase64, targetGesture.label);

      if (isMatch) {
        setVerificationStep('success');
        setProfile(prev => ({ ...prev, isVerified: true }));
        setTimeout(() => {
          setShowVerificationModal(false);
        }, 3000); // 3 seconds to celebrate
      } else {
        setVerificationStep('failed');
      }
    }
  };

  const closeVerification = () => {
    // Ensure stream is stopped
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowVerificationModal(false);
    setVerificationStep('idle');
  };

  return (
    <div className="max-w-md mx-auto p-6 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Create Your Profile</h2>
        <p className="text-slate-500">Let's introduce you to the Pendo community.</p>
      </div>

      <div className="space-y-6">
        {/* Photo Upload */}
        <div className="flex justify-center">
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className={`w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl bg-slate-100 relative transition-colors duration-300 ${profile.isVerified ? 'border-blue-500 ring-4 ring-blue-100' : 'border-white'}`}>
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
            
            {profile.isVerified && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm z-10" title="Verified Profile">
                <ShieldCheck size={16} fill="currentColor" />
              </div>
            )}
            
            <button 
              type="button"
              className="absolute bottom-0 right-0 bg-rose-600 p-2 rounded-full text-white shadow-lg hover:bg-rose-700 transition-colors z-10"
            >
              <Camera size={20} />
            </button>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Verification Section */}
        <div className={`border rounded-xl p-4 flex items-center justify-between transition-colors duration-300 ${profile.isVerified ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div>
             <h3 className={`font-bold flex items-center gap-1 ${profile.isVerified ? 'text-blue-900' : 'text-slate-900'}`}>
               <ShieldCheck size={18} className={profile.isVerified ? "text-blue-600" : "text-slate-400"} /> 
               {profile.isVerified ? "Profile Verified" : "Get Verified"}
             </h3>
             <p className={`text-xs mt-1 ${profile.isVerified ? 'text-blue-700' : 'text-slate-500'}`}>
               {profile.isVerified ? "You have a trusted badge on your profile." : "Take a quick selfie to earn a trusted badge."}
             </p>
          </div>
          {profile.isVerified ? (
             <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 flex items-center gap-1">
               <CheckCircle2 size={12} /> Verified
             </span>
          ) : (
            <button 
              onClick={startVerification}
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-slate-800 shadow-md transition-colors"
            >
              Verify Me
            </button>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-colors"
              placeholder="e.g. Kamau"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
            <input 
              type="number" 
              value={profile.age || ''}
              onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Enhanced Location Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MapPin size={16} className="text-rose-500" /> Location Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <select 
                  value={profile.location}
                  onChange={handleCityChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-white text-sm"
                >
                  <option value="">Select...</option>
                  {KENYAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Neighborhood (Optional)</label>
                <input 
                  type="text"
                  value={profile.neighborhood || ''}
                  onChange={(e) => setProfile({...profile, neighborhood: e.target.value})}
                  placeholder="e.g. Westlands, Kilimani..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-white text-sm"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
               <div className="flex items-center justify-between mb-3 relative">
                 <div className="flex flex-col relative z-0">
                     <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                       <Navigation size={12} /> High Accuracy GPS
                       <button 
                         type="button" 
                         onClick={() => setShowGpsTooltip(!showGpsTooltip)}
                         className="text-slate-400 hover:text-rose-500 transition-colors"
                         aria-label="GPS Info"
                       >
                         <Info size={12} />
                       </button>
                     </label>
                     <span className="text-[10px] text-slate-400">
                        {usingGps ? "Using precise device location" : "Using selected city center"}
                     </span>
                 </div>
                 
                 {/* Tooltip */}
                 {showGpsTooltip && (
                   <div className="absolute top-full left-0 mt-2 z-20 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl animate-fade-in border border-slate-700">
                      <div className="space-y-2">
                        <div>
                          <span className="font-bold text-green-400 block mb-0.5">High Accuracy (GPS)</span>
                          <span className="text-slate-300 leading-snug">Shares your precise device location for exact distance matching with others.</span>
                        </div>
                        <div className="w-full h-px bg-slate-700"></div>
                        <div>
                          <span className="font-bold text-slate-300 block mb-0.5">City Center</span>
                          <span className="text-slate-400 leading-snug">Uses the approximate location of your selected city. Better for privacy.</span>
                        </div>
                      </div>
                      <div className="absolute -top-1.5 left-9 w-3 h-3 bg-slate-900 border-t border-l border-slate-700 rotate-45"></div>
                      <button 
                        onClick={() => setShowGpsTooltip(false)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-white p-1"
                      >
                        <X size={12} />
                      </button>
                   </div>
                 )}
                 
                 {/* Toggle Switch */}
                 <button 
                    type="button"
                    disabled={gettingLocation}
                    onClick={() => usingGps ? handleRemoveLocation() : handleGetLocation()}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${usingGps ? 'bg-rose-600' : 'bg-slate-200'} ${gettingLocation ? 'opacity-70 cursor-wait' : ''}`}
                    title={usingGps ? "Disable GPS" : "Enable GPS"}
                 >
                    <span 
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${usingGps ? 'translate-x-6' : 'translate-x-1'}`} 
                    />
                 </button>
               </div>
               
               {usingGps && (
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                  >
                     <RefreshCw size={12} className={gettingLocation ? "animate-spin" : ""} />
                     {gettingLocation ? "Updating..." : "Refresh Current Location"}
                  </button>
               )}
               
               {gettingLocation && (
                   <div className="text-center text-xs text-slate-500 py-2">
                       <Loader2 size={14} className="animate-spin inline mr-1" /> Locating...
                   </div>
               )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">About You</label>
          <div className="relative">
            <textarea 
              value={profile.bio}
              disabled={isEnhancing}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              className={`w-full px-4 py-3 rounded-xl border outline-none min-h-[120px] transition-all duration-500 
                ${isEnhancing 
                    ? 'bg-slate-50 text-slate-400 border-slate-200' 
                    : justPolished 
                        ? 'bg-green-50 text-slate-900 border-green-400 ring-1 ring-green-400' 
                        : 'bg-white border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                }
              `}
              placeholder="Tell us about yourself..."
            />
            <button 
              onClick={handleAIEnhance}
              disabled={isEnhancing || !profile.bio}
              className={`absolute bottom-3 right-3 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 ${
                  enhancementSuccess 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
              }`}
            >
              {isEnhancing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Polishing...
                  </>
              ) : enhancementSuccess ? (
                  <>
                    <CheckCircle2 size={14} />
                    Polished!
                  </>
              ) : (
                  <>
                    <Sparkles size={14} />
                    AI Polish
                  </>
              )}
            </button>
          </div>
        </div>

        {/* Voice Intro Section */}
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <label className="block text-sm font-bold text-rose-800 mb-2 flex items-center gap-2">
            <Mic size={16} /> Voice Intro
          </label>
          <p className="text-xs text-rose-600/80 mb-3">Record a short greeting (max 15s) to let matches hear your voice.</p>
          
          <div className="flex items-center gap-3">
            {!audioUrl ? (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                {isRecording ? (
                  <> <Square size={16} fill="currentColor" /> Stop Recording </>
                ) : (
                  <> <Mic size={16} /> Record Intro </>
                )}
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-rose-200">
                <audio src={audioUrl} controls className="w-full h-8" />
                <button 
                  onClick={deleteRecording}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                  title="Delete recording"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Languages Spoken</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES_LIST.map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageToggle(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  profile.languages.includes(lang)
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Interests (Pick up to 5)</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS_LIST.map(interest => (
              <button
                key={interest}
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  profile.interests.includes(interest)
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={() => onSave(profile)} className="w-full mt-4">
          Save & Start Matching
        </Button>
      </div>
      
      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative shadow-2xl">
            <button onClick={closeVerification} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
              <X size={20} />
            </button>
            
            {verificationStep === 'camera' && (
              <div className="relative bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-[450px] object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-between p-6 pointer-events-none">
                  <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    Mimic this gesture
                  </div>
                  <div className="flex flex-col items-center gap-3 mb-10 animate-bounce">
                     <div className="text-7xl drop-shadow-xl">{targetGesture.icon}</div>
                     <div className="text-2xl font-bold text-white drop-shadow-md bg-black/30 px-3 py-1 rounded-lg">{targetGesture.label}</div>
                  </div>
                </div>
                <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto">
                  <button 
                    onClick={captureAndVerify}
                    className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all active:scale-95"
                    aria-label="Take Photo"
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-inner"></div>
                  </button>
                </div>
              </div>
            )}
            
            {verificationStep === 'verifying' && (
              <div className="h-[450px] flex flex-col items-center justify-center p-8 bg-slate-900 text-white text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                  <Loader2 size={48} className="animate-spin text-blue-500 mb-6 relative z-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">Analyzing Gesture...</h3>
                <p className="text-slate-400">Our AI is verifying your pose.</p>
              </div>
            )}
            
            {verificationStep === 'success' && (
               <div className="h-[450px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white text-center">
                 <div className="w-24 h-24 bg-white text-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-[bounce_1s_infinite]">
                   <ShieldCheck size={48} />
                 </div>
                 <h3 className="text-3xl font-bold mb-2">You're Verified!</h3>
                 <p className="text-green-100 text-lg">Your profile now has the trusted badge.</p>
               </div>
            )}
            
            {verificationStep === 'failed' && (
               <div className="h-[450px] flex flex-col items-center justify-center p-8 bg-slate-900 text-white text-center">
                 <div className="text-6xl mb-6">😕</div>
                 <h3 className="text-xl font-bold mb-2">Couldn't verify</h3>
                 <p className="text-slate-400 mb-8 max-w-[200px] mx-auto">We couldn't clearly see the <strong>{targetGesture.label}</strong> gesture. Please try again.</p>
                 <button 
                   onClick={startVerification}
                   className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                 >
                   <RefreshCw size={18} /> Try Again
                 </button>
               </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
};