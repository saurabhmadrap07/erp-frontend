import React, { useEffect, useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { getAuth } from '../../utils/session'
import '../../pages/Faculty.css'

export default function FacultyLayout({ children, title = 'Faculty Panel' }) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        // require faculty role (session-based)
        try {
            const { token, role } = getAuth()
            if (!token) {
                window.location.href = '/faculty-login'
            } else if (role !== 'faculty') {
                if (role === 'admin') window.location.href = '/admin-dashboard'
                else if (role === 'student') window.location.href = '/student-dashboard'
                else if (role === 'parent') window.location.href = '/parents-dashboard'
                else window.location.href = '/'
            }
        } catch (e) {
            try { window.location.href = '/faculty-login' } catch (err) { }
        }
    }, [])

    function toggle() { setOpen(s => !s) }
    function close() { setOpen(false) }

    return (
        <div className="faculty-root">
            <Header onToggleSidebar={toggle} title={title} />
            <Sidebar isOpen={open} onClose={close} />

            <main className={`faculty-content ${open ? 'sidebar-open' : ''}`} onClick={close}>
                {children}
            </main>

            <Footer />
        </div>
    )
}
