import HimmahBrand from './HimmahBrand'
import Nav from './Nav'

export default function Shell({
  children,
  wide,
}: {
  children: React.ReactNode
  /** Use full available width (minus side nav) — good for calendar / plan layouts */
  wide?: boolean
}) {
  return (
    <div className="hm-app">
      <Nav />
      <div className={['hm-shell', wide ? 'hm-shell-wide' : ''].filter(Boolean).join(' ')}>
        <header className="hm-shell-header">
          <div className="hm-shell-headerInner">
            <HimmahBrand />
          </div>
        </header>
        <main className="hm-shell-main">{children}</main>
      </div>
    </div>
  )
}
