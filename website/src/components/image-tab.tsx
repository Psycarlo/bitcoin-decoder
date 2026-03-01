import { Upload } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type ImageTabProps = {
  onResult: (value: string) => void
}

export function ImageTab({ onResult }: ImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) {
        return
      }

      if (preview) {
        URL.revokeObjectURL(preview)
      }
      setPreview(URL.createObjectURL(file))
      setError(null)
      setLoading(true)

      try {
        const result = await QrScanner.scanImage(file, {
          returnDetailedScanResult: true
        })
        onResult(result.data)
      } catch {
        setError('No QR code found in image')
      } finally {
        setLoading(false)
      }
    },
    [onResult, preview]
  )

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
      <Button
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
      >
        <Upload className="size-4" />
        {loading ? 'Scanning...' : 'Upload image'}
      </Button>
      {preview && (
        <img
          alt="Uploaded QR code"
          className="max-h-64 rounded-lg"
          height={256}
          src={preview}
          width={256}
        />
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
