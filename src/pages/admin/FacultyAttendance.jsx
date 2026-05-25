import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAuth } from '../../utils/session'
import { getFaculty, getFacultyAttendance, postFacultyAttendance, exportFacultyAttendanceCsv, API_BASE } from '../../api'

export default function AdminFacultyAttendance() {
    function formatLocalDate(d) { if (!d) return ''; const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
    const [date, setDate] = useState(() => formatLocalDate(new Date()))
    const [list, setList] = useState([])
    const [attendance, setAttendance] = useState({})
    const [loading, setLoading] = useState(false)
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    useEffect(() => { loadFaculty() }, [])
    useEffect(() => { loadExisting() }, [date])

    // Subscribe to SSE updates to auto-refresh when faculty attendance changes
    useEffect(() => {
        const { token } = getAuth() || {}
        if (!token) return
        const es = new EventSource(`${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`)
        function onUpdate(e) {
            try {
                const data = JSON.parse(e.data || '{}')
                if (data && data.type === 'faculty') {
                    // refresh if same date
                    if (String(data.date || '') === String(date || '')) loadExisting()
                }
            } catch { }
        }
        es.addEventListener('attendance_updated', onUpdate)
        return () => { es.removeEventListener('attendance_updated', onUpdate); es.close() }
    }, [date])

    // Lightweight polling fallback in case SSE is blocked or drops
    useEffect(() => {
        const id = setInterval(() => { loadExisting() }, 15000)
        return () => clearInterval(id)
    }, [date])

    async function loadFaculty() {
        try { const { token } = getAuth(); const items = await getFaculty({}, token); setList(items || []) } catch (e) { setList([]) }
    }

    async function loadExisting() {
        try { const { token } = getAuth(); const items = await getFacultyAttendance({ date }, token); const rec = (items || [])[0]; const map = {}; if (rec && Array.isArray(rec.records)) rec.records.forEach(r => { map[String(r.facultyId)] = r.status }); setAttendance(map) } catch (e) { setAttendance({}) }
    }

    function setStatus(id, status) { setAttendance(prev => ({ ...prev, [String(id)]: status })) }

    async function save() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const records = list.map(f => ({ facultyId: f._id, status: attendance[String(f._id)] || 'present' }))
            await postFacultyAttendance({ date, records }, token)
            alert('Attendance saved')
        } catch (e) { alert(e.message || 'Failed to save') } finally { setLoading(false) }
    }

    function downloadCsv() {
        const rows = [['Date', 'Faculty', 'EmployeeId', 'Subject', 'Status']]
        list.forEach(f => { const st = attendance[String(f._id)] || ''; rows.push([date, f.name || '', f.employeeId || '', f.subject || '', st]) })
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '\"')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance_faculty_${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function downloadHistoryCsv() {
        try {
            const { token } = getAuth()
            const query = {}
            if (fromDate) query.from = fromDate
            if (toDate) query.to = toDate
            const { blob, filename } = await exportFacultyAttendanceCsv(query, token)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename || 'attendance_faculty.csv'
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) { alert(e.message || 'Failed to download') }
    }

    function downloadFacultyCsv(f) {
        const st = attendance[String(f._id)] || ''
        const rows = [['Date', 'Faculty', 'EmployeeId', 'Subject', 'Status'], [date, f.name || '', f.employeeId || '', f.subject || '', st]]
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '\"')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance_faculty_${(f.employeeId || f.name || 'record').toString().replace(/\s+/g, '_')}_${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <AdminLayout>
            <div className="admin-page">
                <h2>Faculty Attendance</h2>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    <button className="btn-outline" type="button" onClick={loadExisting}>Refresh</button>
                    <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button type="button" onClick={downloadCsv} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #000', background: '#fff', color: '#000', fontWeight: 700 }}>Download Excel</button>
                    <span style={{ marginLeft: 16, alignSelf: 'center' }}>History:</span>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
                    <button type="button" onClick={downloadHistoryCsv} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #000', background: '#fff', color: '#000', fontWeight: 700 }}>Download History</button>
                </div>
                <div style={{ marginTop: 16 }}>
                    {list.length === 0 ? <div>No faculty found.</div> : (
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr><th>Name</th><th>Employee ID</th><th>Subject</th><th>Status</th><th>Download</th></tr>
                            </thead>
                            <tbody>
                                {list.map(f => (
                                    <tr key={f._id}>
                                        <td>{f.name}</td>
                                        <td>{f.employeeId || '-'}</td>
                                        <td>{f.subject || '-'}</td>
                                        <td>
                                            <select value={attendance[String(f._id)] || ''} onChange={e => setStatus(f._id, e.target.value)}>
                                                <option value="">—</option>
                                                <option value="present">Present</option>
                                                <option value="absent">Absent</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button type="button" onClick={() => downloadFacultyCsv(f)} style={{ padding: '6px 10px', borderRadius: 8, border: '2px solid #000', background: '#fff', color: '#000', fontWeight: 700 }}>Download CSV</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
