import type { DecodedData, Destination } from 'bitcoin-decoder'
import { AnimatePresence, motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DecodeResultProps = {
  result: DecodedData | null
}

function DestinationItem({ destination }: { destination: Destination }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{destination.type}</Badge>
        <Badge variant="secondary">{destination.protocol}</Badge>
        {'addressType' in destination && (
          <Badge variant="secondary">{destination.addressType}</Badge>
        )}
      </div>
      <p className="break-all font-mono text-sm">{destination.destination}</p>
    </div>
  )
}

function SuccessResult({
  data
}: {
  data: Extract<DecodedData, { valid: true }>
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Decoded Result</CardTitle>
          <Badge>{data.network.trim()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DestinationItem destination={data.destination} />
        {data.destinations.length > 1 && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Additional destinations
            </p>
            {data.destinations.slice(1).map((dest) => (
              <DestinationItem destination={dest} key={dest.destination} />
            ))}
          </div>
        )}
        {data.metadata?.amount != null && (
          <div>
            <p className="text-muted-foreground text-sm">Amount</p>
            <p className="text-sm">{data.metadata.amount} sats</p>
          </div>
        )}
        {data.metadata?.description && (
          <div>
            <p className="text-muted-foreground text-sm">Description</p>
            <p className="text-sm">{data.metadata.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ErrorResult({
  data
}: {
  data: Extract<DecodedData, { valid: false }>
}) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Decode Error</CardTitle>
          <Badge variant="destructive">{data.errorCode}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{data.errorMessage}</p>
      </CardContent>
    </Card>
  )
}

export function DecodeResult({ result }: DecodeResultProps) {
  return (
    <AnimatePresence mode="wait">
      {result && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
          exit={{ opacity: 0, y: -12 }}
          initial={{ opacity: 0, y: 12 }}
          key={result.input}
          transition={{ duration: 0.2 }}
        >
          {result.valid ? (
            <SuccessResult data={result} />
          ) : (
            <ErrorResult data={result} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
