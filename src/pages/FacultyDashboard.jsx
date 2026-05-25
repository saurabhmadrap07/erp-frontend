import React, { useEffect, useState } from 'react'
import FacultyLayout from '../components/faculty/FacultyLayout'

function fmt(n) { return n.toLocaleString() }

export default function FacultyDashboard() {
    const [data, setData] = useState({ classes: 0, students: 0, assignments: 0 })

    useEffect(() => {
        // try to fetch faculty dashboard if backend supports, otherwise show demo
        async function load() {
            try {
                const { token } = require('../utils/session').getAuth()
                const res = await fetch('/api/faculty/dashboard', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
                if (res.ok) {
                    const d = await res.json()
                    setData({ classes: d.classes || 0, students: d.students || 0, assignments: d.assignments || 0 })
                    return
                }
            } catch (e) { }
            setData({ classes: 5, students: 142, assignments: 12 })
        }
        load()
    }, [])

    return (
        <FacultyLayout title="Faculty Dashboard">
            <div className="faculty-page">
                <h2>Welcome, Faculty</h2>
                <div className="faculty-dashboard-cards">
                    <div className="faculty-card">
                        <div className="card-top">
                            <span className="card-icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 11V7a5 5 0 1 1 10 0v4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <rect x="3" y="11" width="18" height="10" rx="2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="card-title">Classes</div>
                        </div>
                        <div className="card-value">{fmt(data.classes)}</div>
                    </div>

                    <div className="faculty-card">
                        <div className="card-top">
                            <span className="card-icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="9.5" cy="7" r="3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M20 8v6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="card-title">Students</div>
                        </div>
                        <div className="card-value">{fmt(data.students)}</div>
                    </div>

                    <div className="faculty-card">
                        <div className="card-top">
                            <span className="card-icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="card-title">Pending Assignments</div>
                        </div>
                        <div className="card-value">{fmt(data.assignments)}</div>
                    </div>
                </div>

                <h3 style={{ marginTop: 22 }}>Quick Actions</h3>
                <div className="faculty-actions-grid" style={{ marginTop: 12 }}>
                    <div className="quick-card" onClick={() => { window.history.pushState({}, '', '/faculty/assignments'); window.dispatchEvent(new PopStateEvent('popstate')) }} role="button" tabIndex={0}>
                        <div className="qc-top">
                            <span className="qc-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 10l5 5 5-5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="quick-card-title">Upload Assignment</div>
                        </div>
                        <div className="quick-card-desc">Create and upload assignment files with due dates.</div>
                    </div>

                    <div className="quick-card" onClick={() => { window.history.pushState({}, '', '/faculty/add-marks'); window.dispatchEvent(new PopStateEvent('popstate')) }} role="button" tabIndex={0}>
                        <div className="qc-top">
                            <span className="qc-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 20h9" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="quick-card-title">Add / Update Marks</div>
                        </div>
                        <div className="quick-card-desc">Enter student marks by class and subject.</div>
                    </div>

                    <div className="quick-card" onClick={() => { window.history.pushState({}, '', '/faculty/attendance'); window.dispatchEvent(new PopStateEvent('popstate')) }} role="button" tabIndex={0}>
                        <div className="qc-top">
                            <span className="qc-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 13h18" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 3v10" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <div className="quick-card-title">Total Attendance</div>
                        </div>
                        <div className="quick-card-desc">Record and review attendance class-wise.</div>
                    </div>

                    <div className="quick-card" onClick={() => { window.history.pushState({}, '', '/faculty/attendance-self'); window.dispatchEvent(new PopStateEvent('popstate')) }} role="button" tabIndex={0}>
                        <div className="qc-top">
                            <span className="qc-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="7" r="3" stroke="#0f172a" strokeWidth="1.4" />
                                    <path d="M18 21v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </span>
                            <div className="quick-card-title">Self Attendance</div>
                        </div>
                        <div className="quick-card-desc">Mark your attendance and download history.</div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    )
}
