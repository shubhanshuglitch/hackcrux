import React from 'react';

export default function BrandMark({ size = 24, className = '' }) {
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brand-core-grad-v4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f1d3b" />
          <stop offset="100%" stopColor="#184d79" />
        </linearGradient>
        <linearGradient id="brand-edge-grad-v4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ee1ff" />
          <stop offset="100%" stopColor="#6d8cff" />
        </linearGradient>
        <linearGradient id="brand-pulse-grad-v4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8f70" />
          <stop offset="100%" stopColor="#ff4d6d" />
        </linearGradient>
      </defs>

      <circle cx="64" cy="64" r="58" fill="url(#brand-core-grad-v4)" />
      <circle cx="64" cy="64" r="52" fill="none" stroke="url(#brand-edge-grad-v4)" strokeWidth="4" opacity="0.9" />
      <circle cx="64" cy="64" r="43" fill="#eef6ff" fillOpacity="0.12" />
      <path d="M23 70h15l8-13 13 24 9-19h37" fill="none" stroke="url(#brand-pulse-grad-v4)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M63 33v14M56 40h14" fill="none" stroke="#d6f3ff" strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
      <text x="64" y="104" textAnchor="middle" fill="#d8eeff" fontSize="16" fontWeight="800" letterSpacing="1.5">ER</text>
    </svg>
  );
}
