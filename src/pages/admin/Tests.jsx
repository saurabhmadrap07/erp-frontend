import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { API_BASE, createTest, createTestBulk, createTestQuestions, parseTestFile, getTests, getTestQuestions, uploadFile } from '../../api'
import { getAuth } from '../../utils/session'

export default function AdminTests() {
    const [title, setTitle] = useState('')
    const [type, setType] = useState('google_form')
    const [link, setLink] = useState('')
    const [file, setFile] = useState(null)
    const [classes, setClasses] = useState('')
    const [sections, setSections] = useState('')
    const [start, setStart] = useState('')
    const [duration, setDuration] = useState('')
    const [description, setDescription] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [metaStep, setMetaStep] = useState(1) // 1: metadata, 2: choose type
    const [meta, setMeta] = useState({ title: '', subject: '', classes: '', sections: '', startDate: '', startTime: '', endDate: '', endTime: '', createdBy: '', duration: '', attempts: 1 })
    const [selectedOption, setSelectedOption] = useState(null) // 'google' | 'bulk' | 'series'
    const [bulkProceedChecked, setBulkProceedChecked] = useState(false)
    const [bulkFile, setBulkFile] = useState(null)
    const [seriesMode, setSeriesMode] = useState(null) // 'subjective' | 'mcq'
    const [seriesQuestions, setSeriesQuestions] = useState([])
    const [seriesQ, setSeriesQ] = useState({ questionText: '', questionImage: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], correctIndex: 0, marks: 1, negative: 0, answerText: '' })
    const [loading, setLoading] = useState(false)
    const [tests, setTests] = useState([])
    const [counts, setCounts] = useState({})
    const [q, setQ] = useState('')
    const [formError, setFormError] = useState('')
    const [formSuccess, setFormSuccess] = useState('')
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewAnswers, setPreviewAnswers] = useState([])

    async function loadTests() {
        try {
            const { token, role } = getAuth()
            const data = await getTests(token)
            const list = data || []
            setTests(list)

            // fetch exact question counts per test for admin users
            if (role === 'admin') {
                try {
                    const countsArr = await Promise.all(list.map(async t => {
                        try {
                            const qs = await getTestQuestions(t._id, token)
                            return { id: t._id, count: Array.isArray(qs) ? qs.length : 0 }
                        } catch (err) {
                            return { id: t._id, count: (t.totalQuestions != null ? t.totalQuestions : (t.questions ? t.questions.length : 0)) }
                        }
                    }))
                    const map = {}
                    countsArr.forEach(c => { map[c.id] = c.count })
                    setCounts(map)
                } catch (err) {
                    console.warn('Failed to fetch question counts', err)
                }
            }
        } catch (e) {
            console.error('Failed to load tests', e)
        }
    }

    async function handleDelete(id) {
        try {
            if (!window.confirm('Delete this test series? This action cannot be undone.')) return
            const { token } = getAuth()
            const res = await fetch(`${API_BASE}/api/tests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to delete' }))
                throw new Error(err && err.message ? err.message : 'Failed to delete')
            }
            await loadTests()
        } catch (err) {
            console.error('Delete failed', err)
            alert(err && err.message ? err.message : 'Delete failed')
        }
    }

    useEffect(() => { loadTests() }, [])

    async function handleCreate(e) {
        // legacy handler kept for compatibility — prefer modal flows
        e.preventDefault()
        setLoading(true)
        setFormError('')
        setFormSuccess('')
        try {
            const { token } = getAuth()
            const fd = new FormData()
            fd.append('title', title)
            fd.append('type', type)
            if (link) fd.append('link', link)
            if (file) fd.append('file', file)
            if (classes) fd.append('classes', classes)
            if (sections) fd.append('sections', sections)
            if (start) fd.append('start', start)
            if (duration) fd.append('durationMinutes', duration)
            if (description) fd.append('description', description)

            let created = null
            if (type === 'bulk') {
                const ok = window.confirm('You selected Bulk upload. The uploaded .docx will be parsed into questions. Proceed?')
                if (!ok) { setLoading(false); return }
                created = await createTestBulk(fd, token)
            } else {
                created = await createTest(fd, token)
            }
            await loadTests()
            setTitle('')
            setLink('')
            setFile(null)
            setClasses('')
            setSections('')
            setStart('')
            setDuration('')
            setDescription('')
            setType('google_form')
            setFormSuccess('Test created')
        } catch (err) {
            console.error(err)
            setFormError(err && err.message ? err.message : 'Failed to create test')
        } finally { setLoading(false) }
    }

    return (
        <AdminLayout title="Test Creation">
            <div style={{ padding: 20 }}>
                <h2>Test Creation</h2>
                <p style={{ color: '#374151' }}>Create, assign and review tests here.</p>

                <section style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'stretch' }}>
                        <div style={{ width: '100%' }}>
                            <h3>Test Creation</h3>
                            <div style={{ padding: 18 }}>
                                <button onClick={() => { setShowCreateModal(true); setMetaStep(1); setMeta({ title: '', subject: '', classes: '', sections: '', startDate: '', startTime: '', endDate: '', endTime: '', createdBy: '', duration: '' }); setSelectedOption(null); setSeriesQuestions([]); setSeriesMode(null); setFormError(''); setFormSuccess('') }} style={{ padding: '10px 16px', background: 'linear-gradient(90deg,#10b981,#06b6d4)', color: '#fff', borderRadius: 8, border: 'none' }}>Create Test</button>
                            </div>
                        </div>

                        <div style={{ width: '100%' }}>
                            <div style={{ background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                                    <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
                                        <h2 style={{ textAlign: 'center', margin: 0, padding: '12px 0', fontSize: 22 }}>All Test Series</h2>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search test series by" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => { setShowCreateModal(true); setMetaStep(1); setMeta({ title: '', subject: '', classes: '', sections: '', startDate: '', startTime: '', endDate: '', endTime: '', createdBy: '', duration: '' }); setSelectedOption(null); setSeriesQuestions([]); setSeriesMode(null); setFormError(''); setFormSuccess('') }} style={{ padding: '8px 12px', background: '#7c3aed', color: '#fff', borderRadius: 6, border: 'none' }}>+ Create Test Series</button>
                                            <button onClick={() => { setShowCreateModal(true); setMetaStep(2); setSelectedOption('bulk'); }} style={{ padding: '8px 12px', background: '#10b981', color: '#fff', borderRadius: 6, border: 'none' }}>Bulk Upload</button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 18, background: '#fff', borderRadius: 8, overflow: 'auto' }}>
                                        {/* colorful bordered table (Price column removed) */}
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 900 }}>
                                            <thead>
                                                <tr>
                                                    {(() => {
                                                        const headers = ['Title', 'Subject', 'Classes/Sections', 'Added By', 'Total Ques', 'Duration', 'Attempts', 'Action']
                                                        const colors = ['#f97316', '#06b6d4', '#7c3aed', '#10b981', '#ef4444', '#0ea5a5', '#a78bfa', '#f472b6']
                                                        return headers.map((h, i) => (
                                                            <th key={h} style={{ textAlign: i === headers.length - 1 ? 'center' : (i < 4 ? 'left' : 'right'), padding: '12px 16px', background: '#fff', borderTop: `3px solid ${colors[i]}`, borderLeft: `3px solid ${colors[i]}`, borderRight: `3px solid ${colors[i]}` }}>{h}</th>
                                                        ))
                                                    })()}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tests.filter(t => {
                                                    const term = q.trim().toLowerCase()
                                                    if (!term) return true
                                                    return (String(t.title || '').toLowerCase().includes(term) || String((t.subject || t.type) || '').toLowerCase().includes(term) || String((t.createdBy && (t.createdBy.name || t.createdBy)) || '').toLowerCase().includes(term))
                                                }).map((t, idx) => {
                                                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fbfbff'
                                                    const colors = ['#f97316', '#06b6d4', '#7c3aed', '#10b981', '#ef4444', '#0ea5a5']
                                                    return (
                                                        <tr key={t._id} style={{ background: rowBg }}>
                                                            {[
                                                                { content: t.title, align: 'left' },
                                                                { content: (t.subject && typeof t.subject === 'object') ? (t.subject.name || t.subject.title || t.subject.label || JSON.stringify(t.subject)) : (t.subject || t.type || ''), align: 'left' },
                                                                { content: ((t.classes && t.classes.length) || (t.sections && t.sections.length)) ? `${(t.classes || []).join(',')}${t.sections && t.sections.length ? ` / ${(t.sections || []).join(',')}` : ''}` : '—', align: 'left' },
                                                                {
                                                                    content: (() => {
                                                                        if (!t.createdBy) return ''
                                                                        const creator = (t.createdBy && (t.createdBy.name || t.createdBy)) ? (t.createdBy.name || t.createdBy) : ''
                                                                        const role = (t.createdBy && t.createdBy.role) ? String(t.createdBy.role) : ''
                                                                        const label = role ? `${role.charAt(0).toUpperCase() + role.slice(1)}: ${creator}` : `Created by: ${creator}`
                                                                        return label
                                                                    })(), align: 'left'
                                                                },
                                                                { content: (counts && counts[t._id] !== undefined) ? counts[t._id] : (t.totalQuestions != null ? t.totalQuestions : (t.questions ? t.questions.length : 0)), align: 'right' },
                                                                { content: t.durationMinutes ? `${t.durationMinutes} min` : (t.duration ? `${t.duration} min` : ''), align: 'right' },
                                                                { content: t.attempts || t.attempts === 0 ? String(t.attempts) : (t.attempts === undefined && t.attempt ? String(t.attempt) : '—'), align: 'right' },
                                                                {
                                                                    content: (
                                                                        <div>
                                                                            <button onClick={() => { window.location.href = `/admin/tests/${t._id}/results` }} style={{ padding: '6px 10px', marginRight: 8 }}>View</button>
                                                                            <button onClick={() => handleDelete(t._id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>Delete</button>
                                                                        </div>
                                                                    ), align: 'center'
                                                                }
                                                            ].map((cell, ci) => {
                                                                const attemptIdx = 6
                                                                const borderCol = ci === attemptIdx ? '#a78bfa' : (colors[ci] || '#a78bfa')
                                                                const extraStyle = ci === attemptIdx ? { borderTop: `3px solid ${borderCol}`, borderBottom: `3px solid ${borderCol}`, borderLeft: `3px solid ${borderCol}`, borderRight: `3px solid ${borderCol}`, background: '#faf7ff', color: '#3b0764', fontWeight: 700, borderRadius: 6 } : { borderBottom: `3px solid ${borderCol}`, borderLeft: `3px solid ${borderCol}`, borderRight: `3px solid ${borderCol}` }
                                                                return (
                                                                    <td key={ci} style={{ padding: '12px 16px', textAlign: cell.align, ...extraStyle }}>{cell.content}</td>
                                                                )
                                                            })}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            {showCreateModal && (
                <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ width: 720, maxWidth: '96%', background: 'linear-gradient(135deg,#fffaf0 0%,#ecfeff 60%)', borderRadius: 10, padding: 18, border: '2px solid #000', boxShadow: '0 12px 40px rgba(2,6,23,0.35)', maxHeight: '90vh', overflowY: 'auto' }}>
                        {metaStep === 1 && (
                            <div>
                                <h3 style={{ marginTop: 0 }}>Create Test — Details</h3>
                                {formError && <div style={{ color: '#b91c1c', marginBottom: 8, fontWeight: 700 }}>{formError}</div>}
                                {formSuccess && <div style={{ color: '#065f46', marginBottom: 8, fontWeight: 700 }}>{formSuccess}</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <label style={{ fontWeight: 800, color: '#0f172a' }}>Title</label>
                                    <input value={meta.title} onChange={e => setMeta(s => ({ ...s, title: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)', outline: 'none' }} />

                                    <label style={{ fontWeight: 800, color: '#0f172a' }}>Subject</label>
                                    <input value={meta.subject} onChange={e => setMeta(s => ({ ...s, subject: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)', outline: 'none' }} />

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Class (comma separated)</label>
                                            <input value={meta.classes} onChange={e => setMeta(s => ({ ...s, classes: e.target.value }))} placeholder="6,7" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Section (comma separated)</label>
                                            <input value={meta.sections} onChange={e => setMeta(s => ({ ...s, sections: e.target.value }))} placeholder="A,B" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Start Date</label>
                                            <input type="date" value={meta.startDate} onChange={e => setMeta(s => ({ ...s, startDate: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Start Time</label>
                                            <input type="time" value={meta.startTime} onChange={e => setMeta(s => ({ ...s, startTime: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>End Date (optional)</label>
                                            <input type="date" value={meta.endDate} onChange={e => setMeta(s => ({ ...s, endDate: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>End Time (optional)</label>
                                            <input type="time" value={meta.endTime} onChange={e => setMeta(s => ({ ...s, endTime: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                    </div>

                                    <label style={{ fontWeight: 800, color: '#0f172a' }}>Created By (optional)</label>
                                    <input value={meta.createdBy} onChange={e => setMeta(s => ({ ...s, createdBy: e.target.value }))} placeholder="Name" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />

                                    <label style={{ fontWeight: 800, color: '#0f172a' }}>Description / Instructions</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Duration (minutes, required)</label>
                                            <input type="number" value={meta.duration || ''} onChange={e => setMeta(s => ({ ...s, duration: e.target.value }))} placeholder="e.g., 30" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                        <div style={{ width: 180 }}>
                                            <label style={{ fontWeight: 800, color: '#0f172a' }}>Attempts per student</label>
                                            <input type="number" min={1} value={meta.attempts || 1} onChange={e => setMeta(s => ({ ...s, attempts: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', 'justifyContent': 'flex-end', gap: 8 }}>
                                        <button onClick={() => setShowCreateModal(false)} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '2px solid #000' }}>Cancel</button>
                                        <button onClick={() => {
                                            setFormError('')
                                            // compute start ISO and duration
                                            if (!meta.title) { setFormError('Title required'); return }
                                            if (!meta.duration) { setFormError('Duration (minutes) is required'); return }
                                            setMetaStep(2)
                                        }} style={{ background: 'linear-gradient(90deg,#06b6d4,#0ea5a5)', color: '#fff', padding: '8px 12px', borderRadius: 8, border: '2px solid rgba(0,0,0,0.7)' }}>Proceed</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {metaStep === 2 && (
                            <div>
                                <h3 style={{ marginTop: 0 }}>Choose Creation Method</h3>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, padding: 16, borderRadius: 10, background: selectedOption === 'google' ? 'linear-gradient(180deg,#ecfeff,#e0f2fe)' : '#ffffff', border: '2px solid #000' }}>
                                        <h4 style={{ margin: 0, color: '#0f172a' }}>Google Form</h4>
                                        <p style={{ marginTop: 6, color: '#334155' }}>Paste a Google Form link and the test will be created referencing it.</p>
                                        <div>
                                            <input placeholder="https://forms.gle/..." value={link} onChange={e => setLink(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                        </div>
                                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                            <button onClick={async () => {
                                                setFormError('')
                                                if (!meta.title) { setFormError('Title required'); return }
                                                if (!link) { setFormError('Google Form link required'); return }
                                                if (!meta.duration) { setFormError('Duration (minutes) is required'); return }
                                                setLoading(true)
                                                try {
                                                    const { token } = getAuth()
                                                    const fd = new FormData()
                                                    fd.append('title', meta.title)
                                                    if (meta.subject) fd.append('subject', meta.subject)
                                                    fd.append('type', 'google_form')
                                                    fd.append('link', link)
                                                    if (meta.classes) fd.append('classes', meta.classes)
                                                    if (meta.sections) fd.append('sections', meta.sections)
                                                    if (meta.startDate && meta.startTime) fd.append('start', `${meta.startDate}T${meta.startTime}`)
                                                    // compute duration if end provided
                                                    if (meta.endDate && meta.endTime && meta.startDate && meta.startTime) {
                                                        const s = new Date(`${meta.startDate}T${meta.startTime}`)
                                                        const e = new Date(`${meta.endDate}T${meta.endTime}`)
                                                        const dmin = Math.max(0, Math.round((e - s) / 60000))
                                                        fd.append('durationMinutes', String(dmin))
                                                    }
                                                    // explicit duration field takes precedence
                                                    if (meta.duration) fd.set('durationMinutes', String(meta.duration))
                                                    if (meta.attempts) fd.set('attempts', String(meta.attempts))
                                                    if (description) fd.append('description', description)
                                                    await createTest(fd, getAuth().token)
                                                    await loadTests()
                                                    setFormSuccess('Google form test created')
                                                    setShowCreateModal(false)
                                                } catch (err) { console.error(err); setFormError(err && err.message ? err.message : 'Failed') } finally { setLoading(false) }
                                            }} style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)', color: '#fff', padding: '8px 12px', borderRadius: 8, border: '2px solid rgba(0,0,0,0.7)' }}>Create</button>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, padding: 16, borderRadius: 10, background: selectedOption === 'bulk' ? 'linear-gradient(180deg,#fff7ed,#fffbeb)' : '#ffffff', border: '2px solid #000' }}>
                                        <h4 style={{ margin: 0, color: '#0f172a' }}>Bulk Upload</h4>
                                        <p style={{ marginTop: 6, color: '#334155' }}>Upload a .docx (or PDF) following the format: question, then 4 options, correct answer and marks mentioned. The server will parse and create questions.</p>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={bulkProceedChecked} onChange={e => setBulkProceedChecked(e.target.checked)} /> <span style={{ color: '#0f172a' }}>I confirm my document matches the required format.</span></label>
                                        <div style={{ marginTop: 8 }}>
                                            <input type="file" accept=".docx,.pdf" onChange={e => setBulkFile(e.target.files && e.target.files[0])} style={{ padding: 6 }} />
                                        </div>
                                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                            <button onClick={async () => {
                                                setFormError('')
                                                setFormSuccess('')
                                                if (!bulkProceedChecked) { setFormError('Please confirm document format'); return }
                                                if (!bulkFile) { setFormError('Please choose a file'); return }
                                                setLoading(true)
                                                try {
                                                    const fd = new FormData()
                                                    fd.append('file', bulkFile)
                                                    const res = await parseTestFile(fd, getAuth().token)
                                                    // populate seriesQuestions with parsed questions so user can edit
                                                    const parsed = (res && res.questions) ? res.questions.map(q => ({ questionText: q.questionText || '', options: q.options || [], correctAnswer: q.correctAnswer || '', marks: q.marks || 1 })) : []
                                                    if (!parsed.length) {
                                                        setFormError('No questions were extracted. Please check document format.')
                                                    } else {
                                                        setSeriesQuestions(parsed)
                                                        // if most questions have options, open MCQ editor, else subjective
                                                        const hasOpts = parsed.filter(p => p.options && p.options.length).length
                                                        setSeriesMode(hasOpts > 0 ? 'mcq' : 'subjective')
                                                        // move user to series editor (they can review/edit and then Submit Test)
                                                        setFormSuccess(`Extraction complete — ${parsed.length} questions parsed. Review and Edit them in Create Series section, then click Submit Test.`)
                                                    }
                                                } catch (err) { console.error(err); setFormError(err && err.message ? err.message : 'Failed to extract') } finally { setLoading(false) }
                                            }} style={{ background: 'linear-gradient(90deg,#b45309,#ea580c)', color: '#fff', padding: '8px 12px', borderRadius: 8, border: '2px solid rgba(0,0,0,0.7)' }}>Extract & Preview</button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <div style={{ padding: 14, borderRadius: 10, background: 'linear-gradient(180deg,#f8fafc,#eef2ff)', border: '2px solid #000', maxHeight: '60vh', overflowY: 'auto' }}>
                                        <h4 style={{ margin: 0, color: '#0f172a' }}>Create Series (manual)</h4>
                                        <p style={{ marginTop: 6, color: '#334155' }}>Build a test series by adding subjective or MCQ questions manually.</p>
                                        {!seriesMode && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => setSeriesMode('subjective')} style={{ padding: '8px 12px', background: 'linear-gradient(90deg,#06b6d4,#10b981)', color: '#fff', borderRadius: 8, border: '2px solid #000' }}>Subjective</button>
                                                <button onClick={() => setSeriesMode('mcq')} style={{ padding: '8px 12px', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', color: '#fff', borderRadius: 8, border: '2px solid #000' }}>MCQ</button>
                                            </div>
                                        )}

                                        {seriesMode && (
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ marginBottom: 8 }}>
                                                    <label style={{ fontWeight: 800, color: '#0f172a' }}>Question</label>
                                                    <textarea value={seriesQ.questionText} onChange={e => setSeriesQ(s => ({ ...s, questionText: e.target.value }))} rows={3} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(0,0,0,0.85)' }} />
                                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <label style={{ fontWeight: 700 }}>Question Image:</label>
                                                        <input type="file" accept="image/*" onChange={async e => {
                                                            const f = e.target.files && e.target.files[0]
                                                            if (!f) return
                                                            try { const fd = new FormData(); fd.append('file', f); const { token } = getAuth(); const res = await uploadFile(fd, token); setSeriesQ(s => ({ ...s, questionImage: (res && res.url) || '' })) } catch (err) { alert(err && err.message ? err.message : 'Upload failed') }
                                                        }} />
                                                        {seriesQ.questionImage ? <img src={`${seriesQ.questionImage.startsWith('http') ? seriesQ.questionImage : (API_BASE + seriesQ.questionImage)}`} alt="qimg" style={{ maxHeight: 60, borderRadius: 6 }} /> : null}
                                                        {seriesQ.questionImage ? <button onClick={() => setSeriesQ(s => ({ ...s, questionImage: '' }))} style={{ padding: '6px 8px' }}>Remove</button> : null}
                                                    </div>
                                                </div>
                                                {seriesMode === 'mcq' && (
                                                    <div>
                                                        <label style={{ fontWeight: 800, color: '#0f172a' }}>Options (4 default)</label>
                                                        {seriesQ.options.map((opt, i) => (
                                                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <input value={opt} onChange={e => setSeriesQ(s => ({ ...s, options: s.options.map((o, idx) => idx === i ? e.target.value : o) }))} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.6)' }} />
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="radio" name="correct" checked={seriesQ.correctIndex === i} onChange={() => setSeriesQ(s => ({ ...s, correctIndex: i }))} /> <span style={{ color: '#0f172a' }}>Correct</span></label>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <input type="file" accept="image/*" onChange={async e => {
                                                                        const f = e.target.files && e.target.files[0]
                                                                        if (!f) return
                                                                        try { const fd = new FormData(); fd.append('file', f); const { token } = getAuth(); const res = await uploadFile(fd, token); setSeriesQ(s => ({ ...s, optionImages: s.optionImages.map((img, idx) => idx === i ? ((res && res.url) || '') : img) })) } catch (err) { alert(err && err.message ? err.message : 'Upload failed') }
                                                                    }} />
                                                                    {seriesQ.optionImages && seriesQ.optionImages[i] ? (
                                                                        <>
                                                                            <img src={`${seriesQ.optionImages[i].startsWith('http') ? seriesQ.optionImages[i] : (API_BASE + seriesQ.optionImages[i])}`} alt={`opt-${i}`} style={{ maxHeight: 40, borderRadius: 4 }} />
                                                                            <button onClick={() => setSeriesQ(s => ({ ...s, optionImages: s.optionImages.map((img, idx) => idx === i ? '' : img) }))} style={{ padding: '4px 6px' }}>X</button>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {seriesMode === 'subjective' && (
                                                    <div>
                                                        <label style={{ fontWeight: 800, color: '#0f172a' }}>Answer / Model Answer</label>
                                                        <textarea value={seriesQ.answerText} onChange={e => setSeriesQ(s => ({ ...s, answerText: e.target.value }))} rows={2} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.6)' }} />
                                                    </div>
                                                )}
                                                {seriesMode === 'subjective' && seriesQuestions.length > 0 && (
                                                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => {
                                                            // prepare preview answers array (empty by default)
                                                            setPreviewAnswers(seriesQuestions.map(q => ({ questionText: q.questionText || '', modelAnswer: q.correctAnswer || '', studentAnswer: '', marks: q.marks || 1 })))
                                                            setShowPreviewModal(true)
                                                        }} style={{ padding: '8px 12px', background: '#f97316', color: '#fff', borderRadius: 8, border: 'none' }}>Preview Auto-Grade</button>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    <input type="number" value={seriesQ.marks} onChange={e => setSeriesQ(s => ({ ...s, marks: Number(e.target.value) }))} style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.6)' }} />
                                                    <input type="number" value={seriesQ.negative} onChange={e => setSeriesQ(s => ({ ...s, negative: Number(e.target.value) }))} style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.6)' }} />
                                                    <button onClick={() => {
                                                        setFormError('')
                                                        if (!seriesQ.questionText) { setFormError('Question text required'); return }
                                                        const qobj = seriesMode === 'mcq' ? { questionText: seriesQ.questionText, questionImage: seriesQ.questionImage || '', options: seriesQ.options.slice(), optionImages: (seriesQ.optionImages || []).slice(0, seriesQ.options.length), correctAnswer: seriesQ.options[seriesQ.correctIndex] || '', marks: seriesQ.marks || 1 } : { questionText: seriesQ.questionText, questionImage: seriesQ.questionImage || '', options: [], optionImages: [], correctAnswer: seriesQ.answerText || '', marks: seriesQ.marks || 1 }
                                                        setSeriesQuestions(s => ([...s, qobj]))
                                                        setSeriesQ({ questionText: '', questionImage: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], correctIndex: 0, marks: 1, negative: 0, answerText: '' })
                                                    }} style={{ padding: '8px 12px', background: 'linear-gradient(90deg,#06b6d4,#10b981)', color: '#fff', borderRadius: 8, border: '2px solid #000' }}>Add Question</button>
                                                </div>

                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'hidden', border: '1px dashed rgba(0,0,0,0.12)', padding: 8 }}>
                                                        {seriesQuestions.length === 0 && <div style={{ color: '#6b7280' }}>No questions added yet.</div>}
                                                        {seriesQuestions.map((q, idx) => (
                                                            <div key={idx} style={{ padding: 10, borderBottom: '1px solid #f3f4f6', background: '#fff', borderRadius: 6, marginBottom: 8 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ fontWeight: 700 }}>{idx + 1}. Question</div>
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        <button onClick={() => {
                                                                            setSeriesQuestions(s => s.filter((_, i) => i !== idx))
                                                                        }} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', borderRadius: 6, border: 'none' }}>Delete</button>
                                                                    </div>
                                                                </div>

                                                                <div style={{ marginTop: 8 }}>
                                                                    <textarea value={q.questionText || ''} onChange={e => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, questionText: e.target.value }) : it))} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
                                                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <label style={{ fontWeight: 700 }}>Question Image:</label>
                                                                        <input type="file" accept="image/*" onChange={async e => {
                                                                            const f = e.target.files && e.target.files[0]
                                                                            if (!f) return
                                                                            try { const fd = new FormData(); fd.append('file', f); const { token } = getAuth(); const res = await uploadFile(fd, token); setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, questionImage: (res && res.url) || '' }) : it)) } catch (err) { alert(err && err.message ? err.message : 'Upload failed') }
                                                                        }} />
                                                                        {q.questionImage ? <img src={`${q.questionImage.startsWith('http') ? q.questionImage : (API_BASE + q.questionImage)}`} alt="qimg" style={{ maxHeight: 60, borderRadius: 6 }} /> : null}
                                                                        {q.questionImage ? <button onClick={() => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, questionImage: '' }) : it))} style={{ padding: '6px 8px' }}>Remove</button> : null}
                                                                    </div>
                                                                </div>

                                                                {q.options && q.options.length > 0 ? (
                                                                    <div style={{ marginTop: 8 }}>
                                                                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Options</div>
                                                                        {q.options.map((opt, oi) => (
                                                                            <div key={oi} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <input value={opt} onChange={e => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, options: it.options.map((o, oi2) => oi2 === oi ? e.target.value : o) }) : it))} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
                                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                        <input type="radio" name={`correct-${idx}`} checked={q.correctAnswer === opt} onChange={() => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, correctAnswer: opt }) : it))} />
                                                                                        <span style={{ fontSize: 13 }}>Correct</span>
                                                                                    </label>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                    <input type="file" accept="image/*" onChange={async e => {
                                                                                        const f = e.target.files && e.target.files[0]
                                                                                        if (!f) return
                                                                                        try { const fd = new FormData(); fd.append('file', f); const { token } = getAuth(); const res = await uploadFile(fd, token); setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, optionImages: (it.optionImages || []).map((img, jj) => jj === oi ? ((res && res.url) || '') : img) }) : it)) } catch (err) { alert(err && err.message ? err.message : 'Upload failed') }
                                                                                    }} />
                                                                                    {q.optionImages && q.optionImages[oi] ? (
                                                                                        <>
                                                                                            <img src={`${q.optionImages[oi].startsWith('http') ? q.optionImages[oi] : (API_BASE + q.optionImages[oi])}`} alt={`opt-${oi}`} style={{ maxHeight: 40, borderRadius: 4 }} />
                                                                                            <button onClick={() => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, optionImages: (it.optionImages || []).map((img, jj) => jj === oi ? '' : img) }) : it))} style={{ padding: '4px 6px' }}>X</button>
                                                                                        </>
                                                                                    ) : null}
                                                                                    <button onClick={() => {
                                                                                        setSeriesQuestions(s => s.map((it, i) => {
                                                                                            if (i !== idx) return it
                                                                                            const newOpts = it.options.filter((_, k) => k !== oi)
                                                                                            const newImgs = (it.optionImages || []).filter((_, k) => k !== oi)
                                                                                            let newCorrect = it.correctAnswer
                                                                                            if (it.correctAnswer && !newOpts.includes(it.correctAnswer)) newCorrect = ''
                                                                                            return { ...it, options: newOpts, optionImages: newImgs, correctAnswer: newCorrect }
                                                                                        }))
                                                                                    }} style={{ padding: '6px 8px', background: '#f97316', color: '#fff', borderRadius: 6, border: 'none' }}>Remove</button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        <div style={{ marginTop: 6 }}>
                                                                            <button onClick={() => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, options: [...(it.options || []), ''], optionImages: [...(it.optionImages || []), ''] }) : it))} style={{ padding: '6px 10px', background: '#06b6d4', color: '#fff', borderRadius: 6, border: 'none' }}>Add Option</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ marginTop: 8 }}>
                                                                        <div style={{ fontWeight: 700 }}>Model Answer</div>
                                                                        <textarea value={q.correctAnswer || ''} onChange={e => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, correctAnswer: e.target.value }) : it))} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
                                                                    </div>
                                                                )}

                                                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Marks</div>
                                                                        <input type="number" value={q.marks || 1} onChange={e => setSeriesQuestions(s => s.map((it, i) => i === idx ? ({ ...it, marks: Number(e.target.value) }) : it))} style={{ width: 100, padding: 6, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
                                                                    </div>
                                                                    <div style={{ marginLeft: 'auto' }}>
                                                                        <button onClick={() => {
                                                                            // quick move to top
                                                                            setSeriesQuestions(s => {
                                                                                const copy = [...s]
                                                                                const item = copy.splice(idx, 1)[0]
                                                                                copy.unshift(item)
                                                                                return copy
                                                                            })
                                                                        }} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', borderRadius: 6, border: 'none' }}>Move Top</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Preview Modal for subjective auto-grading */}
                                                {showPreviewModal && (
                                                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
                                                        <div style={{ width: 720, maxWidth: '96%', background: '#fff', borderRadius: 10, padding: 18, border: '2px solid #000', maxHeight: '90vh', overflowY: 'auto' }}>
                                                            <h3>Preview Auto-Grade — Subjective</h3>
                                                            <p style={{ color: '#374151' }}>Enter sample student answers and see similarity % and computed marks.</p>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {previewAnswers.map((p, i) => {
                                                                    // similarity function (mirrors backend enhancedSimilarity)
                                                                    function normalizeText(s) { return String(s || '').toLowerCase().replace(/\u00A0|\s+/g, ' ').replace(/[^a-z0-9 ]+/g, '').trim() }
                                                                    function levenshtein(a, b) {
                                                                        a = String(a || ''); b = String(b || '');
                                                                        const al = a.length, bl = b.length
                                                                        if (al === 0) return bl
                                                                        if (bl === 0) return al
                                                                        const row = Array(bl + 1).fill(0)
                                                                        for (let j = 0; j <= bl; j++) row[j] = j
                                                                        for (let ii = 1; ii <= al; ii++) {
                                                                            let prev = row[0]; row[0] = ii
                                                                            for (let jj = 1; jj <= bl; jj++) {
                                                                                const tmp = row[jj]
                                                                                const cost = a[ii - 1] === b[jj - 1] ? 0 : 1
                                                                                row[jj] = Math.min(row[jj] + 1, row[jj - 1] + 1, prev + cost)
                                                                                prev = tmp
                                                                            }
                                                                        }
                                                                        return row[bl]
                                                                    }
                                                                    function tokenizeAndStem(s) {
                                                                        const stopwords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'and', 'or', 'in', 'on', 'that', 'from', 'by', 'for', 'with', 'as', 'it', 'this', 'these', 'those', 'which'])
                                                                        const toks = String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).map(t => t.trim()).filter(Boolean)
                                                                        const stem = t => { if (t.length <= 3) return t; return t.replace(/(ing|ed|ly|es|s)$/, '') }
                                                                        return toks.map(t => stem(t)).filter(t => !stopwords.has(t))
                                                                    }
                                                                    function jaccardSimilarity(a, b) {
                                                                        const ta = new Set(tokenizeAndStem(a))
                                                                        const tb = new Set(tokenizeAndStem(b))
                                                                        if (!ta.size && !tb.size) return 1
                                                                        if (!ta.size || !tb.size) return 0
                                                                        let inter = 0
                                                                        for (const x of ta) if (tb.has(x)) inter++
                                                                        const uni = new Set([...ta, ...tb]).size
                                                                        return uni === 0 ? 0 : inter / uni
                                                                    }
                                                                    function enhancedSimilarity(a, b) {
                                                                        const na = normalizeText(a)
                                                                        const nb = normalizeText(b)
                                                                        const charDist = levenshtein(na, nb)
                                                                        const charMax = Math.max(na.length, nb.length) || 1
                                                                        const charSim = Math.max(0, 1 - charDist / charMax)
                                                                        const wordSim = jaccardSimilarity(a, b)
                                                                        return Math.max(charSim, Math.max(wordSim, 0.6 * charSim + 0.4 * wordSim))
                                                                    }
                                                                    const sim = enhancedSimilarity(p.studentAnswer, p.modelAnswer)
                                                                    const matchedPercent = Math.round(sim * 10000) / 100
                                                                    const awarded = Math.round(sim * p.marks * 100) / 100

                                                                    return (
                                                                        <div key={i} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                                                                            <div style={{ fontWeight: 700 }}>{i + 1}. {p.questionText}</div>
                                                                            <div style={{ marginTop: 6 }}><div style={{ fontWeight: 700 }}>Model Answer</div><div style={{ color: '#374151' }}>{p.modelAnswer}</div></div>
                                                                            <div style={{ marginTop: 8 }}>
                                                                                <label style={{ fontWeight: 800 }}>Student Answer</label>
                                                                                <textarea value={previewAnswers[i].studentAnswer} onChange={e => setPreviewAnswers(s => s.map((it, idx2) => idx2 === i ? ({ ...it, studentAnswer: e.target.value }) : it))} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
                                                                            </div>
                                                                            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                                <div><strong>Match:</strong> {matchedPercent != null ? `${matchedPercent}%` : '—'}</div>
                                                                                <div><strong>Awarded:</strong> {awarded} / {p.marks}</div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                                                <button onClick={() => setShowPreviewModal(false)} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '2px solid #000' }}>Close</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                                                    <button onClick={() => setSeriesMode(null)} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '2px solid #000' }}>Back</button>
                                                    <button onClick={async () => {
                                                        setFormError('')
                                                        setFormSuccess('')
                                                        if (!seriesQuestions.length) { setFormError('Add at least one question'); return }
                                                        if (!meta.duration) { setFormError('Duration (minutes) is required'); return }
                                                        setLoading(true)
                                                        try {
                                                            const fd = new FormData()
                                                            fd.append('title', meta.title)
                                                            fd.append('type', 'series')
                                                            if (meta.classes) fd.append('classes', meta.classes)
                                                            if (meta.sections) fd.append('sections', meta.sections)
                                                            if (meta.startDate && meta.startTime) fd.append('start', `${meta.startDate}T${meta.startTime}`)
                                                            if (meta.endDate && meta.endTime && meta.startDate && meta.startTime) {
                                                                const s = new Date(`${meta.startDate}T${meta.startTime}`)
                                                                const e = new Date(`${meta.endDate}T${meta.endTime}`)
                                                                const dmin = Math.max(0, Math.round((e - s) / 60000))
                                                                fd.append('durationMinutes', String(dmin))
                                                            }
                                                            if (meta.duration) fd.set('durationMinutes', String(meta.duration))
                                                            if (meta.attempts) fd.set('attempts', String(meta.attempts))
                                                            if (meta.subject) fd.append('subject', meta.subject)
                                                            if (description) fd.append('description', description)
                                                            const testDoc = await createTest(fd, getAuth().token)
                                                            // post questions
                                                            await createTestQuestions(testDoc._id, seriesQuestions, getAuth().token)
                                                            await loadTests()
                                                            setFormSuccess('Series test created')
                                                            setShowCreateModal(false)
                                                        } catch (err) { console.error(err); setFormError(err && err.message ? err.message : 'Failed') } finally { setLoading(false) }
                                                    }}>Submit Test</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
