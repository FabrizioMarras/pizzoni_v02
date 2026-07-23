export function renderAppIcon(fontSize: number) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #b24a2f 0%, #8f331d 100%)',
        fontSize,
      }}
    >
      🍕
    </div>
  )
}
