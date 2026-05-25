import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const defaultItems = [
    { label: 'Dashboard', href: '/admin-dashboard' },
    { label: 'Student Management', href: '/admin/students' },
    { label: 'Faculty Management', href: '/admin/faculty' },
    { label: 'HR Management', href: '/admin/hr' },
    { label: 'Staff Management', href: '/admin/staff' },
    { label: 'Parents Management', href: '/admin/parents' },
    { label: 'Admin Settings', href: '/admin/admins' },
    { label: 'Academic Management', href: '/admin/academics' },
    { label: 'Faculty TimeTable', href: '/admin/faculty-timetable' },
    { label: 'Admit Card', href: '/admin/admit-cards' },
    { label: 'Certificates', href: '/admin/certificates' },
    { label: 'Report Card', href: '/admin/report-card' },
    { label: 'Gallery', href: '/admin/gallery' },
    { label: 'Finance Management', href: '/admin/finance' },
    { label: 'Card Management', href: '/admin/card-management' },
    { label: 'Hostel Management', href: '/admin/hostel-management' },
    { label: 'Transport Management', href: '/admin/transport-management' },
    { label: 'House Management', href: '/admin/house-management' },
    { label: 'Faculty Salary', href: '/admin/salary' },
    { label: 'Staff Salary', href: '/admin/staff-salary' },
    { label: 'Student Attendance', href: '/admin/attendance/students' },
    { label: 'Faculty Attendance', href: '/admin/attendance/faculty' },
    { label: 'Staff Attendance', href: '/admin/attendance/staff' },
    { label: 'Student Leave', href: '/admin/leaves/student' },
    { label: 'Faculty Leave', href: '/admin/leaves/faculty' },
    { label: 'Staff Leave', href: '/admin/leaves/staff' },
    { label: 'Approval', href: '/admin/approvals' },
    { label: 'Student Approvals', href: '/admin/student-approvals' },
    { label: 'Test Creation', href: '/admin/tests' },
    { label: 'View Test Series', href: '/admin/view-test-series' },
    { label: 'Test Results', href: '/admin/test-results' },
    { label: 'Meeting', href: '/admin/meeting' },
    { label: 'Complaints', href: '/admin/complaints' },
    { label: 'Notices', href: '/admin/notices' },
    { label: 'Form', href: '/admin/form' },
    { label: 'Forms Query', href: '/admin/form-queries' },
    { label: 'Contactpagequery', href: '/admin/contact-queries' },
    { label: 'Analytics Student Rank', href: '/admin/analytics-student-rank' },
    // Leftover items moved to end
    { label: 'Messages', href: '/admin/messages' },
    { label: 'Events', href: '/admin/events' },
    { label: 'Requests', href: '/admin/requests' },
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
        <nav className={`admin-sidebar ${isOpen ? 'open' : ''}`} aria-label="Admin sidebar">
            <ul>
                {items.map((it, idx) => (
                    <li key={idx}><button type="button" className={`sidebar-btn ${isActive(it.href) ? 'active' : ''}`} onClick={() => nav(it.href)}>{it.label}</button></li>
                ))}
            </ul>

            <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">Close</button>
        </nav>
    )
}
