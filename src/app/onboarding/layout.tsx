export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {children}
      </div>
    </main>
  )
}
