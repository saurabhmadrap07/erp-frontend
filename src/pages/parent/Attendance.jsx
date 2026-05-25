import React, { useEffect, useMemo, useState } from 'react'
import ParentLayout from '../../components/parent/ParentLayout'
import { getAuth } from '../../utils/session'
import { getAttendance, getReceiptsByStudent, getStudentBasic } from '../../api'

export default function ParentAttendance() {
    const [linked, setLinked] = useState(null)
    const [attendance, setAttendance] = useState([])
    const [receipts, setReceipts] = useState([])
    const [student, setStudent] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        try { const v = localStorage.getItem('parent_linked_student'); if (v) setLinked(JSON.parse(v)) } catch (e) { }
    }, [])

    useEffect(() => {
        async function load() {
            if (!linked) return
            setLoading(true)
            try {
                const { token } = getAuth()
                // Fetch attendance for class/section and filter client-side by studentId
                const items = await getAttendance({ class: linked.class, section: linked.section }, token)
                setAttendance(items || [])
                const recs = await getReceiptsByStudent(linked.id, token)
                setReceipts(recs || [])
                const s = await getStudentBasic(linked.id, token)
                setStudent(s || null)
            } catch (e) { /* ignore */ } finally { setLoading(false) }
        }
        load()
    }, [linked])

    const myAttendance = useMemo(() => {
        if (!linked) return []
        const sid = String(linked.id)
        const rows = []
            ; (attendance || []).forEach(a => {
                const rec = (a.records || []).find(r => String(r.studentId) === sid)
                if (rec) rows.push({ date: a.date, status: rec.status })
            })
        return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
    }, [attendance, linked])

    return (
        <ParentLayout>
            <div className="parent-page">
                <h2>Attendance & Fees</h2>
                {!linked && (
                    <div style={{ marginTop: 12, padding: 14, border: '1px solid #334155', borderRadius: 10, background: '#0f172a' }}>
                        <div style={{ color: '#e2e8f0' }}>No student linked. Link a student using the access code.</div>
                        <a href="/parent/link-student" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/parent/link-student'); window.dispatchEvent(new PopStateEvent('popstate')) }} className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>Link Student</a>
                    </div>
                )}
                {linked && (
                    <div style={{ marginTop: 12, display: 'grid', gap: 16 }}>
                        <div>
                            <div style={{ color: '#94a3b8', marginBottom: 8 }}>Attendance for <strong style={{ color: '#e2e8f0' }}>{linked.name}</strong></div>
                            {loading ? <div>Loading...</div> : (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {myAttendance.length === 0 && <div style={{ color: '#64748b' }}>No attendance found.</div>}
                                    {myAttendance.map((r, i) => (
                                        <div key={i} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1220', display: 'flex', justifyContent: 'space-between' }}>
                                            <div style={{ color: '#e2e8f0' }}>{r.date}</div>
                                            <div style={{ color: r.status === 'present' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{r.status}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <div style={{ color: '#94a3b8', marginBottom: 8 }}>Fees & Payments</div>
                            {loading ? <div>Loading...</div> : (
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {/* Assigned fees with paid/unpaid status */}
                                    {student && Array.isArray(student.assignedFees) && student.assignedFees.length > 0 ? (
                                        student.assignedFees.map((f, i) => {
                                            const paid = (receipts || []).some(rc => String(rc.term || '').toLowerCase() === String(f.term || '').toLowerCase())
                                            return (
                                                <div key={i} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1220', display: 'flex', justifyContent: 'space-between' }}>
                                                    <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{f.term || 'Fee'} — ₹{f.amount || 0}</div>
                                                    <div style={{ color: paid ? '#22c55e' : '#ef4444', fontWeight: 800 }}>{paid ? 'PAID' : 'UNPAID'}</div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div style={{ color: '#64748b' }}>No assigned fees.</div>
                                    )}

                                    {/* Receipts list */}
                                    {(receipts || []).length > 0 && (
                                        <div style={{ marginTop: 6 }}>
                                            <div style={{ color: '#94a3b8', marginBottom: 6 }}>Receipts</div>
                                            <div style={{ display: 'grid', gap: 8 }}>
                                                {(receipts || []).map((rc, i) => (
                                                    <div key={i} style={{ border: '1px solid #334155', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                                                        <div style={{ color: '#e2e8f0', fontWeight: 700 }}>₹{rc.amount} — {rc.class} {rc.term}</div>
                                                        <div style={{ color: '#94a3b8' }}>Receipt: {rc._id}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ParentLayout>
    )
}
