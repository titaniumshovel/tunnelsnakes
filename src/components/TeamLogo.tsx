"use client"

import { useState } from "react"
import Image from "next/image"
import LogoModal from "./LogoModal"

interface TeamLogoProps {
  src: string
  alt: string
  size?: number
  className?: string
}

export default function TeamLogo({ src, alt, size = 96, className = "" }: TeamLogoProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`cursor-pointer hover:brightness-110 transition-all duration-150 ${className}`}
        unoptimized
        onClick={() => setIsOpen(true)}
      />
      <LogoModal
        src={src}
        alt={alt}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
