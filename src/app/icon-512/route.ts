import { ImageResponse } from 'next/og'
import { renderAppIcon } from '@/lib/app-icon'

export function GET() {
  return new ImageResponse(renderAppIcon(340), { width: 512, height: 512 })
}
