import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStaffList, postStaffAttendance } from '../../api'
import { getAuth } from '../../utils/session'

export default function StaffAttendanceAdmin() {
    function formatLocalDate(d) { if (!d) return ''; const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
    const [date, setDate] = useState(() => formatLocalDate(new Date()))
    const [staff, setStaff] = useState([])
    const [marks, setMarks] = useState({})
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        // Load staff list via existing staff API
        async function loadStaff() {
            try {
                const { token } = getAuth()
                const rows = await getStaffList(token)
                const safeRows = Array.isArray(rows) ? rows : []
                setStaff(safeRows)
                const initial = {}
                safeRows.forEach(s => { if (s && s._id) initial[s._id] = 'present' })
                setMarks(initial)
            } catch (e) { setMessage(e.message || 'Failed to load staff list') }
        }
        loadStaff()
    }, [])

    function toggle(id, status) {
        setMarks(prev => ({ ...prev, [id]: status }))
    }

    async function save() {
        setLoading(true); setMessage('')
        try {
            const records = staff.map(s => ({ userId: s._id, status: marks[s._id] || 'present' }))
            const { token } = getAuth()
            await postStaffAttendance({ date, records }, token)
            setMessage('Attendance saved')
        } catch (e) { setMessage(e.message || 'Failed to save attendance') }
        setLoading(false)
    }

    return (
        <AdminLayout title="Staff Attendance">
            <div className="admin-page">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input type="date" className="cm-input" value={date} onChange={e => setDate(e.target.value)} />
                    <button className="btn" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Attendance'}</button>
                </div>
                {message && <div style={{ marginBottom: 10 }}>{message}</div>}
                <div style={{ overflowX: 'auto', border: '2px solid #0ea5a4', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: '#0ea5a4', color: '#fff' }}>
                                <th style={{ padding: 8 }}>Sr No</th>
                                <th style={{ padding: 8 }}>Name</th>
                                <th style={{ padding: 8 }}>Email</th>
                                <th style={{ padding: 8 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.length === 0 && <tr><td colSpan={4} style={{ padding: 12 }}>No staff found</td></tr>}
                            {staff.map((s, idx) => (
                                <tr key={s._id} style={{ background: '#fff', borderTop: '2px solid #e5e7eb' }}>
                                    <td style={{ border: '2px solid #06b6d4' }}>{idx + 1}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>{s.name || s.username}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>{s.email || s.username}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>
                                        <select className="cm-input" value={marks[s._id] || 'present'} onChange={e => toggle(s._id, e.target.value)}>
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="leave">Leave</option>
                                        </select>
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
