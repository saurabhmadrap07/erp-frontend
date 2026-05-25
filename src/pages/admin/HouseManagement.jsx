import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStudents, changeStudentHouse, bulkChangeStudentHouse, setStudentHouseRole } from '../../api'
import { getAuth } from '../../utils/session'

const HOUSES = ['Red', 'Green', 'Yellow', 'Blue', 'Purple']

export default function HouseManagement() {
    const { token } = getAuth()
    const [q, setQ] = useState('')
    const [houseFilter, setHouseFilter] = useState('')
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function load() {
        setLoading(true); setError('')
        try {
            const query = {}
            if (q) query.name = q
            if (houseFilter) query.house = houseFilter
            const list = await getStudents(query, token)
            setRows(Array.isArray(list) ? list : [])
        } catch (e) { setError(e.message || 'Failed to load students') }
        setLoading(false)
    }
    useEffect(() => { load() }, [])

    async function assignHouse(id, house) {
        try {
            await changeStudentHouse(id, house, token)
            setRows(prev => prev.map(r => r._id === id ? { ...r, house } : r))
        } catch (e) { setError(e.message || 'Failed to assign house') }
    }

    async function autoAssign() {
        // Assign ONLY unassigned students across houses evenly, keep existing
        const unassigned = rows.filter(st => !st.house)
        const n = unassigned.length
        if (n === 0) return
        const colors = [...HOUSES]
        // Shuffle house order for randomness
        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = colors[i]; colors[i] = colors[j]; colors[j] = tmp
        }
        // Shuffle students for randomness
        const students = [...unassigned]
        for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = students[i]; students[i] = students[j]; students[j] = tmp
        }
        const updates = students.map((st, idx) => ({ id: st._id, house: colors[idx % colors.length] }))
        setLoading(true); setError('')
        try {
            await bulkChangeStudentHouse(updates, token)
            await load()
        } catch (e) {
            setError(e.message || 'Auto-assign failed')
        }
        setLoading(false)
    }

    async function makeRole(id, role) {
        try {
            await setStudentHouseRole(id, role, token)
            setRows(prev => prev.map(r => r._id === id ? { ...r, houseRole: role } : r))
        } catch (e) { setError(e.message || 'Failed to set role') }
    }

    const filtered = useMemo(() => rows, [rows])

    return (
        <AdminLayout title="House Management">
            <div className="admin-page">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input className="cm-input" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} />
                    <select className="cm-input" value={houseFilter} onChange={e => setHouseFilter(e.target.value)}>
                        <option value="">All Houses</option>
                        {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button className="btn" onClick={load}>Search</button>
                    <button className="btn" onClick={autoAssign}>Auto Assign</button>
                </div>
                {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}

                <div style={{ overflowX: 'auto', border: '2px solid #0ea5a4', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'linear-gradient(90deg,#ef4444,#22c55e,#eab308,#3b82f6,#7c3aed)', color: '#fff' }}>
                                <th style={{ padding: 8, borderRight: '2px solid #0ea5a4' }}>Sr No</th>
                                <th style={{ padding: 8, borderRight: '2px solid #0ea5a4' }}>Name</th>
                                <th style={{ padding: 8, borderRight: '2px solid #0ea5a4' }}>Class</th>
                                <th style={{ padding: 8, borderRight: '2px solid #0ea5a4' }}>Section</th>
                                <th style={{ padding: 8, borderRight: '2px solid #0ea5a4' }}>House</th>
                                <th style={{ padding: 8 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} style={{ padding: 12 }}>Loading...</td></tr>}
                            {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 12 }}>No students found</td></tr>}
                            {!loading && filtered.map((st, idx) => (
                                <tr key={st._id} style={{ background: '#fff', borderTop: '2px solid #e5e7eb' }}>
                                    <td style={{ border: '2px solid #06b6d4' }}>{idx + 1}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>{st.name}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>{st.class || '-'}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>{st.section || '-'}</td>
                                    <td style={{ border: '2px solid #06b6d4' }}>
                                        <select className="cm-input" value={st.house || ''} onChange={e => assignHouse(st._id, e.target.value)}>
                                            <option value="">Unassigned</option>
                                            {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ border: '2px solid #06b6d4', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span className="small" style={{ color: '#6b7280' }}>{st.houseRole ? `Role: ${st.houseRole}` : 'Role: None'}</span>
                                        <button className="btn" title="Set Captain" onClick={() => makeRole(st._id, 'Captain')}>Make Captain</button>
                                        <button className="btn" title="Set Leader" onClick={() => makeRole(st._id, 'Leader')}>Make Leader</button>
                                        <button className="btn" title="Clear Role" onClick={() => makeRole(st._id, '')}>Clear</button>
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
