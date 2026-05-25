import React, { useState, useEffect } from 'react'
import FacultyLayout from '../../components/faculty/FacultyLayout'
import { getAuth } from '../../utils/session'
import { createAssignment, getAssignments, getSubmissions, extendAssignment, API_BASE, getMyFaculty } from '../../api'

export default function Assignments() {
    const [subject, setSubject] = useState('Math')
    const [klass, setKlass] = useState('1')
    const [section, setSection] = useState('ALL')
    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('')
    const [due, setDue] = useState(new Date().toISOString().slice(0, 10))
    const [file, setFile] = useState(null)
    const [history, setHistory] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [viewingSubsFor, setViewingSubsFor] = useState(null)

    async function loadHistory() {
        try {
            const { token } = getAuth()
            if (notAssigned) { setHistory([]); return }
            if (assigned === null) return
            const items = await getAssignments({ class: klass, section }, token)
            setHistory(items || [])
        } catch (e) { console.error(e); alert('Failed to load assignments') }
    }

    // resolve faculty assignments and default class/section
    const [assigned, setAssigned] = React.useState(null)
    const [notAssigned, setNotAssigned] = React.useState(false)

    useEffect(() => {
        let mounted = true
        async function resolve() {
            try {
                const { token } = getAuth()
                const f = await getMyFaculty(token).catch(() => null)
                if (!f || !Array.isArray(f.assignments) || f.assignments.length === 0) {
                    if (mounted) { setNotAssigned(true); setAssigned([]); setHistory([]) }
                    return
                }
                const map = {}
                for (const a of f.assignments || []) {
                    const cls = String(a.class || '')
                    if (!cls) continue
                    if (!map[cls]) map[cls] = { sections: new Set(), isClassTeacher: false }
                    if (a.section) map[cls].sections.add(String(a.section))
                    if (a.isClassTeacher) map[cls].isClassTeacher = true
                }
                const assignedList = Object.keys(map).map(k => ({ class: k, sections: Array.from(map[k].sections), isClassTeacher: !!map[k].isClassTeacher }))
                if (mounted) {
                    setAssigned(assignedList)
                    setNotAssigned(false)
                    // limit default selection to classes where faculty is class teacher
                    const classTeacherList = assignedList.filter(x => x.isClassTeacher)
                    if (classTeacherList.length > 0) {
                        setKlass(classTeacherList[0].class)
                        setSection(classTeacherList[0].sections[0] || 'ALL')
                    } else if (assignedList.length > 0) {
                        // fallback: keep first assigned (not class teacher)
                        setKlass(assignedList[0].class)
                        setSection(assignedList[0].sections[0] || 'ALL')
                    }
                }
            } catch (e) { console.warn('resolve assignments failed', e); if (mounted) setNotAssigned(true) }
        }
        resolve()
        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => { loadHistory() }, [klass, section, assigned, notAssigned])

    async function upload(e) {
        e.preventDefault()
        try {
            const { token } = getAuth()
            const fd = new FormData()
            fd.append('subject', subject)
            fd.append('class', klass)
            fd.append('section', section)
            fd.append('title', title)
            fd.append('description', desc)
            fd.append('dueDate', due)
            if (file) fd.append('file', file)
            await createAssignment(fd, token)
            setTitle(''); setDesc(''); setFile(null)
            await loadHistory()
            alert('Assignment created')
        } catch (err) { console.error(err); alert('Failed to create assignment: ' + (err.message || 'server error')) }
    }

    async function openSubmissions(assignmentId) {
        try {
            const { token } = getAuth()
            const subs = await getSubmissions(assignmentId, token)
            setSubmissions(subs || [])
            setViewingSubsFor(assignmentId)
        } catch (e) { console.error(e); alert('Failed to load submissions') }
    }

    async function handleExtend(id) {
        const nd = prompt('Enter new due date (YYYY-MM-DD)')
        if (!nd) return
        try {
            const { token } = getAuth()
            await extendAssignment(id, nd, token)
            await loadHistory()
            alert('Due date updated')
        } catch (e) { console.error(e); alert('Failed to extend due date') }
    }

    return (
        <FacultyLayout title="Assignments">
            <div className="faculty-page">
                <h2>Add Assignment</h2>
                <form className="card assignment-form-card" style={{ padding: 16 }} onSubmit={upload}>
                    <label>Subject
                        <input value={subject} onChange={e => setSubject(e.target.value)} />
                    </label>
                    <label>Class
                        <select value={klass} onChange={e => setKlass(e.target.value)}>
                            {/** Only show classes where faculty is class teacher **/}
                            {(assigned || []).filter(a => a.isClassTeacher).map(a => (
                                <option key={a.class} value={a.class}>Class {a.class}</option>
                            ))}
                        </select>
                    </label>
                    <label>Section
                        <select value={section} onChange={e => setSection(e.target.value)}>
                            {
                                // find selected class entry
                                ((assigned || []).find(a => String(a.class) === String(klass)) || { sections: [], isClassTeacher: false }).isClassTeacher
                                    ? [<option key="ALL" value="ALL">All</option>, ...(((assigned || []).find(a => String(a.class) === String(klass)) || { sections: [] }).sections.map(s => <option key={s} value={s}>{s}</option>))]
                                    : [<option key="ALL" value="ALL">All</option>, ...(((assigned || []).find(a => String(a.class) === String(klass)) || { sections: [] }).sections.map(s => <option key={s} value={s}>{s}</option>))]
                            }
                        </select>
                    </label>
                    <label>Title
                        <input value={title} onChange={e => setTitle(e.target.value)} />
                    </label>
                    <label>Description
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} />
                    </label>
                    <label>Upload File
                        <input type="file" onChange={e => setFile(e.target.files[0])} />
                    </label>
                    <label>Due Date
                        <input type="date" value={due} onChange={e => setDue(e.target.value)} />
                    </label>

                    <div style={{ marginTop: 12 }}>
                        <button className="btn-primary" type="submit">Upload</button>
                    </div>
                </form>

                <div style={{ marginTop: 16 }}>
                    <h3>Assignment History</h3>
                    {history.length === 0 && <div className="small">No assignments for this class/section.</div>}
                    <div className="assignment-history">
                        {history.map(a => (
                            <div key={a._id} className="assignment-history-card">
                                <div className={`assignment-side ${a.subject ? ('side-' + String(a.subject).toLowerCase()) : 'side-default'}`}>
                                    <div className="subject-badge">{a.subject || 'Subject'}</div>
                                    <div className="due">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</div>
                                </div>

                                <div className="assignment-main">
                                    <div className="title">{a.title}</div>
                                    <div className="desc">{a.description}</div>
                                </div>

                                <div className="assignment-actions">
                                    <button className="btn" onClick={() => openSubmissions(a._id)}>View Submissions</button>
                                    <button className="btn outline" onClick={() => handleExtend(a._id)}>Extend Due Date</button>
                                    {a.filePath && <a className="btn outline" href={(a.filePath && a.filePath.startsWith('http')) ? a.filePath : `${API_BASE}${a.filePath}`} target="_blank" rel="noreferrer">Download File</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {viewingSubsFor && (
                    <div className="card" style={{ marginTop: 12 }}>
                        <h4>Submissions</h4>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {submissions.length === 0 && <div className="small">No submissions yet.</div>}
                            {submissions.map(s => (
                                <div key={s._id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{s.studentName || s.studentEmail}</strong>
                                            <div className="small">{s.studentEmail}</div>
                                            <div className="small">Roll: {s.studentRoll || 'N/A'} • Class: {s.studentClass || 'N/A'}</div>
                                        </div>
                                        <div className="small">{new Date(s.submittedAt || s.createdAt).toLocaleString()}</div>
                                    </div>
                                    {s.answerText && <div style={{ marginTop: 6 }}>{s.answerText}</div>}
                                    {s.filePath && <div style={{ marginTop: 6 }}><a href={(s.filePath && s.filePath.startsWith('http')) ? s.filePath : `${API_BASE}${s.filePath}`} target="_blank" rel="noreferrer">Download Submission</a></div>}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 8 }}><button className="btn" onClick={() => setViewingSubsFor(null)}>Close</button></div>
                    </div>
                )}
            </div>
        </FacultyLayout>
    )
}
