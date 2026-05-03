interface RankPalette {
  ribbonStart: string
  ribbonEnd: string
  rosetteStart: string
  rosetteEnd: string
  fold: string
  centerFill: string
  centerStroke: string
  ringStroke: string
}

interface RankBadgeProps {
  rank: number
  size?: number
  idPrefix?: string
  className?: string
}

function getRankPalette(rank: number): RankPalette {
  if (rank === 1) {
    return {
      ribbonStart: '#C89A24',
      ribbonEnd: '#E1B53C',
      rosetteStart: '#F0CB5D',
      rosetteEnd: '#B78619',
      fold: '#8F6713',
      centerFill: '#D4AF37',
      centerStroke: '#9D7A1A',
      ringStroke: '#B78619',
    }
  }

  if (rank === 2) {
    return {
      ribbonStart: '#9EA4AC',
      ribbonEnd: '#C7CDD3',
      rosetteStart: '#D7DCE1',
      rosetteEnd: '#8A919A',
      fold: '#737A82',
      centerFill: '#C0C0C0',
      centerStroke: '#7A7A7A',
      ringStroke: '#8A919A',
    }
  }

  if (rank === 3) {
    return {
      ribbonStart: '#B66E2B',
      ribbonEnd: '#D48B46',
      rosetteStart: '#DFA36A',
      rosetteEnd: '#9A5820',
      fold: '#7D451A',
      centerFill: '#CD7F32',
      centerStroke: '#8A4E17',
      ringStroke: '#9A5820',
    }
  }

  return {
    ribbonStart: '#1E3FAF',
    ribbonEnd: '#2D5BFF',
    rosetteStart: '#4B74FF',
    rosetteEnd: '#1F4CCB',
    fold: '#17378F',
    centerFill: '#2D5BFF',
    centerStroke: '#1A43B8',
    ringStroke: '#1F4CCB',
  }
}

function fontSizeFor(size: number) {
  if (size <= 40) return '0.75rem'
  if (size <= 56) return '0.95rem'
  return '1.25rem'
}

export default function RankBadge({ rank, size = 38, idPrefix = 'rank', className = '' }: RankBadgeProps) {
  const palette = getRankPalette(rank)
  const gradientPrefix = `${idPrefix}-${rank}`
  const ribbonLeftId = `${gradientPrefix}-ribbon-left`
  const ribbonRightId = `${gradientPrefix}-ribbon-right`
  const rosetteId = `${gradientPrefix}-rosette`

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 512 512" aria-hidden="true" style={{ width: size, height: size }}>
        <defs>
          <linearGradient id={ribbonLeftId} x1="150" y1="330" x2="225" y2="505">
            <stop offset="0" stopColor={palette.ribbonStart} />
            <stop offset="1" stopColor={palette.ribbonEnd} />
          </linearGradient>
          <linearGradient id={ribbonRightId} x1="360" y1="330" x2="285" y2="505">
            <stop offset="0" stopColor={palette.ribbonStart} />
            <stop offset="1" stopColor={palette.ribbonEnd} />
          </linearGradient>
          <radialGradient id={rosetteId} cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor={palette.rosetteStart} />
            <stop offset="1" stopColor={palette.rosetteEnd} />
          </radialGradient>
        </defs>

        <path d="M163 300 L107 459 L169 430 L200 496 L246 325 Z" fill={`url(#${ribbonLeftId})`} />
        <path d="M349 300 L405 459 L343 430 L312 496 L266 325 Z" fill={`url(#${ribbonRightId})`} />
        <path
          d="M142 315 C164 343 189 336 206 351 C225 368 239 355 256 351 C273 355 287 368 306 351 C323 336 348 343 370 315 L360 350 C334 356 318 344 304 362 C286 384 270 370 256 366 C242 370 226 384 208 362 C194 344 178 356 152 350 Z"
          fill={palette.fold}
          opacity="0.72"
        />
        <path
          d="M256 18 C267 18 276 38 286 39 C297 40 310 24 320 27 C331 30 333 52 343 56 C354 60 371 48 380 54 C389 60 384 82 392 89 C401 96 422 90 428 99 C434 108 423 127 428 137 C433 147 455 150 458 161 C461 172 445 187 447 198 C449 209 469 219 469 230 C469 241 449 251 447 262 C445 273 461 288 458 299 C455 310 433 313 428 323 C423 333 434 352 428 361 C422 370 401 364 392 371 C384 378 389 400 380 406 C371 412 354 400 343 404 C333 408 331 430 320 433 C310 436 297 420 286 421 C276 422 267 442 256 442 C245 442 236 422 226 421 C215 420 202 436 192 433 C181 430 179 408 169 404 C158 400 141 412 132 406 C123 400 128 378 120 371 C111 364 90 370 84 361 C78 352 89 333 84 323 C79 313 57 310 54 299 C51 288 67 273 65 262 C63 251 43 241 43 230 C43 219 63 209 65 198 C67 187 51 172 54 161 C57 150 79 147 84 137 C89 127 78 108 84 99 C90 90 111 96 120 89 C128 82 123 60 132 54 C141 48 158 60 169 56 C179 52 181 30 192 27 C202 24 215 40 226 39 C236 38 245 18 256 18 Z"
          fill={`url(#${rosetteId})`}
        />
        <circle cx="256" cy="230" r="143" fill="white" />
        <circle cx="256" cy="230" r="125" fill="white" stroke={palette.ringStroke} strokeWidth="7" />
        <circle cx="256" cy="230" r="82" fill={palette.centerFill} stroke={palette.centerStroke} strokeWidth="9" />
      </svg>
      <span
        className="absolute font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
        style={{ fontSize: fontSizeFor(size), lineHeight: 1 }}
      >
        {rank}
      </span>
    </span>
  )
}
