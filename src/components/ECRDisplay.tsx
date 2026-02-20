'use client'

import { useState } from 'react'

type ECRDisplayProps = {
  ecr: number
  overrideNote?: string | null
  className?: string
}

export function ECRDisplay({ ecr, overrideNote, className = '' }: ECRDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!overrideNote) {
    // No override note, just display ECR normally
    return (
      <span className={`text-[10px] font-mono text-accent shrink-0 ${className}`}>
        ECR #{ecr}
      </span>
    )
  }

  // Has override note, show with warning icon and tooltip
  return (
    <div className="relative inline-block">
      <span 
        className={`text-[10px] font-mono text-amber-400 shrink-0 cursor-help flex items-center gap-1 ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-amber-400">⚠️</span>
        ECR #{ecr}
      </span>
      
      {showTooltip && (
        <>
          {/* Backdrop to close tooltip when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowTooltip(false)}
          />
          
          {/* Tooltip */}
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border rounded-md shadow-xl">
            <div className="text-xs font-mono text-foreground leading-relaxed">
              {overrideNote}
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border"></div>
          </div>
        </>
      )}
    </div>
  )
}