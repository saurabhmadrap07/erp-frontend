import React, { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { getAuth } from '../../utils/session'
import '../../pages/AdminPanel.css'

export default function AdminLayout({
    children,
    title = 'Admin Panel',
    sidebarItems = undefined,
    copyrightText = 'copyright @AdminPanel 2025',
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    function toggleSidebar() {
        setSidebarOpen((s) => !s)
    }

    function closeSidebar() {
        setSidebarOpen(false)
    }

    useEffect(() => {
        // simple client-side protection: require token and admin role (session-based)
        try {
            const { token, role: userRole } = getAuth()
            if (!token) {
                window.location.href = '/admin-login'
            } else if (userRole !== 'admin') {
                if (userRole === 'faculty') window.location.href = '/faculty-dashboard'
                else if (userRole === 'student') window.location.href = '/student-dashboard'
                else if (userRole === 'parent') window.location.href = '/parents-dashboard'
                else window.location.href = '/'
            }
        } catch (e) {
            try { window.location.href = '/admin-login' } catch (err) { }
        }
    }, [])

    return (
        <div className="admin-root">
            <Header onToggleSidebar={toggleSidebar} title={title} />
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} items={sidebarItems} />

            <main className={`admin-content ${sidebarOpen ? 'sidebar-open' : ''}`} onClick={closeSidebar}>
                {children}
            </main>

            <Footer copyrightText={copyrightText} />
        </div>
    )
}

