import React, { useEffect, useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import '../../pages/ParentPanel.css'
import { getAuth } from '../../utils/session'

export default function StaffLayout({ children, title = 'Staff Panel' }) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        try {
            const { token, role } = getAuth()
            if (!token) {
                window.location.href = '/staff-login'
            } else if (role !== 'staff') {
                if (role === 'admin') window.location.href = '/admin-dashboard'
                else if (role === 'faculty') window.location.href = '/faculty-dashboard'
                else if (role === 'student') window.location.href = '/student-dashboard'
                else if (role === 'parent') window.location.href = '/parent-dashboard'
                else window.location.href = '/start'
            }
        } catch (e) {
            try { window.location.href = '/staff-login' } catch (err) { }
        }
    }, [])

    function toggle() { setOpen(s => !s) }
    function close() { setOpen(false) }

    return (
        <div className="parent-root">
            <Header onToggleSidebar={toggle} />
            <Sidebar isOpen={open} onClose={close} />
            <main className={`parent-content ${open ? 'sidebar-open' : ''}`} onClick={close}>
                {children}
            </main>
            <Footer />
        </div>
    )
}
