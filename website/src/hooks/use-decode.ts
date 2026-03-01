import type { DecodedData } from 'bitcoin-decoder'
import { decode } from 'bitcoin-decoder'
import { useCallback, useState } from 'react'

export function useDecode() {
  const [result, setResult] = useState<DecodedData | null>(null)

  const handleDecode = useCallback((input: string) => {
    const decoded = decode(input)
    setResult(decoded)
  }, [])

  return { result, handleDecode }
}
