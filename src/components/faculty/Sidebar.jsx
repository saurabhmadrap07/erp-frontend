import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Sidebar({ isOpen = false, onClose }) {
    const navigate = useNavigate()
    const location = useLocation()
    const pathname = location && location.pathname ? location.pathname : ''

    function navTo(path) {
        onClose && onClose()
        navigate(path)
    }

    function isActive(href) {
        if (!href) return false
        if (pathname === href) return true
        return pathname.startsWith(href + '/')
    }

    return (
        <aside className={`faculty-sidebar ${isOpen ? 'open' : ''}`} aria-label="Faculty navigation">
            <nav>
                <ul>
                    <li><button type="button" className={isActive('/faculty-dashboard') ? 'active' : ''} onClick={() => navTo('/faculty-dashboard')}>Dashboard</button></li>
                    <li><button type="button" className={isActive('/faculty/students') ? 'active' : ''} onClick={() => navTo('/faculty/students')}>Students</button></li>
                    <li><button type="button" className={isActive('/faculty/assignments') ? 'active' : ''} onClick={() => navTo('/faculty/assignments')}>Assignments</button></li>
                    <li><button type="button" className={isActive('/faculty/leaves') ? 'active' : ''} onClick={() => navTo('/faculty/leaves')}>Leaves</button></li>
                    <li><button type="button" className={isActive('/faculty/library') ? 'active' : ''} onClick={() => navTo('/faculty/library')}>Library</button></li>
                    <li><button type="button" className={isActive('/faculty/notices') ? 'active' : ''} onClick={() => navTo('/faculty/notices')}>Notices</button></li>
                    <li><button type="button" className={isActive('/faculty/meeting') ? 'active' : ''} onClick={() => navTo('/faculty/meeting')}>Meeting</button></li>
                    <li><button type="button" className={isActive('/faculty/tests') ? 'active' : ''} onClick={() => navTo('/faculty/tests')}>Test Management</button></li>
                    <li><button type="button" className={isActive('/faculty/test-results') ? 'active' : ''} onClick={() => navTo('/faculty/test-results')}>Test Results</button></li>
                    <li><button type="button" className={isActive('/faculty/attendance') ? 'active' : ''} onClick={() => navTo('/faculty/attendance')}>Attendance</button></li>
                    <li><button type="button" className={isActive('/faculty/faculty-timetable') ? 'active' : ''} onClick={() => navTo('/faculty/faculty-timetable')}>Faculty TimeTable</button></li>
                    <li><button type="button" className={isActive('/faculty/admit-cards') ? 'active' : ''} onClick={() => navTo('/faculty/admit-cards')}>Admit Card</button></li>
                    <li><button type="button" className={isActive('/faculty/certificates') ? 'active' : ''} onClick={() => navTo('/faculty/certificates')}>Certificates</button></li>
                    <li><button type="button" className={isActive('/faculty/report-card') ? 'active' : ''} onClick={() => navTo('/faculty/report-card')}>Report Card</button></li>
                    <li><button type="button" className={isActive('/faculty/add-marks') ? 'active' : ''} onClick={() => navTo('/faculty/add-marks')}>Marks</button></li>
                    <li><button type="button" className={isActive('/faculty/salary') ? 'active' : ''} onClick={() => navTo('/faculty/salary')}>Staff Salary</button></li>
                    <li><button type="button" className={isActive('/faculty/card-management') ? 'active' : ''} onClick={() => navTo('/faculty/card-management')}>Card</button></li>
                    <li><button type="button" className={isActive('/faculty/hostel-management') ? 'active' : ''} onClick={() => navTo('/faculty/hostel-management')}>Hostel Management</button></li>
                    <li><button type="button" className={isActive('/faculty/house-management') ? 'active' : ''} onClick={() => navTo('/faculty/house-management')}>House Management</button></li>
                    <li><button type="button" className={isActive('/faculty/transport-management') ? 'active' : ''} onClick={() => navTo('/faculty/transport-management')}>Transport Management</button></li>
                </ul>
            </nav>
        </aside>
    )
}
