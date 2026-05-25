import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getStudents, getReceiptsByStudent } from '../../api'
import { deleteStudent } from '../../api'
import { createStudent, updateStudent, blockStudent } from '../../api'
import { getAuth } from '../../utils/session'

export default function Students() {
    const [loading, setLoading] = useState(false)
    const [students, setStudents] = useState([])
    const [filters, setFilters] = useState({ name: '', class: '', section: '', email: '', gender: '', category: '', religion: '', stream: '', medium: '' })
    const [receiptsMap, setReceiptsMap] = useState({}) // studentId -> receipts

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const data = await getStudents(filters, token)
            setStudents(data)
        } catch (e) {
            console.error(e)
            setStudents([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // When students change, fetch receipts with throttled concurrency to avoid resource exhaustion
    useEffect(() => {
        async function loadReceipts(list) {
            try {
                const { token } = getAuth()
                const ids = (list || []).map(s => String(s._id))
                const map = {}
                const CONCURRENCY = 5
                for (let i = 0; i < ids.length; i += CONCURRENCY) {
                    const slice = ids.slice(i, i + CONCURRENCY)
                    const batch = await Promise.allSettled(slice.map(id => getReceiptsByStudent(id, token)))
                    batch.forEach((res, j) => {
                        const sid = slice[j]
                        map[sid] = res.status === 'fulfilled' ? (res.value || []) : []
                    })
                }
                setReceiptsMap(map)
            } catch { setReceiptsMap({}) }
        }
        if (students && students.length) loadReceipts(students)
        else setReceiptsMap({})
    }, [students])

    function normalizeTerm(t) { return String(t || '').replace(/\s+/g, '').toLowerCase() }
    function isPaid(studentId, termKey) {
        const recs = receiptsMap[String(studentId)] || []
        return recs.some(r => normalizeTerm(r.term) === termKey)
    }
    function assignedAmount(student, termKey) {
        const arr = Array.isArray(student.assignedFees) ? student.assignedFees : []
        const found = arr.find(f => normalizeTerm(f.term) === termKey)
        return found ? Number(found.amount || 0) : null
    }

    const [showAdd, setShowAdd] = useState(false)
    const [newStudent, setNewStudent] = useState({ name: '', email: '', class: '', password: '', gender: '', category: '', religion: '', stream: '', medium: 'English' })
    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState(null)
    const [savingEdit, setSavingEdit] = useState(false)

    async function onAddStudent(e) {
        e && e.preventDefault()
        try {
            const { token } = getAuth()
            if (!newStudent.name || !newStudent.email || !newStudent.class) return alert('Name, email and class are required')
            setAdding(true)
            const payload = { name: newStudent.name, email: newStudent.email, class: newStudent.class, password: newStudent.password, gender: newStudent.gender, category: newStudent.category, religion: newStudent.religion, medium: newStudent.medium }
            if (newStudent.class === '11' || newStudent.class === '12') payload.stream = newStudent.stream || ''
            await createStudent(payload, token)
            setNewStudent({ name: '', email: '', class: '', password: '', gender: '', category: '', religion: '', stream: '', medium: 'English' })
            setShowAdd(false)
            await load()
            alert('Student created (email sent if SMTP configured)')
        } catch (err) {
            console.error(err)
            alert(err && err.message ? err.message : 'Failed to create student')
        } finally {
            setAdding(false)
        }
    }

    function startEdit(s) {
        setEditing({ ...s })
    }

    function cancelEdit() {
        setEditing(null)
    }

    async function saveEdit(e) {
        e && e.preventDefault()
        if (!editing) return
        setSavingEdit(true)
        try {
            const { token } = getAuth()
            const payload = { class: editing.class, section: editing.section, rollNo: editing.rollNo, name: editing.name, gender: editing.gender, category: editing.category, religion: editing.religion, medium: editing.medium }
            if (editing.class === '11' || editing.class === '12') payload.stream = editing.stream || ''
            await updateStudent(editing._id, payload, token)
            setEditing(null)
            await load()
            alert('Student updated')
        } catch (err) {
            console.error(err)
            alert(err && err.message ? err.message : 'Failed to update student')
        } finally {
            setSavingEdit(false)
        }
    }

    async function onToggleBlock(id, block) {
        const action = block ? 'Block' : 'Unblock'
        if (!confirm(`${action} this student account?`)) return
        try {
            const { token } = getAuth()
            await blockStudent(id, block, token)
            await load()
        } catch (e) { console.error(e); alert('Failed to update block status') }
    }

    function onSearch(e) {
        e && e.preventDefault()
        load()
    }

    return (
        <AdminLayout title="Student Management">
            <div className="admin-page">
                <h2>Student Management</h2>

                <div className="student-search-card" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fdf2f8,#eef2ff)', marginBottom: 12 }}>
                    <div style={{ overflowX: 'auto' }}>
                        <form onSubmit={onSearch} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', paddingBottom: 6 }}>
                            <input placeholder="Name" value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} style={{ minWidth: 160, padding: 8, borderRadius: 6 }} />
                            <input placeholder="Email" value={filters.email} onChange={e => setFilters(f => ({ ...f, email: e.target.value }))} style={{ minWidth: 180, padding: 8, borderRadius: 6 }} />
                            <select value={filters.class} onChange={e => setFilters(f => ({ ...f, class: e.target.value }))} style={{ minWidth: 120, padding: 8, borderRadius: 6 }}>
                                <option value="">All classes</option>
                                {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i + 1)}>{`Class ${i + 1}`}</option>)}
                            </select>
                            <select value={filters.section} onChange={e => setFilters(f => ({ ...f, section: e.target.value }))} style={{ minWidth: 100, padding: 8, borderRadius: 6 }}>
                                <option value="">All sections</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>

                            <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))} style={{ minWidth: 110, padding: 8, borderRadius: 6 }}>
                                <option value="">All genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} style={{ minWidth: 140, padding: 8, borderRadius: 6 }}>
                                <option value="">All categories</option>
                                <option value="General">General</option>
                                <option value="OBC">OBC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="EWS">EWS</option>
                                <option value="Other">Other</option>
                            </select>
                            <select value={filters.religion} onChange={e => setFilters(f => ({ ...f, religion: e.target.value }))} style={{ minWidth: 140, padding: 8, borderRadius: 6 }}>
                                <option value="">All religions</option>
                                <option value="Hindu">Hindu</option>
                                <option value="Muslim">Muslim</option>
                                <option value="Christian">Christian</option>
                                <option value="Sikh">Sikh</option>
                                <option value="Buddhist">Buddhist</option>
                                <option value="Jain">Jain</option>
                                <option value="Other">Other</option>
                            </select>
                            <select value={filters.stream} onChange={e => setFilters(f => ({ ...f, stream: e.target.value }))} style={{ minWidth: 160, padding: 8, borderRadius: 6 }}>
                                <option value="">All streams</option>
                                <option value="PCM">PCM</option>
                                <option value="PCB">PCB</option>
                                <option value="Commerce">Commerce</option>
                                <option value="Arts">Arts</option>
                                <option value="Humanities">Humanities</option>
                            </select>

                            <div style={{ display: 'flex', gap: 8, marginLeft: 6 }}>
                                <button className="btn-primary" type="submit">Search</button>
                                <button type="button" className="btn-secondary" onClick={() => { setFilters({ name: '', class: '', section: '', email: '', gender: '', category: '', religion: '', stream: '' }); setStudents([]) }}>Reset</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <button className="btn-primary" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : 'Add Student'}</button>
                </div>

                {showAdd && (
                    <div className="student-search-card" style={{ padding: 12, borderRadius: 8, background: '#fff', marginBottom: 12 }}>
                        <form onSubmit={onAddStudent} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input placeholder="Name" value={newStudent.name} onChange={e => setNewStudent(ns => ({ ...ns, name: e.target.value }))} />
                            <input placeholder="Email" value={newStudent.email} onChange={e => setNewStudent(ns => ({ ...ns, email: e.target.value }))} />
                            <select value={newStudent.class} onChange={e => setNewStudent(ns => ({ ...ns, class: e.target.value }))}>
                                <option value="">Select class</option>
                                {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i + 1)}>{`Class ${i + 1}`}</option>)}
                            </select>
                            <select value={newStudent.medium || ''} onChange={e => setNewStudent(ns => ({ ...ns, medium: e.target.value }))}>
                                <option value="">Medium</option>
                                <option value="Hindi">Hindi</option>
                                <option value="English">English</option>
                                <option value="Bengali">Bengali</option>
                                <option value="Tamil">Tamil</option>
                                <option value="Telugu">Telugu</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Gujarati">Gujarati</option>
                                <option value="Urdu">Urdu</option>
                                <option value="Kannada">Kannada</option>
                                <option value="Malayalam">Malayalam</option>
                            </select>
                            {(newStudent.class === '11' || newStudent.class === '12') && (
                                <select value={newStudent.stream || ''} onChange={e => setNewStudent(ns => ({ ...ns, stream: e.target.value }))}>
                                    <option value="">Select stream</option>
                                    <option value="PCM">PCM</option>
                                    <option value="PCB">PCB</option>
                                    <option value="Commerce">Commerce</option>
                                    <option value="Arts">Arts</option>
                                    <option value="Humanities">Humanities</option>
                                </select>
                            )}
                            <select value={newStudent.gender} onChange={e => setNewStudent(ns => ({ ...ns, gender: e.target.value }))}>
                                <option value="">Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                            <select value={newStudent.category} onChange={e => setNewStudent(ns => ({ ...ns, category: e.target.value }))}>
                                <option value="">Category</option>
                                <option value="General">General</option>
                                <option value="OBC">OBC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="EWS">EWS</option>
                                <option value="Other">Other</option>
                            </select>
                            <select value={newStudent.religion} onChange={e => setNewStudent(ns => ({ ...ns, religion: e.target.value }))}>
                                <option value="">Religion</option>
                                <option value="Hindu">Hindu</option>
                                <option value="Muslim">Muslim</option>
                                <option value="Christian">Christian</option>
                                <option value="Sikh">Sikh</option>
                                <option value="Buddhist">Buddhist</option>
                                <option value="Jain">Jain</option>
                                <option value="Other">Other</option>
                            </select>
                            <input placeholder="Password (optional)" type="password" value={newStudent.password} onChange={e => setNewStudent(ns => ({ ...ns, password: e.target.value }))} />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-primary" disabled={adding} type="submit">{adding ? 'Adding...' : 'Add'}</button>
                                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setNewStudent({ name: '', email: '', class: '', password: '', gender: '', category: '', religion: '', stream: '', medium: '' }) }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {editing && (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 }}>
                        <h3>Edit student</h3>
                        <form onSubmit={saveEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>Name<input value={editing.name || ''} onChange={e => setEditing(s => ({ ...s, name: e.target.value }))} /></label>
                            <label>Email<input value={editing.email || ''} readOnly /></label>
                            <label>Class
                                <select value={editing.class || ''} onChange={e => setEditing(s => ({ ...s, class: e.target.value }))}>
                                    <option value="">Select</option>
                                    {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i + 1)}>{`Class ${i + 1}`}</option>)}
                                </select>
                            </label>
                            {(editing.class === '11' || editing.class === '12') && (
                                <label>Stream
                                    <select value={editing.stream || ''} onChange={e => setEditing(s => ({ ...s, stream: e.target.value }))}>
                                        <option value="">Select</option>
                                        <option value="PCM">PCM</option>
                                        <option value="PCB">PCB</option>
                                        <option value="Commerce">Commerce</option>
                                        <option value="Arts">Arts</option>
                                        <option value="Humanities">Humanities</option>
                                    </select>
                                </label>
                            )}
                            <label>Medium
                                <select value={editing.medium || ''} onChange={e => setEditing(s => ({ ...s, medium: e.target.value }))}>
                                    <option value="">Select</option>
                                    <option value="Hindi">Hindi</option>
                                    <option value="English">English</option>
                                    <option value="Bengali">Bengali</option>
                                    <option value="Tamil">Tamil</option>
                                    <option value="Telugu">Telugu</option>
                                    <option value="Marathi">Marathi</option>
                                    <option value="Gujarati">Gujarati</option>
                                    <option value="Urdu">Urdu</option>
                                    <option value="Kannada">Kannada</option>
                                    <option value="Malayalam">Malayalam</option>
                                </select>
                            </label>
                            <label>Section
                                <select value={editing.section || ''} onChange={e => setEditing(s => ({ ...s, section: e.target.value }))}>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </label>
                            <label>Roll No<input value={editing.rollNo || ''} onChange={e => setEditing(s => ({ ...s, rollNo: e.target.value }))} /></label>
                            <label>Gender
                                <select value={editing.gender || ''} onChange={e => setEditing(s => ({ ...s, gender: e.target.value }))}>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                            <label>Category
                                <select value={editing.category || ''} onChange={e => setEditing(s => ({ ...s, category: e.target.value }))}>
                                    <option value="">Select</option>
                                    <option value="General">General</option>
                                    <option value="OBC">OBC</option>
                                    <option value="SC">SC</option>
                                    <option value="ST">ST</option>
                                    <option value="EWS">EWS</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                            <label>Religion
                                <select value={editing.religion || ''} onChange={e => setEditing(s => ({ ...s, religion: e.target.value }))}>
                                    <option value="">Select</option>
                                    <option value="Hindu">Hindu</option>
                                    <option value="Muslim">Muslim</option>
                                    <option value="Christian">Christian</option>
                                    <option value="Sikh">Sikh</option>
                                    <option value="Buddhist">Buddhist</option>
                                    <option value="Jain">Jain</option>
                                    <option value="Other">Other</option>
                                </select>
                            </label>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                                <button className="btn-primary" type="submit" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="faculty-table-wrap">
                    <table className="faculty-table">
                        <thead>
                            <tr>
                                <th style={{ padding: 12, textAlign: 'left' }}>Profile</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Class</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Medium</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Stream</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Section</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Roll No</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Gender</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Category</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Religion</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Assigned Fees</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={12} style={{ padding: 18 }}>Loading...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={12} style={{ padding: 18 }}>No students found</td></tr>
                            ) : students.map((s) => (
                                <tr key={s._id || s.email}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {s.avatar ? <img src={s.avatar} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(s.name || 'S')[0]}</div>}
                                            <div style={{ display: 'none' }}></div>
                                        </div>
                                    </td>
                                    <td>{s.name}</td>
                                    <td>{s.email}</td>
                                    <td>{s.class}</td>
                                    <td>{s.medium || '-'}</td>
                                    <td>{(s.class === 11 || s.class === '11' || s.class === 12 || s.class === '12') ? (s.stream || '-') : 'General'}</td>
                                    <td>{s.section}</td>
                                    <td>{s.rollNo}</td>
                                    <td>{s.gender || '-'}</td>
                                    <td>{s.category || '-'}</td>
                                    <td>{s.religion || '-'}</td>
                                    <td>
                                        {(() => {
                                            const t1Amt = assignedAmount(s, 'term1')
                                            const t2Amt = assignedAmount(s, 'term2')
                                            const t1Paid = isPaid(s._id, 'term1')
                                            const t2Paid = isPaid(s._id, 'term2')
                                            const line = (label, amt, paid) => (
                                                <div className="small" key={label}><strong>{label}:</strong> {paid ? 'Paid' : (amt === null ? 'Not assigned' : `₹${amt}`)}</div>
                                            )
                                            return (
                                                <div>
                                                    {line('Term 1', t1Amt, t1Paid)}
                                                    {line('Term 2', t2Amt, t2Paid)}
                                                </div>
                                            )
                                        })()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn-black" onClick={() => startEdit(s)}>Edit</button>
                                            {s.blocked ? (
                                                <button className="btn-primary" onClick={() => onToggleBlock(s._id, false)}>Unblock</button>
                                            ) : (
                                                <button className="btn-black" onClick={() => onToggleBlock(s._id, true)}>Block</button>
                                            )}
                                            <button className="btn-danger" onClick={async () => {
                                                if (!confirm('Delete this student? This will remove the student and their login.')) return
                                                try {
                                                    const { token } = getAuth()
                                                    await deleteStudent(s._id, token)
                                                    await load()
                                                } catch (e) { console.error(e); alert('Delete failed') }
                                            }}>Delete</button>
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
