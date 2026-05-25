import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStudents, getFaculty, getStaff, createCertificate, getCertificates, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function AdminCertificates() {
    const { token } = getAuth()
    const [schoolName, setSchoolName] = useState('')
    const [title, setTitle] = useState('Certificate of Appreciation')
    const [certFor, setCertFor] = useState('')
    const [dateOfIssue, setDateOfIssue] = useState(new Date().toISOString().slice(0, 10))
    const [recipientType, setRecipientType] = useState('Student')
    const [students, setStudents] = useState([])
    const [faculty, setFaculty] = useState([])
    const [staff, setStaff] = useState([])
    const [recipientId, setRecipientId] = useState('')
    const [recipientName, setRecipientName] = useState('')
    const [signatureFile, setSignatureFile] = useState(null)
    const [attachFile, setAttachFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])

    useEffect(() => {
        async function loadPeople() {
            try {
                const s = await getStudents({}, token)
                setStudents(Array.isArray(s) ? s : [])
            } catch (e) { setStudents([]) }
            try {
                const f = await getFaculty({}, token)
                setFaculty(Array.isArray(f) ? f : [])
            } catch (e) { setFaculty([]) }
            try {
                const st = await getStaff('', token)
                setStaff(Array.isArray(st) ? st : [])
            } catch (e) { setStaff([]) }
        }
        loadPeople()
    }, [])

    async function loadHistory() {
        try {
            const list = await getCertificates({}, token)
            setHistory(Array.isArray(list) ? list : [])
        } catch (e) { setHistory([]) }
    }

    useEffect(() => { loadHistory() }, [])

    function onRecipientChange(id) {
        setRecipientId(id)
        if (recipientType === 'Student') {
            const s = students.find(x => String(x._id) === String(id))
            setRecipientName(s ? s.name : '')
        } else if (recipientType === 'Faculty') {
            const f = faculty.find(x => String(x._id) === String(id))
            setRecipientName(f ? f.name : '')
        } else if (recipientType === 'Staff') {
            const st = staff.find(x => String(x._id) === String(id))
            setRecipientName(st ? st.name : '')
        }
    }

    async function submit(e) {
        e.preventDefault()
        if (!recipientName) return alert('Recipient required')
        try {
            setLoading(true)
            const fd = new FormData()
            fd.append('schoolName', schoolName)
            fd.append('title', title)
            fd.append('recipientName', recipientName)
            if (recipientId) fd.append('recipientId', recipientId)
            // Map recipientType: Student -> Student, Faculty -> Faculty, Staff -> User
            if (recipientType === 'Student') fd.append('recipientType', 'Student')
            else if (recipientType === 'Faculty') fd.append('recipientType', 'Faculty')
            else fd.append('recipientType', 'User')
            fd.append('certificationFor', certFor)
            fd.append('dateOfIssue', dateOfIssue)
            if (signatureFile) fd.append('signature', signatureFile)
            if (attachFile) fd.append('file', attachFile)
            const res = await createCertificate(fd, token)
            alert('Certificate generated')
            setSchoolName('')
            setTitle('Certificate of Appreciation')
            setCertFor('')
            setSignatureFile(null)
            setAttachFile(null)
            setRecipientId('')
            setRecipientName('')
            loadHistory()
        } catch (e) {
            alert('Failed: ' + (e && e.message ? e.message : String(e)))
        } finally { setLoading(false) }
    }

    return (
        <AdminLayout title="Certificates">
            <div style={{ padding: 24 }}>
                <h2>Certificate Generation</h2>
                <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 800 }}>
                    <label>
                        School Name
                        <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="School Name" />
                    </label>
                    <label>
                        Title
                        <input value={title} onChange={e => setTitle(e.target.value)} />
                    </label>
                    <label>
                        Certification For (body text)
                        <textarea value={certFor} onChange={e => setCertFor(e.target.value)} rows={4} />
                    </label>
                    <label>
                        Date of Issue
                        <input type="date" value={dateOfIssue} onChange={e => setDateOfIssue(e.target.value)} />
                    </label>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <div>
                            <label>Recipient Type</label>
                            <select value={recipientType} onChange={e => setRecipientType(e.target.value)}>
                                <option>Student</option>
                                <option>Faculty</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Recipient</label>
                            {recipientType === 'Student' ? (
                                <select value={recipientId} onChange={e => onRecipientChange(e.target.value)}>
                                    <option value="">Select student</option>
                                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollNo || s._id})</option>)}
                                </select>
                            ) : recipientType === 'Faculty' ? (
                                <select value={recipientId} onChange={e => onRecipientChange(e.target.value)}>
                                    <option value="">Select faculty</option>
                                    {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.employeeId || f._id})</option>)}
                                </select>
                            ) : (
                                <select value={recipientId} onChange={e => onRecipientChange(e.target.value)}>
                                    <option value="">Select staff</option>
                                    {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.username || s._id})</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <label>
                        Or Recipient Name (if not selecting)
                        <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Full name" />
                    </label>

                    <label>
                        Signature image (optional)
                        <input type="file" accept="image/*" onChange={e => setSignatureFile(e.target.files && e.target.files[0])} />
                    </label>

                    <label>
                        Attach file (optional, PDF/DOC)
                        <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setAttachFile(e.target.files && e.target.files[0])} />
                    </label>

                    <div>
                        <button className="btn" type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate & Send'}</button>
                    </div>
                </form>

                <div style={{ marginTop: 28 }}>
                    <h3>Sent Certificates</h3>
                    <div style={{ marginTop: 8 }}>
                        {history.length === 0 && <div className="info">No certificates yet.</div>}
                        {history.map(c => (
                            <div key={c._id} style={{ border: '1px solid #e2e8f0', padding: 10, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{c.title || 'Certificate'}</div>
                                    <div className="small">To: {c.recipientName} — {c.recipientType} — {new Date(c.uploadedAt || c.createdAt).toLocaleString()}</div>
                                </div>
                                <div>
                                    {c.filePath && <a className="btn outline" href={(API_BASE || '') + c.filePath} target="_blank" rel="noreferrer">Open</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </AdminLayout>
    )
}
