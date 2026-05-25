import React, { useEffect, useState } from 'react'
import { getResources, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

export default function Resources() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [classFilter, setClassFilter] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('')
    const [viewerUrl, setViewerUrl] = useState('')
    const [viewerType, setViewerType] = useState('pdf')

    async function load(q = {}) {
        setLoading(true)
        setError('')
        try {
            const { token } = getAuth()
            const res = await getResources(q, token)
            setItems(res || [])
        } catch (e) {
            setError(e && e.message ? e.message : 'Failed to load resources')
        } finally { setLoading(false) }
    }

    useEffect(() => { load({}) }, [])

    function applyFilters() {
        const q = {}
        if (classFilter) q.class = classFilter
        if (subjectFilter) q.subject = subjectFilter
        load(q)
    }

    function clearFilters() {
        setClassFilter('')
        setSubjectFilter('')
        load({})
    }

    return (
        <div className="student-page">
            <div className="resources-header">
                <h3>Library — Student Resources</h3>
                <div className="filters">
                    <label className="filter-item">Class
                        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                            <option value="">All</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>Class {n}</option>)}
                        </select>
                    </label>
                    <label className="filter-item">Subject
                        <input placeholder="Subject (e.g. Mathematics)" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} />
                    </label>
                    <div className="filter-actions">
                        <button className="btn" onClick={applyFilters} disabled={loading}>Search</button>
                        <button className="btn outline" onClick={clearFilters} disabled={loading}>Clear</button>
                        <button className="btn tertiary" onClick={() => load({})} disabled={loading}>Refresh</button>
                    </div>
                </div>
            </div>

            {loading ? <p>Loading resources...</p> : null}
            {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}

            {!loading && !error && items.length === 0 ? <p>No resources available yet.</p> : null}

            <div className="resources-grid">
                {items.map(it => (
                    <div key={it._id} className="resource-card">
                        <div className="rc-top">
                            <div className="title">{it.title || it.originalname}</div>
                            <div className="meta">{it.subject ? it.subject + ' • ' : ''}{it.class ? `Class ${it.class}` : ''}</div>
                        </div>
                        <div className="rc-bottom">
                            <div className="uploaded">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                            <div className="actions">
                                <button className="btn" onClick={() => {
                                    const url = `${API_BASE}${it.url}`
                                    // determine type from filename/URL
                                    const ext = (it.filename || it.originalname || url).split('.').pop().toLowerCase()
                                    const videoExts = ['mp4', 'webm', 'mov', 'ogg', 'mkv']
                                    if (videoExts.indexOf(ext) !== -1) {
                                        setViewerType('video')
                                    } else {
                                        setViewerType('pdf')
                                    }
                                    setViewerUrl(url)
                                }}>Open</button>
                                <a className="btn outline" href={`${API_BASE}${it.url}`} target="_blank" rel="noopener noreferrer" download>Download</a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {viewerUrl ? (
                <div className="pdf-viewer-overlay" onClick={() => { setViewerUrl(''); setViewerType('pdf') }}>
                    <div className="pdf-viewer" onClick={(e) => e.stopPropagation()}>
                        <div className="pv-header">
                            <button className="btn" onClick={() => { setViewerUrl(''); setViewerType('pdf') }}>Close</button>
                        </div>
                        {viewerType === 'video' ? (
                            <video src={viewerUrl} controls style={{ width: '100%', height: 'calc(100% - 44px)' }} />
                        ) : (
                            <iframe src={viewerUrl} title="Resource Preview" frameBorder="0" style={{ width: '100%', height: 'calc(100% - 44px)' }} />
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
