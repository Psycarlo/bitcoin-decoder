import QrScanner from 'qr-scanner'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type ScanTabProps = {
  onResult: (value: string) => void
}

export function ScanTab({ onResult }: ScanTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [scanning, setScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)

  useEffect(() => {
    QrScanner.hasCamera().then(setHasCamera)
  }, [])

  const startScanning = useCallback(() => {
    if (!videoRef.current) {
      return
    }
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onResult(result.data)
        scanner.stop()
        setScanning(false)
      },
      { returnDetailedScanResult: true, highlightScanRegion: true }
    )
    scannerRef.current = scanner
    scanner.start().then(() => setScanning(true))
  }, [onResult])

  const stopScanning = useCallback(() => {
    scannerRef.current?.stop()
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy()
    }
  }, [])

  if (!hasCamera) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No camera detected on this device.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full overflow-hidden rounded-lg">
        {/* biome-ignore lint/a11y/useMediaCaption: QR scanner video feed does not need captions */}
        <video className="w-full" ref={videoRef} />
      </div>
      <Button
        onClick={scanning ? stopScanning : startScanning}
        variant={scanning ? 'destructive' : 'default'}
      >
        {scanning ? 'Stop scanning' : 'Start scanning'}
      </Button>
    </div>
  )
}
