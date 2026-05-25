import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const defaultItems = [
    { label: 'Dashboard', href: '/parent-dashboard' },
    { label: 'Link Student', href: '/parent/link-student' },
    { label: 'Student Progress', href: '/parent/progress' },
    { label: 'Attendance', href: '/parent/attendance' },
    { label: 'Notices', href: '/parent/notices' },
    { label: 'Meetings', href: '/parent/meeting' },
    { label: 'Messages', href: '/parent/messages' },
]

export default function Sidebar({ isOpen, onClose, items = defaultItems }) {
    const navigate = useNavigate()
    const location = useLocation()
    const pathname = location && location.pathname ? location.pathname : ''

    function nav(href) {
        onClose && onClose()
        navigate(href)
    }

    function isActive(href) {
        if (!href) return false
        if (pathname === href) return true
        return pathname.startsWith(href + '/')
    }

    return (
        <nav className={`parent-sidebar ${isOpen ? 'open' : ''}`} aria-label="Parent sidebar">
            <ul>
                {items.map((it, idx) => (
                    <li key={idx}><button type="button" className={`sidebar-btn ${isActive(it.href) ? 'active' : ''}`} onClick={() => nav(it.href)}>{it.label}</button></li>
                ))}
            </ul>

            <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">Close</button>
        </nav>
    )
}
