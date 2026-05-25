import React, { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import '../../pages/ParentPanel.css'
import { getAuth } from '../../utils/session'

export default function ParentLayout({ children, title = 'Parent Panel' }) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        try {
            const { token, role } = getAuth()
            if (!token) {
                window.location.href = '/parents-login'
            } else if (role !== 'parent') {
                // redirect others to their panels
                if (role === 'admin') window.location.href = '/admin-dashboard'
                else if (role === 'faculty') window.location.href = '/faculty-dashboard'
                else if (role === 'student') window.location.href = '/student-dashboard'
                else window.location.href = '/'
            }
        } catch (e) {
            try { window.location.href = '/parents-login' } catch (err) { }
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
