import React, { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { getAuth } from '../../utils/session'
import '../../pages/Student.css'

export default function StudentLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const { token, role } = getAuth()
        if (!token || role !== 'student') {
            // redirect to appropriate login
            window.location.href = '/student-login'
        }
    }, [])

    useEffect(() => {
        // set "active" class on matching sidebar links and update on history changes
        function updateActive() {
            try {
                const links = document.querySelectorAll('.student-sidebar nav a')
                links.forEach(a => {
                    const href = a.getAttribute('href') || ''
                    const url = new URL(href, window.location.origin)
                    const path = url.pathname
                    if (path === window.location.pathname) a.classList.add('active')
                    else a.classList.remove('active')
                })
            } catch (e) { }
        }

        updateActive()
        const onPop = () => setTimeout(updateActive, 10)
        window.addEventListener('popstate', onPop)
        // also update after clicks (single page navigation)
        document.addEventListener('click', updateActive)
        return () => {
            window.removeEventListener('popstate', onPop)
            document.removeEventListener('click', updateActive)
        }
    }, [])

    return (
        <div className="student-app">
            <Header onToggleSidebar={() => setCollapsed(s => !s)} />
            <Sidebar collapsed={collapsed} />

            <main className={`student-main ${collapsed ? 'collapsed' : ''}`}>
                {children}
            </main>

            <Footer />
        </div>
    )
}
