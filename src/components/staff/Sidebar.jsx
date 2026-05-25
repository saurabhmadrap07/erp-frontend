import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const items = [
    { label: 'Dashboard', href: '/staff-dashboard' },
    { label: 'Calendar', href: '/staff/calendar' },
    { label: 'Attendance', href: '/staff/attendance' },
    { label: 'Notices', href: '/staff/notices' },
    { label: 'Meeting', href: '/staff/meeting' },
    { label: 'Card', href: '/staff/card' },
    { label: 'Certificates', href: '/staff/certificates' },
    { label: 'Salary', href: '/staff/salary' },
]

export default function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate()
    const location = useLocation()
    const pathname = location && location.pathname ? location.pathname : ''

    function nav(href) { onClose && onClose(); navigate(href) }

    function isActive(href) {
        if (!href) return false
        if (pathname === href) return true
        return pathname.startsWith(href + '/')
    }
    return (
        <nav className={`parent-sidebar ${isOpen ? 'open' : ''}`} aria-label="Staff sidebar">
            <ul>
                {items.map((it, idx) => (
                    <li key={idx}><button type="button" className={`sidebar-btn ${isActive(it.href) ? 'active' : ''}`} onClick={() => nav(it.href)}>{it.label}</button></li>
                ))}
            </ul>
            <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">Close</button>
        </nav>
    )
}
