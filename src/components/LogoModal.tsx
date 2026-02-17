"use client"

import { useEffect, useCallback } from "react"
import Image from "next/image"

interface LogoModalProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export default function LogoModal({ src, alt, isOpen, onClose }: LogoModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] text-white/80 hover:text-white transition-colors bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold leading-none"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Large logo */}
      <div
        className="relative max-w-[80vw] max-h-[80vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={600}
          height={600}
          className="max-w-[80vw] max-h-[80vh] w-auto h-auto object-contain rounded-2xl drop-shadow-2xl"
          unoptimized
        />
      </div>
    </div>
  )
}
