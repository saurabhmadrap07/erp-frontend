import React, { useState, useRef } from 'react'
import FacultyLayout from '../../components/faculty/FacultyLayout'
import { uploadResource, getMyResources, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function Resources() {
    const [subject, setSubject] = useState('Math')
    const [klass, setKlass] = useState('1')
    const [title, setTitle] = useState('')
    const [resourceType, setResourceType] = useState('pdf')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const fileRef = useRef()

    async function upload(e) {
        e.preventDefault()
        setMessage('')
        const f = fileRef.current && fileRef.current.files && fileRef.current.files[0]
        if (!f) return setMessage('Please select a file to upload')
        if (!title) return setMessage('Please enter a title for the resource')
        // client-side size check: 1GB limit
        const MAX_BYTES = 1024 * 1024 * 1024
        if (f.size > MAX_BYTES) return setMessage('File too large. Maximum allowed size is 1GB.')
        const fd = new FormData()
        fd.append('file', f)
        fd.append('title', title)
        fd.append('subject', subject)
        fd.append('class', klass)
        try {
            setLoading(true)
            const { token } = getAuth()
            await uploadResource(fd, token)
            setMessage('Uploaded successfully')
            setTitle('')
            setSubject('')
            fileRef.current.value = ''
            // refresh faculty uploads
            loadMy()
        } catch (err) {
            setMessage(err && err.message ? err.message : 'Upload failed')
        } finally { setLoading(false) }
    }

    const [myItems, setMyItems] = useState([])
    const [myLoading, setMyLoading] = useState(false)
    async function loadMy() {
        setMyLoading(true)
        try {
            const { token } = getAuth()
            const res = await getMyResources(token)
            setMyItems(res || [])
        } catch (e) {
            // ignore for now
        } finally { setMyLoading(false) }
    }

    React.useEffect(() => { loadMy() }, [])

    return (
        <FacultyLayout title="Resources">
            <div className="faculty-page">
                <h2>Upload Resources</h2>
                <form className="card resource-form" onSubmit={upload}>
                    <div className="form-row">
                        <label>Class
                            <select value={klass} onChange={e => setKlass(e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>Class {n}</option>)}
                            </select>
                        </label>
                        <label>Subject
                            <input placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} />
                        </label>
                    </div>
                    <label>Title
                        <input placeholder="Resource title (required)" value={title} onChange={e => setTitle(e.target.value)} />
                    </label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <label style={{ marginRight: 8 }}>Type
                            <select value={resourceType} onChange={e => setResourceType(e.target.value)}>
                                <option value="pdf">PDF / Document</option>
                                <option value="video">Video (up to 1GB)</option>
                            </select>
                        </label>
                        <label style={{ flex: 1 }}>Upload File
                            <input ref={fileRef} type="file" accept={resourceType === 'video' ? 'video/*' : 'application/pdf'} />
                        </label>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
                        {message ? <div style={{ color: message.includes('success') ? 'green' : '#b91c1c' }}>{message}</div> : null}
                    </div>
                </form>

                <div style={{ marginTop: 18 }}>
                    <h3>Your Uploads</h3>
                    {myLoading ? <p>Loading...</p> : null}
                    <div className="uploads-wrap" style={{ marginTop: 8 }}>
                        <div className="resources-grid">
                            {myItems.map(it => (
                                <div key={it._id} className="resource-card">
                                    <div className="rc-top">
                                        <div className="title">{it.title || it.originalname}</div>
                                        <div className="meta">{it.subject ? it.subject + ' • ' : ''}{it.class ? `Class ${it.class}` : ''}</div>
                                    </div>
                                    <div className="rc-bottom">
                                        <div className="uploaded">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                                        <div className="actions">
                                            <button className="btn" onClick={() => window.open(`${API_BASE}${it.url}`, '_blank')}>Open</button>
                                            <a className="btn outline" href={`${API_BASE}${it.url}`} target="_blank" rel="noopener noreferrer" download>Download</a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    )
}
