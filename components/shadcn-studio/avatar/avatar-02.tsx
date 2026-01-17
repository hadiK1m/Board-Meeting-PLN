// components/shadcn-studio/avatar/avatar-02.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from "@/lib/utils" // Import utility class joiner (standar shadcn)

// Definisikan props yang diterima
interface AvatarRingProps {
  src: string
  alt: string
  fallback: string
  className?: string
}

const AvatarRingDemo = ({ alt, fallback, className }: AvatarRingProps) => {
  return (
    <Avatar className={cn("ring-2 ring-primary/20", className)}>
      <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png" alt={alt} />
      <AvatarFallback className='text-xs bg-[#14a2ba] text-white font-bold'>
        {fallback}
      </AvatarFallback>
    </Avatar>
  )
}

export default AvatarRingDemo