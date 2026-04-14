import Nav from './Nav'
import TimePill from './TimePill'

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hm-shell">
      <header className="hm-shell-header">
        <span className="hm-shell-brand hm-arabic">هِمَّة</span>
        <TimePill />
      </header>
      {children}
      <Nav />
    </div>
  )
}
