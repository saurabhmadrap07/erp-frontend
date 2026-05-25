import React, { useEffect, useState } from 'react'
import StudentLayout from '../../components/student/StudentLayout'
import { getMyStudent, getAssignments, submitAssignment, getSubmissions, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function Assignments() {
    const [student, setStudent] = useState(null)
    const [assignments, setAssignments] = useState([])
    const [answers, setAnswers] = useState({})
    const [files, setFiles] = useState({})
    const [mySubs, setMySubs] = useState({}) // map assignmentId -> submission
    const [editing, setEditing] = useState({})
    const [query, setQuery] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const { token } = getAuth()
                const stu = await getMyStudent(token)
                setStudent(stu)
                const cls = stu.class
                const sec = stu.section || 'ALL'
                const items = await getAssignments({ class: cls, section: sec }, token)
                setAssignments(items || [])
                // load existing submissions for this student for each assignment
                try {
                    const subsArr = await Promise.all((items || []).map(a => getSubmissions(a._id, token).catch(() => [])))
                    const map = {}
                    subsArr.forEach((arr, i) => {
                        const a = items[i]
                        if (!a) return
                        const found = (arr || []).find(s => s.studentEmail === (stu.email || ''))
                        if (found) map[a._id] = found
                    })
                    setMySubs(map)
                } catch (e) {
                    console.warn('Failed to load submissions for student', e)
                }
            } catch (e) { console.error(e) }
        }
        load()
    }, [])

    async function handleSubmit(a) {
        try {
            const { token } = getAuth()
            const fd = new FormData()
            fd.append('answerText', answers[a._id] || '')
            if (files[a._id]) fd.append('file', files[a._id])
            const submission = await submitAssignment(a._id, fd, token)
            // update local map so UI shows submitted state immediately
            setMySubs(s => ({ ...s, [a._id]: submission }))
            setEditing(e => ({ ...e, [a._id]: false }))
            alert('Submitted')
        } catch (e) { console.error(e); alert('Failed to submit: ' + (e.message || 'server error')) }
    }

    function isClosed(a) {
        if (!a.dueDate) return false
        return new Date() > new Date(a.dueDate)
    }

    return (
        <StudentLayout title="Assignments">
            <div className="student-page assignments-page">
                <h3>Assignments</h3>
                <div className="assignments-inner">
                    <div className="assignments-search-card card">
                        <input
                            className="assignments-search-input"
                            placeholder="Search assignments by title, subject or description..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    {assignments.length === 0 && <div className="small">No assignments found.</div>}
                    <div className="assignments-list">
                        {assignments
                            .filter(a => {
                                if (!query) return true
                                const hay = ((a.title || '') + ' ' + (a.description || '') + ' ' + (a.subject || '')).toLowerCase()
                                return hay.includes(query.toLowerCase())
                            })
                            .map(a => (
                                <div key={a._id} className="card">
                                    <div>
                                        <div className="assignment-header">
                                            {a.subject && <div className="subject-badge">{a.subject}</div>}
                                            <div className="title">{a.title}</div>
                                        </div>
                                        <div className="small">Due: {a.dueDate ? new Date(a.dueDate).toLocaleString() : 'No due date'}</div>
                                        <div style={{ marginTop: 8 }}>{a.description}</div>
                                        {a.filePath && <div style={{ marginTop: 8 }}><a href={(a.filePath && a.filePath.startsWith('http')) ? a.filePath : `${API_BASE}${a.filePath}`} target="_blank" rel="noreferrer">Download Attachment</a></div>}
                                    </div>
                                    <div className="assignment-meta">
                                        {mySubs[a._id] ? (
                                            <div>
                                                <div style={{ color: 'green', fontWeight: 600 }}>Submitted</div>
                                                <div className="small">Submitted: {new Date(mySubs[a._id].submittedAt || mySubs[a._id].createdAt).toLocaleString()}</div>
                                                {mySubs[a._id].filePath && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <a href={(mySubs[a._id].filePath && mySubs[a._id].filePath.startsWith('http')) ? mySubs[a._id].filePath : `${API_BASE}${mySubs[a._id].filePath}`} target="_blank" rel="noreferrer">Download Submission</a>
                                                    </div>
                                                )}
                                                {!isClosed(a) && <div style={{ marginTop: 8 }}>
                                                    <button className="btn" onClick={() => setEditing(e => ({ ...e, [a._id]: true }))}>Resubmit</button>
                                                </div>}
                                            </div>
                                        ) : null}

                                        {/* show form when not closed and either no submission or editing/resubmitting */}
                                        {(!isClosed(a) && (!mySubs[a._id] || editing[a._id])) && (
                                            <div>
                                                <label style={{ display: 'block' }}>Answer
                                                    <textarea value={answers[a._id] || ''} onChange={e => setAnswers(s => ({ ...s, [a._id]: e.target.value }))} />
                                                </label>
                                                <label style={{ display: 'block', marginTop: 6 }}>File (optional)
                                                    <input type="file" onChange={e => setFiles(s => ({ ...s, [a._id]: e.target.files[0] }))} />
                                                </label>
                                                <div style={{ marginTop: 8 }}>
                                                    <button className="btn" onClick={() => handleSubmit(a)}>{mySubs[a._id] ? 'Resubmit' : 'Submit Answer'}</button>
                                                </div>
                                            </div>
                                        )}
                                        {isClosed(a) && !mySubs[a._id] && (
                                            <div style={{ color: 'crimson' }}>Submission closed</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </StudentLayout>
    )
}
