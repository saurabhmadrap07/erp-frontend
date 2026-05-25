import React, { useState, useMemo, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getAuth } from '../../utils/session'
import { getLeaves, updateLeaveStatus } from '../../api'

export default function StudentLeaves() {
    const [leaves, setLeaves] = useState([])
    const [query, setQuery] = useState('')

    async function load() {
        try {
            const { token } = getAuth()
            const items = await getLeaves({ role: 'student' }, token)
            setLeaves(items || [])
        } catch (e) { console.error(e); setLeaves([]) }
    }

    useEffect(() => { load() }, [])

    async function onAction(id, status) {
        const note = prompt(`Optional note for ${status}:`)
        try {
            const { token } = getAuth()
            await updateLeaveStatus(id, status, note || '', token)
            await load()
        } catch (e) { console.error(e); alert('Action failed') }
    }

    const filtered = useMemo(() => {
        const q = (query || '').trim().toLowerCase()
        if (!q) return leaves
        return leaves.filter(l => (
            String(l.username || l.name || '').toLowerCase().includes(q) ||
            String(l.class || '').toLowerCase().includes(q) ||
            String(l.section || '').toLowerCase().includes(q) ||
            String(l.rollNo || l.roll || '').toLowerCase().includes(q) ||
            String(l.reason || '').toLowerCase().includes(q)
        ))
    }, [leaves, query])

    return (
        <AdminLayout title="Student Leaves">
            <div className="admin-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0 }}>Student Leave Applications</h2>
                    <input className="admin-search" placeholder="Search name / class / section / roll / reason" value={query} onChange={e => setQuery(e.target.value)} />
                </div>

                <div className="card admin-card" style={{ padding: 12 }}>
                    <div className="admin-table-wrapper">
                        <table className="data-table colorful-table" style={{ width: '100%', minWidth: 980 }}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Class</th>
                                    <th>Section</th>
                                    <th>Roll</th>
                                    <th>Email</th>
                                    <th>Reason</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: '#6b7280' }}>No student leave applications.</td></tr>
                                )}
                                {filtered.map(l => (
                                    <tr key={l._id} className={l.status === 'Approved' ? 'approved' : l.status === 'Rejected' ? 'rejected' : ''}>
                                        <td>{l.username || l.name}</td>
                                        <td>{l.class}</td>
                                        <td>{l.section}</td>
                                        <td>{l.rollNo || l.roll}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{l.email || ''}</td>
                                        <td>{l.reason}</td>
                                        <td>{l.from ? String(l.from).slice(0, 10) : ''}</td>
                                        <td>{l.to ? String(l.to).slice(0, 10) : ''}</td>
                                        <td><strong>{l.status || 'Pending'}</strong></td>
                                        <td>
                                            <button className="admin-btn admin-approve" onClick={() => onAction(l._id, 'Approved')}>Approve</button>
                                            <button className="admin-btn admin-reject" onClick={() => onAction(l._id, 'Rejected')}>Reject</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
