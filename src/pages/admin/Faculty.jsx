import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import '../../pages/AdminPanel.css'
import { getFaculty, updateFaculty, deleteFaculty, submitFacultyRegistration, approveFacultyRegistration, blockFaculty } from '../../api'
import { getAuth } from '../../utils/session'

export default function Faculty() {
    const [loading, setLoading] = useState(false)
    const [faculty, setFaculty] = useState([])
    const [filters, setFilters] = useState({ name: '', email: '', employeeId: '', subject: '' })
    const [searchTerm, setSearchTerm] = useState('')
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showAdd, setShowAdd] = useState(false)
    const [adding, setAdding] = useState(false)
    const [newFaculty, setNewFaculty] = useState({ name: '', email: '', subject: '', subjectOther: '', contact: '', experience: '', education: '', classGrade: '' })
    const [isManualSubject, setIsManualSubject] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const { token } = getAuth()
            const data = await getFaculty(filters, token)
            setFaculty(data)
        } catch (e) {
            console.error(e)
            setFaculty([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    function onSearch(e) { e && e.preventDefault(); load() }

    // override onSearch to use single searchTerm across name/email/employeeId
    function onSearch(e) {
        e && e.preventDefault()
        // populate filters so backend will search across these fields
        const q = (searchTerm || '').trim()
        setFilters({ name: q, email: q, employeeId: q, subject: '' })
            // call load after state update; load reads current filters, but to be safe call getFaculty directly
            ; (async () => {
                setLoading(true)
                try {
                    const { token } = getAuth()
                    const data = await getFaculty({ name: q, email: q, employeeId: q }, token)
                    setFaculty(data)
                } catch (err) {
                    console.error(err)
                    setFaculty([])
                } finally {
                    setLoading(false)
                }
            })()
    }

    async function onDelete(id) {
        if (!confirm('Delete this faculty? This action cannot be undone.')) return
        try {
            const { token } = getAuth()
            await deleteFaculty(id, token)
            await load()
        } catch (e) { console.error(e); alert('Delete failed') }
    }

    function startEdit(f) { setEditing({ ...f }) }
    function cancelEdit() { setEditing(null) }

    function openAdd() { setNewFaculty({ name: '', email: '', subject: '', subjectOther: '', contact: '', experience: '', education: '', classGrade: '' }); setIsManualSubject(false); setShowAdd(true) }
    function closeAdd() { setShowAdd(false) }

    async function saveNewFaculty(e) {
        e && e.preventDefault()
        try {
            setAdding(true)
            // build payload: if subject is Other, send subjectOther instead
            const subjectValue = isManualSubject ? (newFaculty.subjectOther || '') : newFaculty.subject
            const payload = {
                name: newFaculty.name,
                email: newFaculty.email,
                subject: subjectValue,
                education: newFaculty.education,
                contact: newFaculty.contact,
                avatar: newFaculty.avatar,
                experience: newFaculty.experience,
                classGrade: newFaculty.classGrade
            }

            // submit a registration then approve it immediately (admin user) so an account is created and email sent
            const reg = await submitFacultyRegistration(payload)
            const { token } = getAuth()
            if (token && reg && reg._id) {
                await approveFacultyRegistration(reg._id, token)
            }
            await load()
            closeAdd()
            alert('Faculty added and notified (if SMTP configured).')
        } catch (err) {
            console.error(err)
            alert('Failed to add faculty: ' + (err && err.message ? err.message : String(err)))
        }
        setAdding(false)
    }

    async function saveEdit(e) {
        e && e.preventDefault()
        if (!editing) return
        setSaving(true)
        try {
            const { token } = getAuth()
            await updateFaculty(editing._id, editing, token)
            setEditing(null)
            await load()
        } catch (err) { console.error(err); alert('Save failed') }
        setSaving(false)
    }

    async function onToggleBlock(id, block) {
        const action = block ? 'Block' : 'Unblock'
        if (!confirm(`${action} this faculty account?`)) return
        try {
            const { token } = getAuth()
            await blockFaculty(id, block, token)
            await load()
        } catch (e) { console.error(e); alert('Failed to update block status') }
    }

    return (
        <AdminLayout title="Faculty Management">
            <div className="admin-page">
                <h2>Faculty Management</h2>

                <div className="student-search-card" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fef3c7,#eef2ff)', marginBottom: 12 }}>
                    <form onSubmit={onSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <input
                            placeholder="Search by name, email or employee ID"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: 220 }}
                        />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" type="submit">Search</button>
                            <button type="button" className="btn-secondary" onClick={() => { setSearchTerm(''); setFilters({ name: '', email: '', employeeId: '', subject: '' }); setFaculty([]) }}>Reset</button>
                        </div>
                    </form>
                </div>

                {editing && (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 }}>
                        <h3>Edit faculty</h3>
                        <form onSubmit={saveEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>Name<input value={editing.name || ''} onChange={e => setEditing(s => ({ ...s, name: e.target.value }))} /></label>
                            <label>Email<input value={editing.email || ''} onChange={e => setEditing(s => ({ ...s, email: e.target.value }))} /></label>
                            <label>Contact<input value={editing.contact || ''} onChange={e => setEditing(s => ({ ...s, contact: e.target.value }))} /></label>
                            <label>Subject<input value={editing.subject || ''} onChange={e => setEditing(s => ({ ...s, subject: e.target.value }))} /></label>
                            <label>Role
                                <select value={editing.role || 'Asst. Teacher'} onChange={e => setEditing(s => ({ ...s, role: e.target.value }))}>
                                    <option>Asst. Teacher</option>
                                    <option>Associate Teacher</option>
                                    <option>Professor</option>
                                    <option>Teacher</option>
                                    <option>Other</option>
                                </select>
                            </label>
                            <label>Experience<input value={editing.experience || ''} onChange={e => setEditing(s => ({ ...s, experience: e.target.value }))} /></label>
                            <label>Employee ID<input value={editing.employeeId || ''} onChange={e => setEditing(s => ({ ...s, employeeId: e.target.value }))} /></label>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <h4>Assignments</h4>
                                {(editing.assignments || []).map((a, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <input placeholder="Class" value={a.class || ''} onChange={e => setEditing(s => { const next = { ...s }; next.assignments[idx].class = e.target.value; return next })} />
                                        <input placeholder="Section" value={a.section || ''} onChange={e => setEditing(s => { const next = { ...s }; next.assignments[idx].section = e.target.value; return next })} />
                                        <input placeholder="Subjects (comma separated)" value={(a.subjects || []).join(', ')} onChange={e => setEditing(s => { const next = { ...s }; next.assignments[idx].subjects = e.target.value.split(',').map(x => x.trim()).filter(Boolean); return next })} />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={!!a.isClassTeacher} onChange={e => setEditing(s => { const next = { ...s }; next.assignments[idx].isClassTeacher = e.target.checked; return next })} /> Class Teacher</label>
                                        <button type="button" onClick={() => setEditing(s => { const next = { ...s }; next.assignments = (next.assignments || []).filter((_, i) => i !== idx); return next })}>Remove</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setEditing(s => ({ ...s, assignments: [...(s.assignments || []), { class: '', section: '', subjects: [], isClassTeacher: false }] }))}>Add assignment</button>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <h4>House assignments</h4>
                                {(editing.houses || []).map((h, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <input placeholder="House name" value={h.house || ''} onChange={e => setEditing(s => { const next = { ...s }; next.houses[idx].house = e.target.value; return next })} />
                                        <select value={h.role || 'member'} onChange={e => setEditing(s => { const next = { ...s }; next.houses[idx].role = e.target.value; return next })}>
                                            <option value="member">member</option>
                                            <option value="mentor">mentor</option>
                                            <option value="head mentor">head mentor</option>
                                        </select>
                                        <button type="button" onClick={() => setEditing(s => { const next = { ...s }; next.houses = (next.houses || []).filter((_, i) => i !== idx); return next })}>Remove</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setEditing(s => ({ ...s, houses: [...(s.houses || []), { house: '', role: 'member' }] }))}>Add house assignment</button>
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={cancelEdit} style={{ background: 'linear-gradient(90deg,#7c3aed,#6d28d9)', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
                                <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0b1220' }}>All Faculty</div>
                    <div>
                        <button
                            onClick={openAdd}
                            style={{
                                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 800, color: '#071132',
                                border: '2px solid transparent', background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg,#7c3aed,#06b6d4) border-box'
                            }}
                        >
                            + Add Faculty
                        </button>
                    </div>
                </div>

                {showAdd && (
                    <div className="faculty-add-modal-backdrop">
                        <div className="faculty-add-modal">
                            <div className="faculty-add-header">
                                <div style={{ fontSize: 18, fontWeight: 800 }}>Add Faculty</div>
                                <button onClick={closeAdd} className="faculty-add-close">×</button>
                            </div>
                            <form onSubmit={saveNewFaculty} className="faculty-add-form">
                                <label>Name
                                    <input className="boxed-input" placeholder="Full name" required value={newFaculty.name} onChange={e => setNewFaculty(s => ({ ...s, name: e.target.value }))} />
                                </label>
                                <label>Email
                                    <input className="boxed-input" placeholder="email@example.com" required type="email" value={newFaculty.email} onChange={e => setNewFaculty(s => ({ ...s, email: e.target.value }))} />
                                </label>
                                {isManualSubject ? (
                                    <label>Subject
                                        <input className="boxed-input" placeholder="Write subject manually" required value={newFaculty.subjectOther} onChange={e => setNewFaculty(s => ({ ...s, subjectOther: e.target.value }))} />
                                        <div style={{ marginTop: 6 }}><button type="button" className="btn-secondary" onClick={() => { setIsManualSubject(false); setNewFaculty(s => ({ ...s, subjectOther: '' })) }}>Use dropdown</button></div>
                                    </label>
                                ) : (
                                    <label>Subject
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <select className="boxed-input" required value={newFaculty.subject} onChange={e => setNewFaculty(s => ({ ...s, subject: e.target.value }))}>
                                                <option value="">Select subject</option>
                                                <option value="General (1-12)">General (1-12)</option>
                                                <option value="Mathematics">Mathematics</option>
                                                <option value="Science">Science</option>
                                                <option value="English">English</option>
                                                <option value="Computer">Computer</option>
                                                <option value="History">History</option>
                                            </select>
                                            <button type="button" className="btn-secondary" onClick={() => { setIsManualSubject(true); setNewFaculty(s => ({ ...s, subjectOther: '' })) }}>Write manually</button>
                                        </div>
                                    </label>
                                )}
                                <label>Contact
                                    <input className="boxed-input" placeholder="Phone or WhatsApp" required value={newFaculty.contact} onChange={e => setNewFaculty(s => ({ ...s, contact: e.target.value }))} />
                                </label>
                                <label>Experience
                                    <input className="boxed-input" placeholder="e.g. 5 years" required value={newFaculty.experience} onChange={e => setNewFaculty(s => ({ ...s, experience: e.target.value }))} />
                                </label>
                                <label>Education
                                    <input className="boxed-input" placeholder="Highest qualification" required value={newFaculty.education} onChange={e => setNewFaculty(s => ({ ...s, education: e.target.value }))} />
                                </label>
                                <label>Class (1 to 12)
                                    <input className="boxed-input" placeholder="e.g. 6" required type="number" min="1" max="12" value={newFaculty.classGrade} onChange={e => setNewFaculty(s => ({ ...s, classGrade: e.target.value }))} />
                                </label>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button type="button" className="btn-secondary" onClick={closeAdd}>Cancel</button>
                                    <button className="btn-primary" type="submit" disabled={adding}>{adding ? 'Adding...' : 'Save & Notify'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="faculty-table-wrap" style={{ borderRadius: 12, overflowX: 'auto', overflowY: 'hidden' }}>
                    <table className="faculty-table" style={{ width: '100%' }}>
                        <thead style={{ background: 'linear-gradient(90deg,#06b6d4,#60a5fa)', color: '#fff' }}>
                            <tr>
                                <th style={{ padding: 12, textAlign: 'left' }}>Profile</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Contact</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Specialization</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Assignments</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Promotion (Class/Section)</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Experience</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Role</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Houses</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Employee ID</th>
                                <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} style={{ padding: 18 }}>Loading...</td></tr>
                            ) : faculty.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding: 18 }}>No faculty found</td></tr>
                            ) : faculty.map((f) => (
                                <tr key={f._id || f.employeeId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: 12 }}>
                                        {f.avatar ? <img src={f.avatar} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(f.name || 'F')[0]}</div>}
                                    </td>
                                    <td style={{ padding: 12 }}>{f.name}</td>
                                    <td style={{ padding: 12 }}>{f.email}</td>
                                    <td style={{ padding: 12 }}>{f.contact}</td>
                                    <td style={{ padding: 12 }}>{f.subject}</td>
                                    <td style={{ padding: 12 }}>
                                        {(f.assignments || []).map((a, idx) => (
                                            <div key={idx} style={{ fontSize: 13 }}>{a.class || ''}{a.section ? (' / ' + a.section) : ''} {a.subjects && a.subjects.length ? ` — ${a.subjects.join(', ')}` : ''}{a.isClassTeacher ? ' (Class Teacher)' : ''}</div>
                                        ))}
                                    </td>
                                    <td style={{ padding: 12 }}>{(f.assignments || []).filter(a => a.isClassTeacher).map(a => `${a.class || ''}${a.section ? ' / ' + a.section : ''}`).join(', ') || '-'}</td>
                                    <td style={{ padding: 12 }}>{f.experience}</td>
                                    <td style={{ padding: 12 }}>{f.role || '-'}</td>
                                    <td style={{ padding: 12 }}>{(f.houses || []).map(h => `${h.house || ''}${h.role ? ' (' + h.role + ')' : ''}`).join(', ') || '-'}</td>
                                    <td style={{ padding: 12 }}>{f.employeeId}</td>
                                    <td style={{ padding: 12 }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn-black" onClick={() => startEdit(f)}>Edit</button>
                                            {f.blocked ? (
                                                <button className="btn-primary" onClick={() => onToggleBlock(f._id, false)}>Unblock</button>
                                            ) : (
                                                <button className="btn-black" onClick={() => onToggleBlock(f._id, true)}>Block</button>
                                            )}
                                            <button className="btn-danger" onClick={() => onDelete(f._id)}>Delete</button>
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
