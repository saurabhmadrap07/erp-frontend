import React, { useEffect, useMemo, useState } from 'react'
import FacultyLayout from '../../components/faculty/FacultyLayout'
import { getStudents, getMyFaculty } from '../../api'
import { getAuth } from '../../utils/session'

const HOUSES = ['Red', 'Green', 'Yellow', 'Blue', 'Purple']
const HOUSE_COLORS = {
    Red: '#ef4444', Green: '#22c55e', Yellow: '#f59e0b', Blue: '#3b82f6', Purple: '#a855f7'
}

export default function HouseManagement() {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [q, setQ] = useState('')
    const { token } = getAuth()

    const [assigned, setAssigned] = useState(null)
    const [notAssigned, setNotAssigned] = useState(false)

    async function load() {
        setLoading(true)
        try {
            if (notAssigned) { setStudents([]); return }
            if (assigned === null) return
            const houses = Array.isArray(assigned) ? assigned : []
            if (houses.length === 0) { setStudents([]); return }
            // fetch students for those houses only
            const promises = houses.map(h => getStudents({ house: h }, token).catch(() => []))
            const lists = await Promise.all(promises)
            const merged = [].concat(...lists)
            setStudents(merged)
        } catch (e) { console.error('Failed to load students', e); setStudents([]) }
        finally { setLoading(false) }
    }

    useEffect(() => {
        let mounted = true
        async function resolve() {
            try {
                const token = sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token')
                const f = await getMyFaculty(token).catch(() => null)
                if (!f || !Array.isArray(f.houses) || f.houses.length === 0) { if (mounted) { setNotAssigned(true); setAssigned([]) }; return }
                // map to simple structure with house and role
                // include only houses where faculty is head mentor
                const raw = (f.houses || []).filter(h => h && h.house && String((h.role || '').toString()).toLowerCase() === 'head mentor').map(h => String(h.house))
                // canonicalize to known house names (trim + case-insensitive match)
                const canon = raw.map(r => {
                    const name = String(r || '').trim()
                    const match = HOUSES.find(hn => hn.toLowerCase() === name.toLowerCase())
                    return match || name
                }).filter(Boolean)
                if (mounted) { setAssigned(canon); setNotAssigned(false) }
            } catch (e) { console.warn('resolve houses failed', e); if (mounted) setNotAssigned(true) }
        }
        resolve()
        return () => { mounted = false }
    }, [])

    useEffect(() => { load() }, [assigned, notAssigned])

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase()
        if (!term) return students
        return students.filter(s => (
            (s.name || '').toLowerCase().includes(term) ||
            (s.rollNo || '').toLowerCase().includes(term) ||
            (s.class || '').toLowerCase().includes(term) ||
            (s.section || '').toLowerCase().includes(term) ||
            (s.house || '').toLowerCase().includes(term)
        ))
    }, [students, q])

    const byHouse = useMemo(() => {
        const map = new Map()
        HOUSES.forEach(h => map.set(h, []))
        filtered.forEach(st => {
            const h = st.house && HOUSES.includes(st.house) ? st.house : 'Unassigned'
            if (!map.has(h)) map.set(h, [])
            map.get(h).push(st)
        })
        return map
    }, [filtered])

    return (
        <FacultyLayout title="House Management">
            <div style={{ padding: 20 }}>
                <h2 style={{ textAlign: 'center', color: '#0f172a', marginTop: 4 }}>House Lists</h2>
                <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, roll, class, section or house..." style={{ flex: 1, padding: '10px 12px', borderRadius: 999, border: '2px solid #3b82f6' }} />
                    <button onClick={load} style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)', color: '#fff', border: 'none' }}>Refresh</button>
                </div>

                {[...byHouse.entries()].map(([house, list]) => {
                    const color = HOUSE_COLORS[house] || '#64748b'
                    return (
                        <div key={house} style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ margin: 0 }}>{house}</h3>
                                <span style={{ padding: '4px 8px', borderRadius: 999, border: `2px solid ${color}`, color, background: '#fff' }}>{list.length} students</span>
                            </div>
                            <div style={{ overflowX: 'auto', marginTop: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: 10, borderBottom: `3px solid ${color}`, background: '#f1f5f9' }}>#</th>
                                            <th style={{ textAlign: 'left', padding: 10, borderBottom: `3px solid ${color}`, background: '#f1f5f9' }}>Name</th>
                                            <th style={{ textAlign: 'left', padding: 10, borderBottom: `3px solid ${color}`, background: '#f1f5f9' }}>Roll No</th>
                                            <th style={{ textAlign: 'left', padding: 10, borderBottom: `3px solid ${color}`, background: '#f1f5f9' }}>Class</th>
                                            <th style={{ textAlign: 'left', padding: 10, borderBottom: `3px solid ${color}`, background: '#f1f5f9' }}>Section</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: 12, color: '#6b7280' }}>No students</td></tr>
                                        )}
                                        {list.map((st, idx) => (
                                            <tr key={st._id} style={{ background: 'linear-gradient(180deg,#ffffff,#f8fafc)' }}>
                                                <td style={{ padding: 10, borderLeft: `2px solid ${color}`, borderBottom: '1px solid #e5e7eb' }}>{idx + 1}</td>
                                                <td style={{ padding: 10, borderLeft: `2px solid ${color}`, borderBottom: '1px solid #e5e7eb' }}>{st.name}</td>
                                                <td style={{ padding: 10, borderLeft: `2px solid ${color}`, borderBottom: '1px solid #e5e7eb' }}>{st.rollNo || '—'}</td>
                                                <td style={{ padding: 10, borderLeft: `2px solid ${color}`, borderBottom: '1px solid #e5e7eb' }}>{st.class || '—'}</td>
                                                <td style={{ padding: 10, borderLeft: `2px solid ${color}`, borderBottom: '1px solid #e5e7eb' }}>{st.section || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                })}
            </div>
        </FacultyLayout>
    )
}
