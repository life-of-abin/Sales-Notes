import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../hooks/useBusiness';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function SplashScreen({ onFinish }) {
  const { language, t } = useBusiness();
  const [animationStage, setAnimationStage] = useState('intro'); // 'intro', 'assembled', 'ready'
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Stage 1: Components fly in and assemble (0 - 1.8s)
    const timer1 = setTimeout(() => {
      setAnimationStage('assembled');
    }, 1800);

    // Stage 2: Ready & interactive (2.6s)
    const timer2 = setTimeout(() => {
      setAnimationStage('ready');
      setShowButton(true);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleEnter = () => {
    if (onFinish) onFinish();
  };

  return (
    <div className="splash-screen" id="app-splash-screen" onClick={handleEnter}>
      {/* Sacred Geometry Mandala Background (matching reference) */}
      <div className="splash-mandala-bg">
        <svg className="mandala-svg" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="180" stroke="rgba(126, 71, 250, 0.18)" strokeWidth="1.5" strokeDasharray="6 4" />
          <circle cx="200" cy="200" r="140" stroke="rgba(245, 166, 9, 0.2)" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="100" stroke="rgba(126, 71, 250, 0.25)" strokeWidth="2" />
          <circle cx="200" cy="200" r="60" stroke="rgba(245, 166, 9, 0.3)" strokeWidth="1" strokeDasharray="4 4" />
          
          {/* Symmetrical Petals / Mandala Rays */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 200 200)`}>
              <path
                d="M200 60 C215 100 230 140 200 180 C170 140 185 100 200 60 Z"
                stroke="rgba(155, 105, 255, 0.16)"
                strokeWidth="1.2"
                fill="rgba(91, 30, 230, 0.03)"
              />
              <path
                d="M200 20 C220 70 240 120 200 160 C160 120 180 70 200 20 Z"
                stroke="rgba(245, 166, 9, 0.12)"
                strokeWidth="1"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Ambient Radial Glow Behind Logo */}
      <div className="splash-glow-core" />

      {/* Center 3D Choreographed Logo Assembly */}
      <div className="splash-logo-stage">
        <div className={`logo-assembler ${animationStage}`}>
          {/* 1. Yellow Business Notebook (Flying down from Top) */}
          <div className="logo-part notebook-part">
            <svg viewBox="0 0 160 170" fill="none" className="part-svg">
              <defs>
                <linearGradient id="nbCover" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFE066" />
                  <stop offset="40%" stopColor="#F5B318" />
                  <stop offset="100%" stopColor="#DF8E00" />
                </linearGradient>
                <linearGradient id="purpleRibbon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7E47FA" />
                  <stop offset="100%" stopColor="#440EB8" />
                </linearGradient>
                <filter id="partShadow" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#21004D" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Shadow & Main Yellow Book Body */}
              <rect x="25" y="15" width="125" height="145" rx="20" fill="url(#nbCover)" filter="url(#partShadow)" />
              
              {/* Purple Bookmark on top */}
              <path d="M95 5 L125 5 L125 42 L110 32 L95 42 Z" fill="url(#purpleRibbon)" />

              {/* Ring Binders on left */}
              <circle cx="25" cy="40" r="9" fill="#FFCA28" stroke="#DF8E00" strokeWidth="2.5" />
              <circle cx="25" cy="75" r="9" fill="#FFCA28" stroke="#DF8E00" strokeWidth="2.5" />
              <circle cx="25" cy="110" r="9" fill="#FFCA28" stroke="#DF8E00" strokeWidth="2.5" />
              <circle cx="25" cy="140" r="9" fill="#FFCA28" stroke="#DF8E00" strokeWidth="2.5" />

              {/* Mini Calculator on Right */}
              <rect x="92" y="48" width="44" height="42" rx="7" fill="#440EB8" />
              <rect x="97" y="53" width="34" height="9" rx="2" fill="#7E47FA" />
              <rect x="97" y="66" width="8" height="6" rx="1.5" fill="#F5B318" />
              <rect x="110" y="66" width="8" height="6" rx="1.5" fill="#F5B318" />
              <rect x="123" y="66" width="8" height="6" rx="1.5" fill="#F5B318" />
              <rect x="97" y="76" width="8" height="6" rx="1.5" fill="#F5B318" />
              <rect x="110" y="76" width="8" height="6" rx="1.5" fill="#F5B318" />
              <rect x="123" y="76" width="8" height="6" rx="1.5" fill="#F5B318" />

              {/* Ledger Lines */}
              <line x1="45" y1="52" x2="80" y2="52" stroke="#440EB8" strokeWidth="4" strokeLinecap="round" />
              <line x1="45" y1="65" x2="80" y2="65" stroke="#440EB8" strokeWidth="4" strokeLinecap="round" />
              <line x1="45" y1="78" x2="80" y2="78" stroke="#440EB8" strokeWidth="4" strokeLinecap="round" />

              {/* Clothes Hanger Symbol */}
              <path
                d="M85 105 C85 98 92 98 92 103 C92 108 85 110 85 116 L60 134 L110 134 L93 120"
                stroke="#440EB8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          {/* 2. Folded Violet Shirt (Flying up from Below with 3D fold snap) */}
          <div className="logo-part shirt-part">
            <svg viewBox="0 0 120 110" fill="none" className="part-svg">
              <defs>
                <linearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7B42F6" />
                  <stop offset="50%" stopColor="#5B1EE6" />
                  <stop offset="100%" stopColor="#3E0EB0" />
                </linearGradient>
                <filter id="shirtShadow" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#180036" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Folded Shirt Body */}
              <path
                d="M15 35 L50 20 L85 35 L95 90 C95 98 90 102 80 102 L25 102 C15 102 12 98 12 90 Z"
                fill="url(#shirtGrad)"
                filter="url(#shirtShadow)"
              />

              {/* Golden Collar */}
              <path d="M28 28 L50 55 L40 23 Z" fill="#5B1EE6" stroke="#FFD043" strokeWidth="2.5" />
              <path d="M72 28 L50 55 L60 23 Z" fill="#5B1EE6" stroke="#FFD043" strokeWidth="2.5" />
              <path d="M42 22 L50 30 L58 22 Z" fill="#FFCA28" />

              {/* Placket & Gold Buttons */}
              <line x1="50" y1="52" x2="50" y2="98" stroke="#3E0EB0" strokeWidth="5" strokeLinecap="round" />
              <circle cx="50" cy="64" r="3" fill="#FFD043" stroke="#DF8E00" strokeWidth="1" />
              <circle cx="50" cy="78" r="3" fill="#FFD043" stroke="#DF8E00" strokeWidth="1" />
              <circle cx="50" cy="92" r="3" fill="#FFD043" stroke="#DF8E00" strokeWidth="1" />

              {/* Gold Trim along edge */}
              <path d="M12 90 C12 98 15 102 25 102 L80 102 C90 102 95 98 95 90" stroke="#FFD043" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* 3. Golden Coins (Rolling & Stacking from Right) */}
          <div className="logo-part coins-part">
            <svg viewBox="0 0 100 100" fill="none" className="part-svg">
              <defs>
                <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFF176" />
                  <stop offset="40%" stopColor="#FFCA28" />
                  <stop offset="100%" stopColor="#DF8E00" />
                </linearGradient>
                <filter id="coinGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#B36200" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Coin 1 (Bottom) */}
              <g className="coin-layer coin-3">
                <ellipse cx="50" cy="76" rx="36" ry="14" fill="#C97800" />
                <ellipse cx="50" cy="72" rx="36" ry="14" fill="url(#goldCoinGrad)" />
              </g>

              {/* Coin 2 (Middle) */}
              <g className="coin-layer coin-2">
                <ellipse cx="50" cy="62" rx="36" ry="14" fill="#C97800" />
                <ellipse cx="50" cy="58" rx="36" ry="14" fill="url(#goldCoinGrad)" />
              </g>

              {/* Coin 3 (Top with Rupee Symbol) */}
              <g className="coin-layer coin-1">
                <ellipse cx="50" cy="46" rx="38" ry="16" fill="#C97800" />
                <ellipse cx="50" cy="40" rx="38" ry="16" fill="url(#goldCoinGrad)" filter="url(#coinGlow)" />
                <ellipse cx="50" cy="40" rx="33" ry="13" fill="none" stroke="#FFF59D" strokeWidth="1.5" />
                
                {/* Embossed ₹ Symbol */}
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="900"
                  fontSize="20"
                  fill="#1B0748"
                  letterSpacing="-0.5"
                >
                  ₹
                </text>
              </g>
            </svg>
          </div>

          {/* Sparkle flash upon fusion */}
          <div className="fusion-burst" />
        </div>
      </div>

      {/* Typography & Welcome Message (Matching Reference Style) */}
      <div className="splash-content">
        <h1 className="splash-title animate-fade-in">
          {language === 'ta' ? 'மை துக்கான்-க்கு வரவேற்கிறோம்' : 'Welcome to My Dukaan'}
        </h1>

        <div className="splash-subtitle-wrapper animate-fade-in-delayed">
          <span className="splash-accent-line">✦</span>
          <p className="splash-subtitle">
            {language === 'ta' ? 'ஆடைகள் வியாபார மேலாண்மை' : 'Smart Clothes Business Management'}
          </p>
          <span className="splash-accent-line">✦</span>
        </div>

        {/* Enter CTA / Next Trigger */}
        <div className={`splash-action-container ${showButton ? 'visible' : ''}`}>
          <button className="splash-enter-btn" onClick={handleEnter} id="btn-splash-enter">
            <span>{language === 'ta' ? 'கடையை திறக்க' : 'Open My Dukaan'}</span>
            <ArrowRight size={18} className="splash-btn-arrow" />
          </button>
        </div>
      </div>

      {/* Bottom Brand Credential (matching aura gold in reference) */}
      <div className="splash-footer">
        <div className="splash-brand-mark">
          <span className="brand-text">my dukaan</span>
          <Sparkles size={13} className="brand-sparkle" />
        </div>
      </div>
    </div>
  );
}
