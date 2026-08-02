/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'crest-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textColor?: 'light' | 'dark' | 'auto';
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'horizontal',
  size = 'md',
  textColor = 'auto',
  light = false
}) => {
  // Dimensions mapping for text sizes
  const sizeMap = {
    sm: { textTitle: 'text-sm sm:text-base', textSub: 'text-[8px] sm:text-[9px]' },
    md: { textTitle: 'text-base sm:text-lg', textSub: 'text-[9px] sm:text-[10px]' },
    lg: { textTitle: 'text-xl sm:text-2xl', textSub: 'text-xs' },
    xl: { textTitle: 'text-3xl sm:text-4xl', textSub: 'text-sm' }
  };

  const currentSize = sizeMap[size];

  if (variant === 'crest-only') {
    return null;
  }

  // Text color states
  const isLight = light || textColor === 'light';
  const titleColorClass = isLight
    ? 'text-white'
    : textColor === 'dark'
    ? 'text-slate-900'
    : 'text-slate-950 dark:text-white';

  const subColorClass = isLight
    ? 'text-blue-200'
    : textColor === 'dark'
    ? 'text-blue-700'
    : 'text-blue-700 dark:text-blue-400';

  const alignmentClass = variant === 'vertical' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col ${alignmentClass} leading-tight select-none ${className}`}>
      <div className="flex items-center gap-1 leading-none">
        <span className={`font-black tracking-tight ${currentSize.textTitle} ${titleColorClass}`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          LYnx
        </span>
        <span className={`font-black tracking-tight ${currentSize.textTitle} text-blue-600 dark:text-blue-400`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          EDU
        </span>
      </div>
      <span className={`font-bold tracking-widest uppercase mt-0.5 ${currentSize.textSub} ${subColorClass}`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        Sistemas Escolares Inteligentes
      </span>
    </div>
  );
};
