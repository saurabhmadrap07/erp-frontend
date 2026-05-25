import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getFacultyRegistrations, approveFacultyRegistration, rejectFacultyRegistration } from '../../api'
import { getAuth } from '../../utils/session'

export default function Approvals() {
    const [loading, setLoading] = useState(false)
    const [regs, setRegs] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const items = await getFacultyRegistrations('pending', token)
            setRegs(items)
        } catch (e) { console.error(e); setRegs([]) }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    useEffect(() => {
        // subscribe to server-sent events for live updates
        let es = null
        try {
            const { token } = getAuth()
            if (token) {
                const apiBase = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:4000`
                const base = apiBase.replace(/\/$/, '')
                const url = `${base}/api/notifications/stream?token=${token}`
                es = new EventSource(url)
                const onMsg = (e) => {
                    // try to parse event data
                    try {
                        const d = JSON.parse(e.data)
                        // refresh list for relevant events
                        if (e.type === 'message' || e.type === 'faculty_registration' || e.type === 'faculty_approved' || e.type === 'faculty_deleted') load()
                    } catch (err) { load() }
                }
                es.addEventListener('faculty_registration', onMsg)
                es.addEventListener('faculty_approved', onMsg)
                es.addEventListener('faculty_deleted', onMsg)
                es.onmessage = onMsg
            }
        } catch (e) { /* ignore */ }
        return () => { if (es) es.close() }
    }, [])

    async function onApprove(id) {
        if (!confirm('Approve this faculty registration?')) return
        try {
            const { token } = getAuth()
            await approveFacultyRegistration(id, token)
            await load()
        } catch (e) { console.error(e); alert('Approve failed') }
    }

    async function onReject(id) {
        const note = prompt('Optional note for rejection:')
        try {
            const { token } = getAuth()
            await rejectFacultyRegistration(id, note || '', token)
            await load()
        } catch (e) { console.error(e); alert('Reject failed') }
    }

    return (
        <AdminLayout title="Approvals">
            <div className="admin-page">
                <h2>Faculty Registrations - Approval</h2>

                <div className="student-search-card" style={{ padding: 12, borderRadius: 12, background: 'linear-gradient(90deg,#fff,#f3f6ff)', marginBottom: 12 }}>
                    <form onSubmit={(e) => { e && e.preventDefault() }} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input placeholder="Search by name, email or subject" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn-primary" onClick={() => { load() }}>Refresh</button>
                            <button type="button" className="btn-secondary" onClick={() => { setSearchTerm('') }}>Reset</button>
                        </div>
                    </form>
                </div>

                <div className="faculty-table-wrap">
                    <table className="faculty-table">
                        <thead>
                            <tr>
                                <th>Profile</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Subject</th>
                                <th>Experience</th>
                                <th>Contact</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ padding: 18 }}>Loading...</td></tr>
                            ) : (regs || []).filter(row => {
                                if (!searchTerm) return true
                                const q = searchTerm.toLowerCase()
                                return (row.name || '').toLowerCase().includes(q) || (row.email || '').toLowerCase().includes(q) || (row.subject || '').toLowerCase().includes(q)
                            }).length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 18 }}>No pending registrations</td></tr>
                            ) : (regs || []).filter(row => {
                                if (!searchTerm) return true
                                const q = searchTerm.toLowerCase()
                                return (row.name || '').toLowerCase().includes(q) || (row.email || '').toLowerCase().includes(q) || (row.subject || '').toLowerCase().includes(q)
                            }).map(r => (
                                <tr key={r._id}>
                                    <td>
                                        {r.avatar ? <img src={r.avatar} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(r.name || 'F')[0]}</div>}
                                    </td>
                                    <td>{r.name}</td>
                                    <td>{r.email}</td>
                                    <td>{r.subject}</td>
                                    <td>{r.experience}</td>
                                    <td>{r.contact}</td>
                                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn-primary" onClick={() => onApprove(r._id)}>Approve</button>
                                            <button className="btn-danger" onClick={() => onReject(r._id)}>Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
