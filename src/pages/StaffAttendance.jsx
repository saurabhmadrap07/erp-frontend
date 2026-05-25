import React, { useEffect, useState } from 'react'
import StaffLayout from '../components/staff/StaffLayout'
import './Auth.css'
import { postLeave, getMyLeaves, getStaffAttendance, exportStaffAttendanceCsv, getProfile } from '../api'
import { getAuth } from '../utils/session'

export default function StaffAttendance() {
    const [status, setStatus] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ from: '', to: '', reason: '' })
    const [myLeaves, setMyLeaves] = useState([])
    function formatLocalDate(d) { if (!d) return ''; const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
    const today = formatLocalDate(new Date())
    const [historyQuery, setHistoryQuery] = useState({ from: today, to: today })
    const [historyRows, setHistoryRows] = useState([])
    const [currentUserId, setCurrentUserId] = useState('')

    function onChange(e) { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })) }

    async function loadMyLeaves() {
        try {
            const { token } = getAuth()
            const items = await getMyLeaves(token)
            setMyLeaves(Array.isArray(items) ? items : [])
        } catch (e) { setMyLeaves([]) }
    }

    useEffect(() => { loadMyLeaves(); resolveUser() }, [])

    async function resolveUser() {
        try {
            const { token } = getAuth()
            const prof = await getProfile(token)
            const id = prof && prof.user && (prof.user.sub || prof.user.id || prof.user._id)
            if (id) setCurrentUserId(id)
        } catch { }
    }

    async function requestLeave(e) {
        e.preventDefault()
        try {
            if (!form.from || !form.to || !form.reason) throw new Error('Please fill from, to and reason')
            setLoading(true); setMessage('')
            const { token } = getAuth()
            await postLeave(form.from, form.to, form.reason, token)
            setForm({ from: '', to: '', reason: '' })
            await loadMyLeaves()
            setMessage('Leave request submitted to admin')
        } catch (e) { setMessage(e.message || 'Failed to submit leave') }
        finally { setLoading(false) }
    }

    async function loadHistory() {
        try {
            const { token } = getAuth()
            const items = await getStaffAttendance({ from: historyQuery.from, to: historyQuery.to, userId: currentUserId }, token)
            const list = Array.isArray(items) ? items : []
            const rows = []
            for (const d of list) {
                const recs = Array.isArray(d.records) ? d.records : []
                const me = recs.find(r => String(r.userId) === String(currentUserId))
                if (me) rows.push({ date: d.date, status: me.status })
            }
            const sorted = rows.sort((a, b) => a.date.localeCompare(b.date))
            setHistoryRows(sorted)
            const todayRow = sorted.find(r => r.date === today)
            setStatus(todayRow ? (todayRow.status || '').toUpperCase() : 'Not Marked')
        } catch (e) { setMessage(e.message || 'Failed to load attendance history'); setHistoryRows([]) }
    }

    async function downloadHistory() {
        try {
            const { token } = getAuth()
            const { blob, filename } = await exportStaffAttendanceCsv({ from: historyQuery.from, to: historyQuery.to, userId: currentUserId }, token)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = filename || 'attendance_faculty.csv'; a.click()
            URL.revokeObjectURL(url)
        } catch (e) { setMessage(e.message || 'Failed to download attendance') }
    }

    useEffect(() => {
        if (currentUserId && historyQuery.from && historyQuery.to) {
            loadHistory()
        }
    }, [currentUserId])

    return (
        <StaffLayout title="Attendance">
            <div className="admin-page">
                <h2>Attendance</h2>
                <div className="colorful-vertical-form" style={{ maxWidth: 520 }}>
                    <label>
                        Status
                        <input className="colorful-input" value={status || 'Auto-marked by Admin'} readOnly />
                    </label>
                    <form onSubmit={requestLeave}>
                        <label>
                            From Date
                            <input className="colorful-input" type="date" name="from" value={form.from} onChange={onChange} />
                        </label>
                        <label>
                            To Date
                            <input className="colorful-input" type="date" name="to" value={form.to} onChange={onChange} />
                        </label>
                        <label>
                            Reason
                            <textarea className="colorful-input colorful-placeholder" name="reason" placeholder="Reason for leave" value={form.reason} onChange={onChange} />
                        </label>
                        <button className="colorful-button" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Leave Request'}</button>
                    </form>
                    {message && <div className="info" style={{ marginTop: 8 }}>{message}</div>}
                </div>

                <div style={{ marginTop: 24 }} className="card">
                    <h3 style={{ marginTop: 0 }}>Attendance History</h3>
                    <div className="colorful-vertical-form" style={{ maxWidth: 520 }}>
                        <label>
                            From Date
                            <input className="colorful-input" type="date" value={historyQuery.from} onChange={e => setHistoryQuery(q => ({ ...q, from: e.target.value }))} />
                        </label>
                        <label>
                            To Date
                            <input className="colorful-input" type="date" value={historyQuery.to} onChange={e => setHistoryQuery(q => ({ ...q, to: e.target.value }))} />
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="colorful-button" type="button" onClick={loadHistory}>Load History</button>
                            <button className="btn" type="button" onClick={downloadHistory}>Download Attendance</button>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        {historyRows.length === 0 && <div className="info">No records for selected range.</div>}
                        {historyRows.map(h => (
                            <div key={`${h.date}`} style={{ padding: 8, border: '1px solid #06b6d4', borderRadius: 8, marginBottom: 6, background: h.status === 'present' ? '#dcfce7' : h.status === 'absent' ? '#fee2e2' : '#fde68a' }}>
                                <strong>{String(h.date).slice(0, 10)}</strong> — Status: {String(h.status || '').toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 12 }}>
                    <h3>Today</h3>
                    {(() => {
                        const todayRow = historyRows.find(h => h.date === today)
                        const st = todayRow ? todayRow.status : 'not-marked'
                        const bg = st === 'present' ? '#dcfce7' : st === 'absent' ? '#fee2e2' : '#e5e7eb'
                        const label = st === 'not-marked' ? 'Not Marked' : (st || '').toUpperCase()
                        return <div style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 9999, background: bg, border: '1px solid #06b6d4' }}>Status: {label}</div>
                    })()}
                </div>

                <div style={{ marginTop: 18 }}>
                    <h3>My Leave Requests</h3>
                    <div className="leaves-list">
                        {myLeaves.length === 0 && <div>No leaves submitted yet.</div>}
                        {myLeaves.map(l => (
                            <div key={l._id || l.id} className={`leave-item ${l.status === 'Approved' ? 'approved' : ''}`}>
                                <div><strong>{String(l.from).slice(0, 10)}</strong> → <strong>{String(l.to).slice(0, 10)}</strong></div>
                                <div>{l.reason}</div>
                                <div className="small">Status: {l.status}{l.reviewNote ? ` — Note: ${l.reviewNote}` : ''}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </StaffLayout>
    )
}
