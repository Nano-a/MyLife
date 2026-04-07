import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** Icône PWA : goutte stylisée (pas la lettre « G » par défaut du template). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0f3d2e 0%, #1a6b52 40%, #34d399 100%)',
          borderRadius: 108,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 300,
            height: 300,
            borderRadius: 72,
            background: 'rgba(255,255,255,0.12)',
            border: '6px solid rgba(255,255,255,0.35)',
          }}
        >
          <svg width="200" height="240" viewBox="0 0 200 240" fill="none">
            <path
              fill="rgba(255,255,255,0.92)"
              d="M100 28c-28 0-52 42-52 94 0 46 23 78 52 78s52-32 52-78c0-52-24-94-52-94z"
            />
            <ellipse cx="100" cy="168" rx="24" ry="32" fill="rgba(255,255,255,0.28)" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  )
}
