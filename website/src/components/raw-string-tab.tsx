import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type RawStringTabProps = {
  onResult: (value: string) => void
}

export function RawStringTab({ onResult }: RawStringTabProps) {
  const [input, setInput] = useState('')

  const handleDecode = () => {
    const trimmed = input.trim()
    if (trimmed) {
      onResult(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleDecode()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste a bitcoin address, lightning invoice, BIP-321 URI..."
        rows={4}
        value={input}
      />
      <Button disabled={!input.trim()} onClick={handleDecode}>
        Decode
      </Button>
    </div>
  )
}
