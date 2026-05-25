import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getStudentRegistrations, approveStudentRegistration, rejectStudentRegistration } from '../../api'
import { getAuth } from '../../utils/session'

export default function StudentApprovals() {
    const [loading, setLoading] = useState(false)
    const [regs, setRegs] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const items = await getStudentRegistrations('pending', token)
            setRegs(items)
        } catch (e) { console.error(e); setRegs([]) }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    useEffect(() => {
        let es = null
        try {
            const { token } = getAuth()
            if (token) {
                const apiBase = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:4000`
                const base = apiBase.replace(/\/$/, '')
                es = new EventSource(`${base}/api/notifications/stream?token=${token}`)
                const onMsg = (e) => { try { load() } catch (err) { load() } }
                es.addEventListener('student_registration', onMsg)
                es.addEventListener('student_approved', onMsg)
                es.addEventListener('student_rejected', onMsg)
                es.onmessage = onMsg
            }
        } catch (e) { }
        return () => { if (es) es.close() }
    }, [])

    async function onApprove(id) {
        if (!confirm('Approve this student registration?')) return
        try {
            const { token } = getAuth()
            await approveStudentRegistration(id, token)
            await load()
        } catch (e) { console.error(e); alert('Approve failed') }
    }

    async function onReject(id) {
        const note = prompt('Optional note for rejection:')
        try {
            const { token } = getAuth()
            await rejectStudentRegistration(id, note || '', token)
            await load()
        } catch (e) { console.error(e); alert('Reject failed') }
    }

    return (
        <AdminLayout title="Student Approvals">
            <div className="admin-page">
                <h2>Student Registrations - Approval</h2>

                <div className="student-search-card" style={{ padding: 12, borderRadius: 12, background: 'linear-gradient(90deg,#fff,#f3f6ff)', marginBottom: 12 }}>
                    <form onSubmit={(e) => { e && e.preventDefault(); }} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input placeholder="Search by name, email or class" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
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
                                <th>Name</th>
                                <th>Email</th>
                                <th>Class</th>
                                <th>School</th>
                                <th>Access ID</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: 18 }}>Loading...</td></tr>
                            ) : (regs || []).filter(row => {
                                if (!searchTerm) return true
                                const q = searchTerm.toLowerCase()
                                return (row.name || '').toLowerCase().includes(q) || (row.email || '').toLowerCase().includes(q) || String((row.class || '')).toLowerCase().includes(q)
                            }).length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 18 }}>No pending registrations</td></tr>
                            ) : (regs || []).filter(row => {
                                if (!searchTerm) return true
                                const q = searchTerm.toLowerCase()
                                return (row.name || '').toLowerCase().includes(q) || (row.email || '').toLowerCase().includes(q) || String((row.class || '')).toLowerCase().includes(q)
                            }).map(r => (
                                <tr key={r._id}>
                                    <td>{r.name}</td>
                                    <td>{r.email}</td>
                                    <td>{r.class}</td>
                                    <td>{r.school}</td>
                                    <td>{r.accessId}</td>
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
