import React, { useEffect, useRef } from 'react';

interface AdSenseBannerProps {
  slotId?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
  isGoldMember?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId = 'default',
  format = 'auto',
  className = '',
  isGoldMember = false
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (isGoldMember) return;
    if (isLoadedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        // Ensure adsbygoogle script is loaded asynchronously without blocking main thread
        if (!document.querySelector('script[src*="adsbygoogle"]')) {
          const s = document.createElement('script');
          s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1375386376692976";
          s.async = true;
          s.crossOrigin = "anonymous";
          document.head.appendChild(s);
        }

        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoadedRef.current = true;
      }
    } catch (e) {
      // Ignore ad blocker or duplicate load errors gracefully
    }
  }, [isGoldMember]);

  // Pendo Gold and VIP members enjoy a 100% ad-free experience
  if (isGoldMember) {
    return null;
  }

  return (
    <aside aria-label="Sponsored Content" className={`w-full text-center overflow-hidden my-3 ${className}`}>
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-200 mb-1">
        Sponsored · Pendo Partner Network
      </div>
      <div className="min-h-[60px] bg-slate-900/60 border border-white/20 rounded-xl flex items-center justify-center p-2 relative overflow-hidden backdrop-blur-xs">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-1375386376692976"
          data-ad-slot={slotId !== 'default' ? slotId : undefined}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
};
