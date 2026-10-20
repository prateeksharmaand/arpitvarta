import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import AnnouncementMarquee from './AnnouncementMarquee'
import Footer from './Footer'

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementMarquee />
      <Header />
      <main key={pathname} className="flex-1 page-enter">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
