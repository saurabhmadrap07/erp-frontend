import React, { useEffect, useState } from 'react'
import { getMyMeetings } from '../api'

export default function StudentDashboard() {
    const profileRaw = (() => {
        try { return localStorage.getItem('student_profile') } catch (e) { return null }
    })()
    const profile = profileRaw ? JSON.parse(profileRaw) : { name: 'Student' }

    return (
        <div className="student-dashboard">
            <section className="student-meetings">
                <h3>Upcoming Meetings</h3>
                <MeetingList />
            </section>
            <div className="cards">
                <a className="card" href="/student/resources">
                    <div className="card-title">Student Resources</div>
                </a>
                <a className="card" href="/student/assignments">
                    <div className="card-title">AssignmentHub</div>
                </a>

                <a className="card" href="/student/notices">
                    <div className="card-title">Notices</div>
                </a>
                <a className="card" href="/student/attendance">
                    <div className="card-title">Attendance</div>
                </a>
                <a className="card" href="/student/calendar">
                    <div className="card-title">Academic Calendar</div>
                </a>
            </div>

            <section className="student-welcome">
                <h2>Welcome, {profile.name || 'Student'}</h2>
                <p>Use the quick links above or the sidebar to navigate your student panel.</p>
            </section>
        </div>
    )
}

function MeetingList() {
    const [meetings, setMeetings] = useState(null)
    const [loading, setLoading] = useState(true)
    const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            try {
                if (!token) throw new Error('No token')
                const data = await getMyMeetings(token)
                if (!mounted) return
                setMeetings(data || [])
            } catch (e) {
                console.warn('Failed to load meetings', e)
                if (mounted) setMeetings([])
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [token])

    if (loading) return <div className="meetings-loading">Loading meetings…</div>
    if (!meetings || meetings.length === 0) return <div className="meetings-empty">No upcoming meetings.</div>

    return (
        <div className="meetings-list">
            {meetings.map(m => (
                <div key={m._id} className="meeting-item">
                    <div className="mi-left">
                        <div className="mi-title">{m.title}</div>
                        <div className="mi-datetime">{new Date(m.datetime).toLocaleString()}</div>
                        <div className="mi-summary">{m.summary}</div>
                    </div>
                    <div className="mi-actions">
                        {m.link ? <a className="mi-join" href={m.link} target="_blank" rel="noreferrer">Join</a> : <span className="mi-no-link">No link</span>}
                    </div>
                </div>
            ))}
        </div>
    )
}
