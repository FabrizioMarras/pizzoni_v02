import { ImageResponse } from 'next/og'
import { renderAppIcon } from '@/lib/app-icon'

export function GET() {
  return new ImageResponse(renderAppIcon(130), { width: 192, height: 192 })
}
