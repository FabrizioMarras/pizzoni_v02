export async function uploadImageToCloudinary(file: File, options?: { folder?: string }) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Mancano le variabili Cloudinary: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', options?.folder ?? 'pizzoni')

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    let detail = ''
    try {
      const errorBody = (await uploadResponse.json()) as { error?: { message?: string } }
      detail = errorBody?.error?.message ?? ''
    } catch {
      detail = await uploadResponse.text()
    }
    throw new Error(detail ? `Caricamento Cloudinary fallito: ${detail}` : 'Caricamento Cloudinary fallito.')
  }

  const uploadResult = (await uploadResponse.json()) as { secure_url?: string }
  if (!uploadResult.secure_url) {
    throw new Error('Cloudinary non ha restituito alcun URL.')
  }

  return uploadResult.secure_url
}
