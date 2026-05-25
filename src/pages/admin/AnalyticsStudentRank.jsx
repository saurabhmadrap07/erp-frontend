import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function AnalyticsStudentRank() {
    const [cls, setCls] = useState('')
    const [section, setSection] = useState('')
    const [source, setSource] = useState('both')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth() || {}
            const params = new URLSearchParams()
            if (cls) params.append('class', cls)
            if (section) params.append('section', section)
            if (source) params.append('source', source)
            if (from) params.append('from', from)
            if (to) params.append('to', to)
            params.append('limit', '1000')

            const headers = { 'Content-Type': 'application/json' }
            if (token) headers.Authorization = `Bearer ${token}`

            const res = await fetch(`${API_BASE}/api/admin/analytics/student-rank?${params.toString()}`, { headers })
            if (!res.ok) throw new Error('Failed to load rankings')
            const data = await res.json()
            setRows(data || [])
        } catch (e) {
            console.error(e)
            setRows([])
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    function exportCSV() {
        if (!rows || rows.length === 0) return
        const headers = ['Rank', 'Name', 'Email', 'RollNo', 'Class', 'Section', 'AvgScore', 'Count']
        const csv = [headers.join(',')].concat(rows.map(r => [r.rank, `"${(r.name || '').replace(/"/g, '""')}"`, `"${(r.email || '').replace(/"/g, '""')}"`, `"${(r.rollNumber || '').replace(/"/g, '""')}"`, r.class, r.section, r.avg, r.count].join(','))).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'student_rankings.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <AdminLayout title="Analytics — Student Rank">
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <h2>Analytics — Student Rank</h2>
                <div style={{ color: '#6b7280', marginBottom: 12 }}>Filter by class, section and source (Test Results and/or Report Cards).</div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input placeholder="Class (e.g. 10)" value={cls} onChange={e => setCls(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <input placeholder="Section (e.g. A)" value={section} onChange={e => setSection(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <select value={source} onChange={e => setSource(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                        <option value="both">Both</option>
                        <option value="testResults">Test Results</option>
                        <option value="reportCards">Report Cards</option>
                    </select>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
                    <button onClick={load} style={{ padding: '8px 12px', background: '#3b82f6', color: '#000', borderRadius: 8, fontWeight: 700 }}>Apply</button>
                    <button onClick={exportCSV} style={{ padding: '8px 12px', background: '#eef2ff', color: '#0b1220', borderRadius: 8, fontWeight: 700 }}>Export CSV</button>
                </div>

                {loading && <div>Loading…</div>}

                {!loading && rows && rows.length === 0 && <div>No data for selected filters.</div>}

                {!loading && rows && rows.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Rank</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Email</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Roll No</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Class</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Section</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Avg Score</th>
                                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.key}>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.rank}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.name}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.email}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.rollNumber}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.class}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.section}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.avg}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{r.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
