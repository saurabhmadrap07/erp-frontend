import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import './Academics.css'

function qs(name) { return new URLSearchParams(window.location.search).get(name) }

// Demo student list (replace with API call)
const demoStudents = [
    { id: 's1', name: 'Shravani Sanjay Salunke' },
    { id: 's2', name: 'Nitesh' },
    { id: 's3', name: 'Aarav Patel' },
]

export default function AcademicsResults() {
    const cls = qs('class') || '1'
    const sec = qs('section') || 'A'
    const [klass, setKlass] = useState(cls)
    const [section, setSection] = useState(sec)
    const [files, setFiles] = useState({})

    useEffect(() => {
        // load any saved result metadata (demo)
        try {
            const raw = localStorage.getItem(`results_${klass}_${section}`)
            if (raw) setFiles(JSON.parse(raw))
        } catch (e) { }
    }, [klass, section])

    function onChoose(studentId, e) {
        const f = e.target.files && e.target.files[0]
        if (!f) return
        setFiles(prev => ({ ...prev, [studentId]: { name: f.name, type: f.type } }))
    }

    function saveAll() {
        try { localStorage.setItem(`results_${klass}_${section}`, JSON.stringify(files)); alert('Results saved locally (demo)') } catch (e) { console.error(e) }
    }

    return (
        <AdminLayout title="Results Upload">
            <div className="academics-page colorful">
                <div className="academics-header">
                    <h1>Upload Results — Class {klass} {section}</h1>
                    <div className="academics-controls">
                        <select value={klass} onChange={e => setKlass(e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{`Class ${n}`}</option>)}
                        </select>
                        <select value={section} onChange={e => setSection(e.target.value)}>
                            {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="card">
                    <h3>Upload Results for Class {klass} {section}</h3>
                    <p className="muted">Upload per-student result files. Accepted formats: .pdf, .docx</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        {demoStudents.map(st => (
                            <div className="result-item" key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'linear-gradient(90deg,#0ea5a4, #60a5fa, #7c3aed)', borderRadius: 8, color: '#fff' }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>{st.name}</div>
                                    <div style={{ opacity: 0.9, fontSize: 12 }}>{files[st.id]?.name || 'No file chosen'}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => onChoose(st.id, e)} style={{ display: 'inline-block' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button className="btn green" onClick={saveAll}>Save Results</button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
