import React, { useState } from 'react';

export default function Logo({ size = 'md', variant = 'dark', showText = true }) {
  const [imageError, setImageError] = useState(false);
  const isLight = variant === 'light';

  // Configurable dimensions
  const sizeConfig = {
    xs: { img: 'h-7 w-7', text: 'text-base', sub: 'text-[9px]' },
    sm: { img: 'h-9 w-9', text: 'text-lg', sub: 'text-[10px]' },
    md: { img: 'h-11 w-11 sm:h-12 sm:w-12', text: 'text-xl sm:text-2xl', sub: 'text-[11px]' },
    lg: { img: 'h-16 w-16 sm:h-20 sm:w-20', text: 'text-2xl sm:text-3xl', sub: 'text-xs' },
    xl: { img: 'h-24 w-24 sm:h-28 sm:w-28', text: 'text-3xl sm:text-4xl', sub: 'text-sm' },
  }[size] || { img: 'h-11 w-11', text: 'text-xl', sub: 'text-[11px]' };

  return (
    <div className="flex items-center gap-3 select-none">
      {!imageError ? (
        <img
          src="/logo.png"
          alt="My Pet Center Logo"
          onError={() => setImageError(true)}
          className={`${sizeConfig.img} object-contain rounded-xl shadow-xs bg-white p-0.5 border border-plum-soft/40`}
        />
      ) : (
        <div className={`${sizeConfig.img} bg-teal-dark text-white flex items-center justify-center rounded-xl font-black text-xs shadow-xs`}>
          MPC
        </div>
      )}

      {showText && (
        <div className="flex flex-col text-left">
          <div className={`font-black font-display tracking-tight leading-none ${sizeConfig.text}`}>
            <span className={isLight ? 'text-white' : 'text-plum-deep'}>MY PET </span>
            <span className={isLight ? 'text-teal-light' : 'text-teal-dark'}>CENTER</span>
          </div>
          <span
            className={`font-extrabold uppercase tracking-widest mt-1 ${
              isLight ? 'text-plum-soft' : 'text-plum-light'
            } ${sizeConfig.sub}`}
          >
            Sheikh Zayed
          </span>
        </div>
      )}
    </div>
  );
}
