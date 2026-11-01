import React from 'react';

interface WaveGraphicProps {
  className?: string;
  variant?: 'hero' | 'card' | 'conduit';
}

export const WaveGraphic: React.FC<WaveGraphicProps> = ({ className = '', variant = 'hero' }) => {
  if (variant === 'card') {
    return (
      <div className={`relative overflow-hidden w-full h-20 flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 300 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(18,97,93,0.35)]"
        >
          <defs>
            <linearGradient id="cardWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#12615D" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#397F86" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#67C9C5" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C5A46D" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="cardWave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C5A46D" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#397F86" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#12615D" stopOpacity="0.4" />
            </linearGradient>
            <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d="M-20 60 C 60 20, 100 80, 160 40 C 220 0, 260 70, 320 30"
            stroke="url(#cardWave1)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#cardGlow)"
          />
          <path
            d="M-20 70 C 50 40, 120 85, 180 50 C 240 15, 270 65, 320 45"
            stroke="url(#cardWave2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <path
            d="M-20 45 C 70 80, 130 20, 190 65 C 250 110, 280 40, 320 60"
            stroke="url(#cardWave1)"
            strokeWidth="1.5"
            opacity="0.5"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'conduit') {
    return (
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
        <svg
          viewBox="0 0 1000 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="conduitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#25865E" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#12615D" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#397F86" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#67C9C5" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C5A46D" stopOpacity="0.5" />
            </linearGradient>
            <filter id="conduitGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 50 60 Q 250 20, 500 60 T 950 60"
            stroke="url(#conduitGrad)"
            strokeWidth="3"
            filter="url(#conduitGlow)"
          />
          <path
            d="M 50 60 Q 250 80, 500 60 T 950 60"
            stroke="url(#conduitGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            opacity="0.6"
          />
        </svg>
      </div>
    );
  }

  // Hero variant - rich multi-strand flowing 3D glowing ribbon wave in teal/champagne
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 600 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_0_20px_rgba(18,97,93,0.3)]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="heroRibbon1" x1="0%" y1="80%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#12615D" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#397F86" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#67C9C5" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#C5A46D" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#12615D" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="heroRibbon2" x1="10%" y1="100%" x2="90%" y2="0%">
            <stop offset="0%" stopColor="#397F86" stopOpacity="0.3" />
            <stop offset="45%" stopColor="#12615D" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#C5A46D" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#67C9C5" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="heroMeshFill" x1="20%" y1="100%" x2="80%" y2="10%">
            <stop offset="0%" stopColor="#12615D" stopOpacity="0.03" />
            <stop offset="50%" stopColor="#397F86" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#C5A46D" stopOpacity="0.02" />
          </linearGradient>
          <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur1" />
            <feGaussianBlur stdDeviation="2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient background glow orb */}
        <circle cx="340" cy="160" r="120" fill="#12615D" opacity="0.1" filter="blur(50px)" />
        <circle cx="460" cy="140" r="90" fill="#397F86" opacity="0.08" filter="blur(40px)" />

        {/* Shaded mesh ribbon between primary curves */}
        <path
          d="M 40 220 C 140 260, 220 120, 320 180 C 420 240, 500 100, 580 140 L 580 160 C 490 120, 410 260, 310 200 C 210 140, 130 280, 40 240 Z"
          fill="url(#heroMeshFill)"
        />

        {/* Core luminous wave strands */}
        <path
          d="M 30 230 C 130 270, 210 110, 320 170 C 430 230, 510 90, 580 130"
          stroke="url(#heroRibbon1)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#heroGlow)"
        />
        <path
          d="M 50 215 C 150 250, 230 130, 330 190 C 430 250, 490 120, 570 150"
          stroke="url(#heroRibbon2)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 70 200 C 170 230, 250 150, 340 210 C 430 270, 480 140, 560 170"
          stroke="url(#heroRibbon1)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
          opacity="0.6"
        />
        <path
          d="M 20 245 C 120 290, 200 90, 310 150 C 420 210, 520 70, 590 115"
          stroke="url(#heroRibbon2)"
          strokeWidth="1.5"
          opacity="0.45"
        />
        <path
          d="M 80 260 C 180 200, 260 80, 360 140 C 460 200, 530 80, 590 90"
          stroke="url(#heroRibbon1)"
          strokeWidth="1"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};
