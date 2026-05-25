import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getTests, getTestQuestions, createTestQuestions, updateTest, deleteTest, uploadFile } from '../../api'
import { getAuth } from '../../utils/session'

export default function ViewTestSeries() {
    const [tests, setTests] = useState([])
    const [counts, setCounts] = useState({})
    const [q, setQ] = useState('')

    async function load() {
        try {
            const { token, role } = getAuth()
            const data = await getTests(token)
            const testsList = data || []
            setTests(testsList)

            // fetch exact question counts per test only for admins (avoids 403s)
            if (role === 'admin') {
                try {
                    const countsArr = await Promise.all(testsList.map(async t => {
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
            console.error('Failed to load test series', e)
        }
    }

    useEffect(() => { load() }, [])

    const [selected, setSelected] = useState(null)
    const [questions, setQuestions] = useState([])
    const [showQuestionsModal, setShowQuestionsModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showManageModal, setShowManageModal] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete(id) {
        try {
            if (!window.confirm('Delete this test series? This action cannot be undone.')) return
            const { token } = getAuth()
            await deleteTest(id, token)
            await load()
        } catch (err) {
            console.error('Delete failed', err)
            alert(err && err.message ? err.message : 'Delete failed')
        }
    }

    async function openViewQuestions(test) {
        try {
            setSelected(test)
            setLoading(true)
            const { token } = getAuth()
            const qs = await getTestQuestions(test._id, token)
            setQuestions(qs || [])
            setShowQuestionsModal(true)
        } catch (e) {
            console.error('Failed to load questions', e)
            alert('Failed to load questions')
        } finally { setLoading(false) }
    }

    async function openEditQuestions(test) {
        try {
            setSelected(test)
            setLoading(true)
            const { token } = getAuth()
            const qs = await getTestQuestions(test._id, token)
            setQuestions(qs || [])
            setShowEditModal(true)
        } catch (e) {
            console.error('Failed to load questions', e)
            alert('Failed to load questions')
        } finally { setLoading(false) }
    }

    async function saveEditedQuestions() {
        try {
            if (!selected) return
            const { token } = getAuth()
            await createTestQuestions(selected._id, questions, token)
            setShowEditModal(false)
            await load()
            alert('Questions updated')
        } catch (e) {
            console.error('Failed to save questions', e)
            alert('Failed to save questions')
        }
    }

    function changeQuestionField(idx, field, value) {
        setQuestions(qs => qs.map((q, i) => i === idx ? ({ ...q, [field]: value }) : q))
    }

    async function openAddQuestions(test) {
        setSelected(test)
        setQuestions([])
        setShowAddModal(true)
    }

    async function saveAddedQuestions(newQs) {
        try {
            if (!selected) return
            const { token } = getAuth()
            await createTestQuestions(selected._id, newQs, token)
            setShowAddModal(false)
            await load()
            alert('Questions added')
        } catch (e) {
            console.error('Failed to add questions', e)
            alert('Failed to add questions')
        }
    }

    async function openManage(test) {
        setSelected(test)
        setShowManageModal(true)
    }

    async function saveManageDetails(changes) {
        try {
            if (!selected) return
            const { token } = getAuth()
            await updateTest(selected._id, changes, token)
            setShowManageModal(false)
            await load()
            alert('Test updated')
        } catch (e) {
            console.error('Failed to update test', e)
            alert('Failed to update test')
        }
    }

    return (
        <AdminLayout title="All Test Series">
            <div style={{ padding: 20 }}>
                <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginTop: 4 }}>All Test Series</h2>

                <div style={{ maxWidth: 1200, margin: '18px auto' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search test series by title, subject or creator" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <button onClick={() => setQ('')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#f3f4f6' }}>Clear</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {tests.filter(t => {
                            const term = q.trim().toLowerCase()
                            if (!term) return true
                            return (String(t.title || '').toLowerCase().includes(term) || String((t.subject || t.type) || '').toLowerCase().includes(term) || String((t.createdBy && (t.createdBy.name || t.createdBy)) || '').toLowerCase().includes(term))
                        }).map(t => (
                            <div key={t._id} style={{ background: 'linear-gradient(180deg,#f8f1ff,#fff5f8)', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', minHeight: 320 }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{t.title}</div>
                                <div style={{ color: '#374151', marginBottom: 6 }}><strong>Subject:</strong> <span style={{ color: '#6b7280' }}>{(t.subject && typeof t.subject === 'object') ? (t.subject.name || t.subject.title || t.subject.label || JSON.stringify(t.subject)) : (t.subject || t.type || '—')}</span></div>
                                <div style={{ color: '#374151', marginBottom: 6 }}><strong>For:</strong> <span style={{ color: '#6b7280' }}>{((t.classes && t.classes.length) ? `Classes: ${(t.classes || []).join(',')}` : '')}{(t.classes && t.classes.length) && (t.sections && t.sections.length) ? ' · ' : ''}{(t.sections && t.sections.length) ? `Sections: ${(t.sections || []).join(',')}` : ((!t.classes || !t.classes.length) ? '—' : '')}</span></div>
                                <div style={{ color: '#374151', marginBottom: 6 }}><strong>Total Ques:</strong> <span style={{ color: '#6b7280' }}>{(counts && counts[t._id] !== undefined) ? counts[t._id] : (t.totalQuestions != null ? t.totalQuestions : (t.questions ? t.questions.length : 0))}</span></div>
                                <div style={{ color: '#374151', marginBottom: 12 }}><strong>Duration:</strong> <span style={{ color: '#6b7280' }}>{t.durationMinutes ? `${t.durationMinutes} min` : (t.duration ? `${t.duration} min` : '—')}</span></div>
                                <div style={{ color: '#374151', marginBottom: 12 }}><strong>Attempts:</strong> <span style={{ color: '#6b7280' }}>{t.attempts || t.attempts === 0 ? String(t.attempts) : (t.attempts === undefined && t.attempt ? String(t.attempt) : '—')}</span></div>
                                <div style={{ color: '#374151', marginBottom: 16 }}><strong>Added By:</strong> <span style={{ color: '#6b7280' }}>{(() => {
                                    const cb = t.createdBy
                                    if (!cb) return '—'
                                    if (typeof cb === 'string') return cb
                                    const role = cb.role ? String(cb.role).charAt(0).toUpperCase() + String(cb.role).slice(1) : 'Added by'
                                    const name = cb.name || cb.username || ''
                                    return `${role}: ${name || (cb._id ? cb._id : '')}`
                                })()}</span></div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                                    <button onClick={() => openViewQuestions(t)} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', color: '#fff' }}>View Questions</button>
                                    <button onClick={() => openEditQuestions(t)} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#f59e0b,#b45309)', color: '#fff' }}>Edit Questions</button>
                                    <button onClick={() => openAddQuestions(t)} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#60a5fa)', color: '#fff' }}>Add More Questions</button>
                                    <button onClick={() => openManage(t)} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#10b981,#06b6d4)', color: '#fff' }}>Manage Test Series</button>
                                    <button onClick={() => handleDelete(t._id)} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#f43f5e,#fb7185)', color: '#fff' }}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Questions View Modal */}
                {showQuestionsModal && (
                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ width: 800, maxWidth: '96%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 18, border: '2px solid #000' }}>
                            <h3 style={{ marginTop: 0 }}>Questions — {selected && selected.title}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {loading && <div>Loading...</div>}
                                {!loading && questions.length === 0 && <div style={{ color: '#6b7280' }}>No questions available.</div>}
                                {questions.map((q, i) => (
                                    <div key={q._id || i} style={{ padding: 8, borderRadius: 6, border: '1px solid #eef2ff', background: '#fff' }}>
                                        <div style={{ fontWeight: 700 }}>{i + 1}. {q.questionText}</div>
                                        {q.options && q.options.length > 0 ? (
                                            <ul>
                                                {q.options.map((opt, oi) => <li key={oi}>{opt}</li>)}
                                            </ul>
                                        ) : null}
                                        <div style={{ marginTop: 6, color: '#6b7280' }}><strong>Marks:</strong> {q.marks || 0}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <button onClick={() => setShowQuestionsModal(false)} style={{ padding: '8px 12px' }}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Questions Modal */}
                {showEditModal && (
                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
                        <div style={{ width: 900, maxWidth: '98%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 18, border: '2px solid #000' }}>
                            <h3 style={{ marginTop: 0 }}>Edit Questions — {selected && selected.title}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {questions.map((q, i) => (
                                    <div key={q._id || i} style={{ padding: 10, border: '1px solid #eef2ff', borderRadius: 8 }}>
                                        <div style={{ fontWeight: 800 }}>{i + 1}</div>
                                        <textarea value={q.questionText || ''} onChange={e => changeQuestionField(i, 'questionText', e.target.value)} rows={2} style={{ width: '100%', padding: 8, marginTop: 8, border: '2px solid #000', borderRadius: 6 }} />
                                        {q.options && q.options.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                {q.options.map((opt, oi) => (
                                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                        <input type="radio" name={`correct_${i}`} checked={q.correctAnswer === opt} onChange={() => changeQuestionField(i, 'correctAnswer', opt)} />
                                                        <input value={opt} onChange={e => {
                                                            const prev = q.options[oi]
                                                            const updated = q.options.map((o, idx2) => idx2 === oi ? e.target.value : o)
                                                            // if previously the correctAnswer pointed to this option, update it to the new text
                                                            const newCorrect = q.correctAnswer === prev ? e.target.value : q.correctAnswer
                                                            changeQuestionField(i, 'options', updated)
                                                            changeQuestionField(i, 'correctAnswer', newCorrect)
                                                        }} style={{ flex: 1, padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                                                    </div>
                                                ))}
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>Select the radio to mark the correct option.</div>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <input type="number" value={q.marks || 0} onChange={e => changeQuestionField(i, 'marks', Number(e.target.value))} style={{ width: 120, padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <button onClick={() => setShowEditModal(false)} style={{ padding: '8px 12px' }}>Cancel</button>
                                <button onClick={saveEditedQuestions} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Save</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Questions Modal */}
                {showAddModal && (
                    <AddQuestionsModal onCancel={() => setShowAddModal(false)} onSave={saveAddedQuestions} />
                )}

                {/* Manage Test Modal */}
                {showManageModal && selected && (
                    <ManageTestModal test={selected} onCancel={() => setShowManageModal(false)} onSave={saveManageDetails} />
                )}
            </div>
        </AdminLayout>
    )
}

function AddQuestionsModal({ onCancel, onSave }) {
    const [items, setItems] = useState([])
    const [cur, setCur] = useState({ questionText: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], marks: 1, questionImage: '' })

    function addCurrent() {
        if (!cur.questionText) return alert('Question text required')
        // Build a copy including correctAnswer if a correctIndex is selected
        const copy = JSON.parse(JSON.stringify(cur))
        if (typeof cur.correctIndex === 'number' && cur.options && cur.options[cur.correctIndex]) {
            copy.correctAnswer = cur.options[cur.correctIndex]
        } else {
            copy.correctAnswer = copy.correctAnswer || ''
        }
        setItems(s => ([...s, copy]))
        setCur({ questionText: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], marks: 1, questionImage: '', correctIndex: undefined })
    }

    return (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div style={{ width: 900, maxWidth: '98%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 18, border: '2px solid #000' }}>
                <h3>Add Questions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label>Question</label>
                    <textarea value={cur.questionText} onChange={e => setCur(c => ({ ...c, questionText: e.target.value }))} rows={3} style={{ width: '100%', padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <label style={{ marginTop: 8 }}>Question Image (optional)</label>
                    <ImagePicker value={cur.questionImage} onChange={url => setCur(c => ({ ...c, questionImage: url }))} />
                    <label>Options (optional)</label>
                    <div style={{ border: '2px solid #000', padding: 10, borderRadius: 6, marginBottom: 8, background: '#fff' }}>
                        {cur.options.map((opt, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, marginBottom: 10, alignItems: 'start' }}>
                                <input type="radio" name="correctOption" checked={cur.correctIndex === i} onChange={() => setCur(c => ({ ...c, correctIndex: i }))} />
                                <div>
                                    <input value={opt} onChange={e => setCur(c => ({ ...c, options: c.options.map((o, idx) => idx === i ? e.target.value : o) }))} style={{ padding: 8, width: '100%', border: '2px solid #000', borderRadius: 6 }} />
                                    <div style={{ marginTop: 6 }}>
                                        <ImagePicker value={cur.optionImages[i]} onChange={url => setCur(c => ({ ...c, optionImages: c.optionImages.map((u, idx) => idx === i ? url : u) }))} label={`Option ${i + 1} Image (optional)`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Select the radio to mark the correct option.</div>
                    </div>
                    <label>Marks</label>
                    <input type="number" value={cur.marks} onChange={e => setCur(c => ({ ...c, marks: Number(e.target.value) }))} style={{ width: 120, padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={addCurrent} style={{ padding: '8px 12px' }}>Add to list</button>
                        <button onClick={() => { if (!items.length) return alert('Add at least one question'); onSave(items) }} style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}>Save All</button>
                        <button onClick={onCancel} style={{ padding: '8px 12px' }}>Cancel</button>
                    </div>
                </div>

                {items.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <h4>Queued Questions</h4>
                        <ol>
                            {items.map((it, i) => <li key={i}><div style={{ fontWeight: 700 }}>{it.questionText}{it.correctAnswer ? (<div style={{ fontWeight: 400, fontSize: 13, color: '#374151' }}>Correct: {it.correctAnswer}</div>) : null}</div></li>)}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    )
}

function ImagePicker({ value, onChange, label = 'Image (optional)' }) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState(value || '')
    useEffect(() => { setPreview(value || '') }, [value])

    async function onFile(e) {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        try {
            setUploading(true)
            const fd = new FormData()
            fd.append('file', file)
            const { token } = getAuth()
            const res = await uploadFile(fd, token)
            const url = res && res.url ? res.url : ''
            setPreview(url)
            onChange && onChange(url)
        } catch (err) {
            alert('Upload failed')
        } finally { setUploading(false) }
    }

    return (
        <div style={{ border: '2px dashed #6366f1', padding: 10, borderRadius: 8, background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                <input type="file" accept="image/*" onChange={onFile} />
                {uploading ? <span style={{ fontSize: 12, color: '#2563eb' }}>Uploading...</span> : null}
            </div>
            {preview ? (
                <img
                    src={`${String(preview).startsWith('http') ? preview : `${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}${preview}`}`}
                    alt="preview"
                    style={{ marginTop: 8, maxWidth: '100%', height: 'auto', maxHeight: 220, objectFit: 'contain', borderRadius: 8, border: '2px solid #22c55e' }}
                />
            ) : null}
        </div>
    )
}

function ManageTestModal({ test, onCancel, onSave }) {
    const [form, setForm] = useState({ title: test.title || '', subject: test.subject || '', description: test.description || '', price: test.price || test.fee || 0, durationMinutes: test.durationMinutes || test.duration || 0, attempts: test.attempts || 1, classes: (test.classes || []).join(','), sections: (test.sections || []).join(',') })

    return (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div style={{ width: 720, maxWidth: '96%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 18, border: '2px solid #000' }}>
                <h3>Manage Test Series — {test.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label>Title</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <label>Subject</label>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <label>Description / Instructions</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div>
                            <label>Price</label>
                            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                        </div>
                        <div>
                            <label>Duration (minutes)</label>
                            <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                        </div>
                        <div>
                            <label>Attempts</label>
                            <input type="number" min={1} value={form.attempts} onChange={e => setForm(f => ({ ...f, attempts: Number(e.target.value) }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6, width: 120 }} />
                        </div>
                    </div>
                    <label>Classes (comma separated)</label>
                    <input value={form.classes} onChange={e => setForm(f => ({ ...f, classes: e.target.value }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />
                    <label>Sections (comma separated)</label>
                    <input value={form.sections} onChange={e => setForm(f => ({ ...f, sections: e.target.value }))} style={{ padding: 8, border: '2px solid #000', borderRadius: 6 }} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={onCancel} style={{ padding: '8px 12px' }}>Cancel</button>
                        <button onClick={() => {
                            const payload = {
                                title: form.title,
                                subject: form.subject,
                                description: form.description,
                                price: Number(form.price || 0),
                                durationMinutes: Number(form.durationMinutes || 0),
                                attempts: Number(form.attempts || 1),
                                classes: form.classes ? form.classes.split(',').map(s => s.trim()).filter(Boolean) : [],
                                sections: form.sections ? form.sections.split(',').map(s => s.trim()).filter(Boolean) : []
                            }
                            onSave(payload)
                        }} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
