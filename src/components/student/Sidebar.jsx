import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ collapsed }) {
    return (
        <aside className={`student-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <nav>
                <ul>
                    <li><NavLink to="/student-dashboard"><span className="link-icon" /> <span className="label">Dashboard</span></NavLink></li>
                    <li><NavLink to="/student/attendance"><span className="link-icon" /> <span className="label">Attendance</span></NavLink></li>
                    <li><NavLink to="/student/syllabus"><span className="link-icon" /> <span className="label">Syllabus</span></NavLink></li>
                    <li><NavLink to="/student/assignments"><span className="link-icon" /> <span className="label">Assignments</span></NavLink></li>
                    <li><NavLink to="/student/timetable"><span className="link-icon" /> <span className="label">Time-Table</span></NavLink></li>
                    <li><NavLink to="/student/tests" className={({ isActive }) => isActive ? 'active' : undefined}><span className="link-icon" /> <span className="label">Tests</span></NavLink></li>
                    <li><NavLink to="/student/results" className={({ isActive }) => isActive ? 'active' : undefined}><span className="link-icon" /> <span className="label">Results</span></NavLink></li>
                    <li><NavLink to="/student/complaint" className={({ isActive }) => isActive ? 'active' : undefined}><span className="link-icon" /> <span className="label">Complaint Box</span></NavLink></li>
                    <li><NavLink to="/student/fees"><span className="link-icon" /> <span className="label">Fee-Structure</span></NavLink></li>
                    <li><NavLink to="/student/parents"><span className="link-icon" /> <span className="label">Parents</span></NavLink></li>
                    <li><NavLink to="/student/card"><span className="link-icon" /> <span className="label">Card</span></NavLink></li>
                    <li><NavLink to="/student/hostel"><span className="link-icon" /> <span className="label">Hostel</span></NavLink></li>
                    <li><NavLink to="/student/transport"><span className="link-icon" /> <span className="label">Transport</span></NavLink></li>
                    <li><NavLink to="/student/report-card"><span className="link-icon" /> <span className="label">ReportCard</span></NavLink></li>
                    <li><NavLink to="/student/admit-cards"><span className="link-icon" /> <span className="label">Admit Card</span></NavLink></li>
                    <li><NavLink to="/student/certificates"><span className="link-icon" /> <span className="label">Certificates</span></NavLink></li>
                </ul>
            </nav>
        </aside>
    )
}
