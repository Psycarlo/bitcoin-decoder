export function Scanlines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent 0px,
          transparent 1px,
          var(--scanline) 1px,
          var(--scanline) 2px
        )`
      }}
    />
  )
}
