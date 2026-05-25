import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAuth } from '../../utils/session'
import { createNotice, getNotices, API_BASE } from '../../api'

export default function AdminNotices() {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [targets, setTargets] = useState(['student'])
    const [file, setFile] = useState(null)
    const [studentAll, setStudentAll] = useState(true)
    const [studentClass, setStudentClass] = useState('')
    const [studentSection, setStudentSection] = useState('')
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(false)

    async function loadHistory() {
        try {
            const { token } = getAuth()
            const items = await getNotices({}, token)
            setHistory(items || [])
        } catch (e) { setHistory([]) }
    }

    useEffect(() => { loadHistory() }, [])

    function toggleTarget(role) {
        setTargets(t => t.includes(role) ? t.filter(x => x !== role) : [...t, role])
    }

    async function submit(e) {
        e.preventDefault()
        if (!title) return alert('Please add a title')
        try {
            const { token } = getAuth()
            setLoading(true)
            const payload = { title, body, targets }
            if (file) {
                payload.file = file
                payload.studentAll = studentAll
                payload.studentClass = studentClass
                payload.studentSection = studentSection
            } else {
                // include student filters even if no file so backend stores them
                payload.studentAll = studentAll
                payload.studentClass = studentClass
                payload.studentSection = studentSection
            }
            await createNotice(payload, token)
            setTitle('')
            setBody('')
            setTargets(['student'])
            setFile(null)
            setStudentAll(true)
            setStudentClass('')
            setStudentSection('')
            await loadHistory()
            alert('Notice created')
        } catch (err) { console.error(err); alert('Failed to create notice') }
        finally { setLoading(false) }
    }

    return (
        <AdminLayout title="Notices">
            <div className="admin-page">
                <div className="card admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', padding: 18, color: '#fff' }}>
                        <h2 style={{ margin: 0 }}>Create Notice</h2>
                        <div style={{ fontSize: 13, opacity: 0.95 }}>Post announcements and optional PDF to selected recipients</div>
                    </div>

                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, background: 'linear-gradient(180deg,#fff,#fbfbff)' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontWeight: 800, color: '#0b1220' }}>Title</div>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter notice title" style={{ padding: 12, borderRadius: 10, border: '2px solid #000', color: '#000', fontSize: 16 }} />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontWeight: 800, color: '#0b1220' }}>Body</div>
                            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write notice body..." style={{ minHeight: 140, padding: 12, borderRadius: 10, border: '2px solid #000', color: '#000', fontSize: 14, resize: 'vertical' }} />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontWeight: 800, color: '#0b1220' }}>Attach PDF (optional)</div>
                            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files && e.target.files[0])} />
                        </label>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={targets.includes('student')} onChange={() => toggleTarget('student')} /> <span style={{ fontWeight: 700 }}>Students</span></label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={targets.includes('faculty')} onChange={() => toggleTarget('faculty')} /> <span style={{ fontWeight: 700 }}>Faculty</span></label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={targets.includes('parent')} onChange={() => toggleTarget('parent')} /> <span style={{ fontWeight: 700 }}>Parents</span></label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={targets.includes('staff')} onChange={() => toggleTarget('staff')} /> <span style={{ fontWeight: 700 }}>Staff</span></label>
                        </div>

                        {/* Student-specific options box */}
                        {targets.includes('student') && (
                            <div style={{ border: '2px solid #7c3aed', borderRadius: 10, padding: 14, marginTop: 4, background: 'linear-gradient(180deg,#f9f5ff,#fff)' }}>
                                <div style={{ fontWeight: 900, marginBottom: 8, color: '#4c1d95' }}>Student recipients</div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input type="radio" name="studentMode" checked={studentAll} onChange={() => setStudentAll(true)} />
                                        <span style={{ fontWeight: 700 }}>All students</span>
                                    </label>
                                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input type="radio" name="studentMode" checked={!studentAll} onChange={() => setStudentAll(false)} />
                                        <span style={{ fontWeight: 700 }}>Specific class / section</span>
                                    </label>
                                </div>
                                {!studentAll && (
                                    <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ minWidth: 120 }}>
                                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 700, marginBottom: 6 }}>Class</div>
                                            <select value={studentClass} onChange={e => setStudentClass(e.target.value)} style={{ padding: 10, borderRadius: 8, minWidth: 120 }}>
                                                <option value="">Select class</option>
                                                {Array.from({ length: 12 }).map((_, i) => <option key={i} value={String(i + 1)}>{String(i + 1)}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ minWidth: 120 }}>
                                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 700, marginBottom: 6 }}>Section</div>
                                            <select value={studentSection} onChange={e => setStudentSection(e.target.value)} style={{ padding: 10, borderRadius: 8, minWidth: 120 }}>
                                                <option value="">Select section</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '10px 18px', borderRadius: 10 }}>{loading ? 'Sending...' : 'Send Notice'}</button>
                        </div>
                    </form>
                </div>

                <div className="card admin-card" style={{ padding: 12, marginTop: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Notice History</h3>
                    <table className="data-table colorful-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #000' }}>Title</th>
                                <th>Targets</th>
                                <th style={{ border: '1px solid #000' }}>Body</th>
                                <th>Attachment</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 18 }}>No notices yet.</td></tr>}
                            {history.map(n => (
                                <tr key={n._id}>
                                    <td style={{ border: '1px solid #000', padding: 8 }}>{n.title}</td>
                                    <td style={{ padding: 8 }}>{(n.targets || []).join(', ')}</td>
                                    <td style={{ border: '1px solid #000', padding: 8 }}>{n.body}</td>
                                    <td style={{ padding: 8 }}>{n.filePath ? (() => { const href = n.filePath.startsWith('http') ? n.filePath : (API_BASE + n.filePath); return <a href={href} target="_blank" rel="noreferrer">PDF</a> })() : '-'}</td>
                                    <td style={{ padding: 8 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
