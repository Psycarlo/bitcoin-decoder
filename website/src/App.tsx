import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { DecodeResult } from '@/components/decode-result'
import { ImageTab } from '@/components/image-tab'
import { RawStringTab } from '@/components/raw-string-tab'
import { ScanTab } from '@/components/scan-tab'
import { Scanlines } from '@/components/scanlines'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDecode } from '@/hooks/use-decode'

const tabs = ['Scan', 'Image', 'Raw string'] as const

function App() {
  const [activeTab, setActiveTab] = useState<string>('scan')
  const { result, handleDecode } = useDecode()

  return (
    <>
      <Scanlines />
      <div className="flex min-h-svh flex-col items-center px-4">
        <header className="pt-12 pb-8">
          <h1 className="font-bold text-2xl tracking-tight">bitcoin-decode</h1>
        </header>

        <main className="w-full max-w-2xl flex-1">
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="w-full justify-center" variant="line">
              {tabs.map((tab) => (
                <TabsTrigger
                  className="after:hidden"
                  key={tab}
                  value={tab.toLowerCase()}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <motion.div
                      className="absolute inset-x-0 -bottom-1.25 h-0.5 bg-foreground"
                      layoutId="active-tab-underline"
                      transition={{
                        type: 'spring',
                        bounce: 0.15,
                        duration: 0.5
                      }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
                exit={{ opacity: 0, y: -8 }}
                initial={{ opacity: 0, y: 8 }}
                key={activeTab}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'scan' && <ScanTab onResult={handleDecode} />}
                {activeTab === 'image' && <ImageTab onResult={handleDecode} />}
                {activeTab === 'raw string' && (
                  <RawStringTab onResult={handleDecode} />
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>

          <DecodeResult result={result} />
        </main>

        <footer className="py-6 text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </>
  )
}

export default App
