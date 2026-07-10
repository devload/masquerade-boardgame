/**
 * NightAmbience — shared atmospheric backdrop for every Masquerade scene.
 *
 * Extracted from the original title-screen `App.tsx` so every scene can share
 * the same candlelit dark-plum ballroom feel. Two intensity presets:
 *   - `full` : Lobby entry — full parquet + orbs + flourishes + particles.
 *   - `dim`  : In-match scenes — dimmed by ~50% so the court reads clearly.
 */

type Props = {
  intensity?: 'full' | 'dim'
  showFlourishes?: boolean
}

export function NightAmbience({ intensity = 'full', showFlourishes = true }: Props) {
  const dimClass = intensity === 'dim' ? 'opacity-50' : ''
  return (
    <div className={`absolute inset-0 pointer-events-none ${dimClass}`}>
      <NightBackdrop />
      <GoldParticles />
      <CandleOrbs />
      {showFlourishes && <CornerFlourishes />}
      <ParquetFloor />
    </div>
  )
}

function NightBackdrop() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse 100% 55% at 50% 105%, rgba(139,58,74,0.42) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 20% 22%, rgba(232,213,183,0.16) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 82% 15%, rgba(196,139,110,0.13) 0%, transparent 55%),
          linear-gradient(178deg, #241628 0%, #1a1220 45%, #2a1420 100%)
        `,
      }}
    />
  )
}

function GoldParticles() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-40"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 28%, rgba(232,213,183,0.45) 0.6px, transparent 1.6px),
          radial-gradient(circle at 65% 18%, rgba(240,200,168,0.4) 0.5px, transparent 1.5px),
          radial-gradient(circle at 45% 62%, rgba(232,213,183,0.4) 0.5px, transparent 1.5px),
          radial-gradient(circle at 85% 55%, rgba(240,200,168,0.4) 0.5px, transparent 1.5px),
          radial-gradient(circle at 30% 82%, rgba(232,213,183,0.35) 0.5px, transparent 1.5px),
          radial-gradient(circle at 75% 90%, rgba(240,200,168,0.35) 0.5px, transparent 1.5px),
          radial-gradient(circle at 12% 55%, rgba(232,213,183,0.35) 0.5px, transparent 1.5px)
        `,
        backgroundSize: '220px 220px',
      }}
    />
  )
}

function CandleOrbs() {
  return (
    <>
      <div
        className="absolute top-[7%] left-[6%] w-28 h-28 rounded-full animate-candle-a pointer-events-none blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(232,213,183,0.5) 0%, transparent 60%)' }}
      />
      <div
        className="absolute top-[9%] right-[6%] w-24 h-24 rounded-full animate-candle-b pointer-events-none blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(196,139,110,0.45) 0%, transparent 60%)' }}
      />
      <div
        className="absolute bottom-[16%] left-[10%] w-20 h-20 rounded-full animate-candle-b pointer-events-none blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(232,213,183,0.35) 0%, transparent 60%)' }}
      />
      <div
        className="absolute bottom-[20%] right-[8%] w-16 h-16 rounded-full animate-candle-a pointer-events-none blur-sm"
        style={{ background: 'radial-gradient(circle, rgba(196,139,110,0.35) 0%, transparent 60%)' }}
      />
    </>
  )
}

function CornerFlourishes() {
  const stroke = '#e8d5b7'
  const paths = () => (
    <g opacity="0.55" fill="none" stroke={stroke} strokeLinecap="round">
      <path d="M 4 42 Q 4 4, 42 4" strokeWidth="1.1" />
      <path d="M 10 44 Q 10 10, 44 10" strokeWidth="0.5" opacity="0.7" />
      <circle cx="10" cy="10" r="2" fill={stroke} stroke="none" />
      <circle cx="10" cy="10" r="4.5" strokeWidth="0.5" opacity="0.6" />
      <path d="M 6 28 Q 14 20, 26 26 Q 24 32, 18 30" strokeWidth="0.8" />
      <path d="M 28 6 Q 20 14, 26 26" strokeWidth="0.6" opacity="0.8" />
      <circle cx="42" cy="42" r="1.5" fill="#8b3a4a" stroke="none" opacity="0.7" />
      <circle cx="34" cy="8" r="0.8" fill={stroke} stroke="none" />
      <circle cx="8" cy="34" r="0.8" fill={stroke} stroke="none" />
      <circle cx="20" cy="4" r="0.6" fill={stroke} stroke="none" opacity="0.6" />
      <circle cx="4" cy="20" r="0.6" fill={stroke} stroke="none" opacity="0.6" />
    </g>
  )
  return (
    <>
      <svg className="absolute top-3 left-3 w-14 h-14" viewBox="0 0 50 50">
        {paths()}
      </svg>
      <svg className="absolute top-3 right-3 w-14 h-14" viewBox="0 0 50 50">
        <g transform="translate(50,0) scale(-1,1)">{paths()}</g>
      </svg>
      <svg className="absolute bottom-3 left-3 w-14 h-14" viewBox="0 0 50 50">
        <g transform="translate(0,50) scale(1,-1)">{paths()}</g>
      </svg>
      <svg className="absolute bottom-3 right-3 w-14 h-14" viewBox="0 0 50 50">
        <g transform="translate(50,50) scale(-1,-1)">{paths()}</g>
      </svg>
    </>
  )
}

function ParquetFloor() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-[0.07]"
      style={{
        background: `
          repeating-linear-gradient(45deg, transparent 0 22px, rgba(232,213,183,0.9) 22px 23px),
          repeating-linear-gradient(-45deg, transparent 0 22px, rgba(232,213,183,0.9) 22px 23px)`,
        maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
      }}
    />
  )
}
