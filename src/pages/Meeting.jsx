import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import './Meeting.css'
import { createMeeting, getMeetings } from '../api'

export default function Meeting() {
    const [title, setTitle] = useState('')
    const [datetime, setDatetime] = useState('')
    const [summary, setSummary] = useState('')
    const [link, setLink] = useState('')
    const [audience, setAudience] = useState('student')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    async function handleSubmit(e) {
        e.preventDefault()
        setMessage(null)
        if (!title || !datetime) {
            setMessage({ type: 'error', text: 'Title and date/time are required.' })
            return
        }
        const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')
        if (!token) {
            setMessage({ type: 'error', text: 'Not authenticated.' })
            return
        }
        setLoading(true)
        try {
            const payload = { title, summary, datetime: new Date(datetime).toISOString(), link, audience }
            // If audience is 'students' and no class/section provided, it will target all students
            await createMeeting(payload, token)
            setMessage({ type: 'success', text: 'Meeting created successfully.' })
            setTitle('')
            setDatetime('')
            setSummary('')
            setLink('')
            setAudience('students')
            // refresh history
            loadMeetings()
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to create meeting' })
        } finally { setLoading(false) }
    }

    const [meetings, setMeetings] = useState(null)
    const [loadingMeetings, setLoadingMeetings] = useState(true)

    async function loadMeetings() {
        setLoadingMeetings(true)
        try {
            const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')
            if (!token) throw new Error('Not authenticated')
            const items = await getMeetings(token)
            setMeetings(items || [])
        } catch (e) {
            console.warn('Failed to load meetings', e)
            setMeetings([])
        } finally { setLoadingMeetings(false) }
    }

    useEffect(() => { loadMeetings() }, [])

    return (
        <AdminLayout title="Meetings">
            <div className="meeting-page">
                <header className="meeting-header">
                    <h1 className="main-title">Upcoming Meetings</h1>
                    <p className="subtitle">Schedule and review meetings with staff and students.</p>
                </header>

                <div className="meeting-grid">
                    <section className="schedule-panel panel-card">
                        <div className="panel-head">
                            <h3 className="panel-title">Schedule New Meeting</h3>
                            <span className="chip green">Create</span>
                        </div>
                        <form className="meeting-form vertical" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label>Meeting Title</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} className="input title" placeholder="Enter meeting title" />
                            </div>

                            <div className="form-row">
                                <label>Date & Time</label>
                                <input value={datetime} onChange={e => setDatetime(e.target.value)} className="input date" type="datetime-local" />
                            </div>

                            <div className="form-row">
                                <label>Audience</label>
                                <select value={audience} onChange={e => setAudience(e.target.value)} className="input participants">
                                    <option value="student">All Students</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="parent">Parents</option>
                                    <option value="staff">Staff</option>
                                    <option value="all">All</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label>Mode</label>
                                <select value={''} onChange={() => { }} className="input mode">
                                    <option value="">Select Mode</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <label>Meeting Link (optional)</label>
                                <input value={link} onChange={e => setLink(e.target.value)} className="input link" placeholder="https://zoom.us/..." />
                            </div>

                            <div className="form-row">
                                <label>Agenda / Notes</label>
                                <textarea value={summary} onChange={e => setSummary(e.target.value)} className="input summary" placeholder="Describe agenda, topics or notes" />
                            </div>

                            <div className="actions">
                                <button className="btn add" disabled={loading}>{loading ? 'Creating…' : '+ Add Meeting'}</button>
                                {message && <span className={`form-msg ${message.type}`}>{message.text}</span>}
                            </div>
                        </form>
                    </section>

                    <section className="history-panel panel-card">
                        <div className="panel-head">
                            <h3 className="panel-title">Meeting History</h3>
                            <span className="chip purple">Recent</span>
                        </div>

                        <div className="table">
                            <div className="thead">
                                <div>Date & Time</div>
                                <div>Title</div>
                                <div>Audience</div>
                                <div>Target</div>
                                <div>By</div>
                                <div>Summary</div>
                                <div>Action</div>
                            </div>
                            {loadingMeetings && <div className="empty">Loading meeting history…</div>}
                            {!loadingMeetings && (!meetings || meetings.length === 0) && <div className="empty">No meeting history yet.</div>}
                            {!loadingMeetings && meetings && meetings.length > 0 && (
                                <div className="history-table">
                                    {meetings.map(m => (
                                        <div className="history-row" key={m._id}>
                                            <div className="history-cell">
                                                <div className="hc-date">{new Date(m.datetime).toLocaleString()}</div>
                                            </div>
                                            <div className="history-cell">
                                                <div className="hc-title">{m.title}</div>
                                                <div className="hc-meta">{m.mode || ''}</div>
                                            </div>
                                            <div className="history-cell"><span className={`audience audience-${String(m.audience || 'all')}`}>{m.audience || 'all'}</span></div>
                                            <div className="history-cell">
                                                {m.class || m.section || m.studentId ? (
                                                    <div className="target">{m.class ? `Class ${m.class}` : ''}{m.section ? ` • Section ${m.section}` : ''}{m.studentId ? ` • Student ${String(m.studentId).slice(0, 6)}` : ''}</div>
                                                ) : <div className="target">All</div>}
                                            </div>
                                            <div className="history-cell">{m.createdBy && m.createdBy.name ? m.createdBy.name : (m.createdBy ? String(m.createdBy).slice(0, 8) : 'Admin')}</div>
                                            <div className="history-cell summary-cell">{m.summary || '-'}</div>
                                            <div className="history-cell action-cell">{m.link ? <a className="mi-join" href={m.link} target="_blank" rel="noreferrer">Join</a> : <span className="mi-no-link">-</span>}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AdminLayout>
    )
}
