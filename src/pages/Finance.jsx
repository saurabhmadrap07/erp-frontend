import React, { useEffect, useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import './Finance.css'
import { getFeeStructure, saveFeeStructure, getReceipts, deleteFeeHistory } from '../api'
import { getStudents, assignFeeToStudents } from '../api'
import { getAuth } from '../utils/session'

// Single clean component: top-level imports only
export default function Finance() {
    const [tab, setTab] = useState('fee-structure')
    const [classForFee, setClassForFee] = useState('1')
    const [sectionForFee, setSectionForFee] = useState('ALL')
    const [feeItems, setFeeItems] = useState([])
    const [receipts, setReceipts] = useState([])
    const [students, setStudents] = useState([])
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
    const [term1, setTerm1] = useState(0)
    const [term2, setTerm2] = useState(0)
    const [note, setNote] = useState('')
    const [term1DueDate, setTerm1DueDate] = useState('')
    const [term2DueDate, setTerm2DueDate] = useState('')
    const [term1FineMode, setTerm1FineMode] = useState('none')
    const [term1FineAmount, setTerm1FineAmount] = useState(0)
    const [term2FineMode, setTerm2FineMode] = useState('none')
    const [term2FineAmount, setTerm2FineAmount] = useState(0)

    useEffect(() => {
        async function load() {
            try {
                const { token } = getAuth()
                const fs = await getFeeStructure(token)
                setFeeItems(fs || [])
                const rc = await getReceipts(token)
                setReceipts(rc || [])
            } catch (e) { console.error(e) }
        }
        load()
    }, [])

    async function loadStudents() {
        try {
            const { token } = getAuth()
            const cls = classForFee
            const sec = sectionForFee
            const list = await getStudents({ class: cls, section: sec === 'ALL' ? '' : sec }, token)
            setStudents(list || [])
            setSelectedStudentIds(new Set())
        } catch (e) { console.error(e); alert('Failed to load students') }
    }

    // when selected class/section changes, update local term fields from existing entry
    useEffect(() => {
        const current = feeItems.find(fi => fi.class === classForFee && fi.section === sectionForFee)
        setTerm1(current ? (current.term1 || 0) : 0)
        setTerm2(current ? (current.term2 || 0) : 0)
        setTerm1DueDate(current ? (current.term1DueDate || '') : '')
        setTerm2DueDate(current ? (current.term2DueDate || '') : '')
        setTerm1FineMode(current ? (current.term1FineMode || 'none') : 'none')
        setTerm1FineAmount(current ? (current.term1FineAmount || 0) : 0)
        setTerm2FineMode(current ? (current.term2FineMode || 'none') : 'none')
        setTerm2FineAmount(current ? (current.term2FineAmount || 0) : 0)
        setNote('')
    }, [classForFee, sectionForFee, feeItems])

    async function saveFee() {
        try {
            const { token } = getAuth()
            const payload = { class: classForFee, section: sectionForFee, term1: Number(term1 || 0), term2: Number(term2 || 0), note: String(note || ''), term1DueDate, term2DueDate, term1FineMode, term1FineAmount: Number(term1FineAmount || 0), term2FineMode, term2FineAmount: Number(term2FineAmount || 0) }
            await saveFeeStructure(payload, token)
            const fs = await getFeeStructure(token)
            setFeeItems(fs || [])
            alert('Saved')
        } catch (e) { console.error(e); alert('Save failed') }
    }

    async function handleDeleteHistory(feeId, hist) {
        try {
            const { token } = getAuth()
            const hid = hist && hist._id ? String(hist._id) : (hist && hist.at ? new Date(hist.at).toISOString() : '')
            if (!hid) { alert('Cannot determine history id'); return }
            if (!confirm('Delete this history entry?')) return
            await deleteFeeHistory(feeId, hid, token)
            const fs = await getFeeStructure(token)
            setFeeItems(fs || [])
        } catch (e) { console.error(e); alert('Failed to delete history') }
    }

    return (
        <AdminLayout title="Finance">
            <div className="finance-page colorful">
                <div className="finance-tabs">
                    <button className={tab === 'fee-structure' ? 'active' : ''} onClick={() => setTab('fee-structure')}>Fee Structure</button>
                    <button className={tab === 'receipts' ? 'active' : ''} onClick={() => setTab('receipts')}>Receipts</button>
                </div>

                <div className="finance-content">
                    {tab === 'fee-structure' && (
                        <div className="card">
                            <h2>Set Fee</h2>
                            <div className="vertical-form">
                                <label>Class
                                    <select value={classForFee} onChange={e => setClassForFee(e.target.value)}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (<option key={n} value={String(n)}>{`Class ${n}`}</option>))}
                                    </select>
                                </label>
                                <label>Section
                                    <select value={sectionForFee} onChange={e => setSectionForFee(e.target.value)}>
                                        <option value="ALL">All</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </label>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <div className="vertical-form">
                                    <label>Term 1 Fee
                                        <input type="number" value={term1} onChange={e => setTerm1(e.target.value)} placeholder="Enter Term 1 amount (₹)" />
                                    </label>
                                    <label>Term 2 Fee
                                        <input type="number" value={term2} onChange={e => setTerm2(e.target.value)} placeholder="Enter Term 2 amount (₹)" />
                                    </label>
                                    <label>Term 1 Due Date
                                        <input type="date" value={term1DueDate} onChange={e => setTerm1DueDate(e.target.value)} placeholder="Select Term 1 due date" />
                                    </label>
                                    <label>Term 2 Due Date
                                        <input type="date" value={term2DueDate} onChange={e => setTerm2DueDate(e.target.value)} placeholder="Select Term 2 due date" />
                                    </label>
                                    <label>Term 1 Fine Type
                                        <select value={term1FineMode} onChange={e => setTerm1FineMode(e.target.value)}>
                                            <option value="none">None</option>
                                            <option value="per_day">Per Day</option>
                                            <option value="per_month">Per Month</option>
                                            <option value="flat">Flat</option>
                                        </select>
                                    </label>
                                    <label>Term 1 Fine Amount
                                        <input type="number" value={term1FineAmount} onChange={e => setTerm1FineAmount(e.target.value)} placeholder="Enter Term 1 fine amount" />
                                    </label>
                                    <label>Term 2 Fine Type
                                        <select value={term2FineMode} onChange={e => setTerm2FineMode(e.target.value)}>
                                            <option value="none">None</option>
                                            <option value="per_day">Per Day</option>
                                            <option value="per_month">Per Month</option>
                                            <option value="flat">Flat</option>
                                        </select>
                                    </label>
                                    <label>Term 2 Fine Amount
                                        <input type="number" value={term2FineAmount} onChange={e => setTerm2FineAmount(e.target.value)} placeholder="Enter Term 2 fine amount" />
                                    </label>
                                    <label>Note
                                        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for history" />
                                    </label>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <div>Existing entries:</div>
                                    <div className="fee-list">
                                        {feeItems.map(fi => (
                                            <div key={`${fi.class}-${fi.section}`} className="fee-item">
                                                {`Class ${fi.class} • ${fi.section} — T1: ₹${fi.term1 || 0}${fi.term1DueDate ? ` (due ${fi.term1DueDate})` : ''} • T2: ₹${fi.term2 || 0}${fi.term2DueDate ? ` (due ${fi.term2DueDate})` : ''}`}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {/* history for selected entry */}
                                        {(() => {
                                            const current = feeItems.find(fi => fi.class === classForFee && fi.section === sectionForFee)
                                            if (!current || !current.history || current.history.length === 0) return <div className="small">No history</div>
                                            return (
                                                <div>
                                                    <div className="small" style={{ marginBottom: 6 }}>History (most recent first):</div>
                                                    <div className="history-list">
                                                        {current.history.slice().reverse().map(h => (
                                                            <div key={(h && h._id) || h.at} className="history-item">
                                                                <div><strong>{h.by || 'admin'}</strong> • {new Date(h.at).toLocaleString()}</div>
                                                                <div>Term1: ₹{h.term1 || 0}{h.term1DueDate ? ` • due ${h.term1DueDate}` : ''} • Term2: ₹{h.term2 || 0}{h.term2DueDate ? ` • due ${h.term2DueDate}` : ''}</div>
                                                                <div className="small">Fines: T1 {h.term1FineMode || 'none'} {h.term1FineAmount ? `₹${h.term1FineAmount}` : ''} • T2 {h.term2FineMode || 'none'} {h.term2FineAmount ? `₹${h.term2FineAmount}` : ''}</div>
                                                                {h.note && <div className="small">Note: {h.note}</div>}
                                                                <div style={{ marginTop: 6 }}>
                                                                    <button className="btn outline small" onClick={() => handleDeleteHistory(current._id, h)}>Delete</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button className="btn" onClick={saveFee}>Save</button>
                                        <button className="btn outline" onClick={loadStudents}>Load Students</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Students list and assign UI */}
                    {tab === 'fee-structure' && students && students.length > 0 && (
                        <div className="card" style={{ marginTop: 16 }}>
                            <h3>Students in Class {classForFee} {sectionForFee !== 'ALL' ? `• Section ${sectionForFee}` : ''}</h3>
                            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px dashed #e6e9ef', padding: 8, borderRadius: 6 }}>
                                {students.map(s => (
                                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                                            <div className="small">{s.email} • Roll {s.rollNo}</div>
                                        </div>
                                        <div>
                                            <input type="checkbox" checked={selectedStudentIds.has(s._id)} onChange={e => {
                                                const copy = new Set(selectedStudentIds)
                                                if (e.target.checked) copy.add(s._id)
                                                else copy.delete(s._id)
                                                setSelectedStudentIds(copy)
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={async () => {
                                    if (!confirm('Assign this fee to selected students?')) return
                                    try {
                                        const { token } = getAuth()
                                        // Prepare payload
                                        const assignTerm = prompt('Enter term to assign (Term1 or Term2)', 'Term1')
                                        if (!assignTerm) return
                                        const payload = { class: classForFee, section: sectionForFee, term: assignTerm, amount: Number(assignTerm === 'Term1' ? (term1 || 0) : (term2 || 0)), note }
                                        // If specific students selected, include their IDs to target only them
                                        const selected = Array.from(selectedStudentIds)
                                        if (selected.length > 0) payload.studentIds = selected
                                        else {
                                            if (!confirm('No students selected — assign to ALL students in selected class/section?')) return
                                        }
                                        const res = await assignFeeToStudents(payload, token)
                                        alert(`Assigned to ${res.modified || res.modifiedCount || res.matched || 0} students`)
                                    } catch (e) { console.error(e); alert('Failed to assign fee') }
                                }}>Assign Fee to Students</button>
                            </div>
                        </div>
                    )}

                    {tab === 'receipts' && (
                        <div className="card">
                            <h2>Receipts</h2>
                            <div style={{ marginBottom: 12 }}>{receipts.length} receipts</div>

                            {receipts.length === 0 && <div className="small">No receipts yet.</div>}

                            {receipts.length > 0 && (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="receipts-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Receipt ID</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Student</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Class</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Term</th>
                                                <th style={{ textAlign: 'right', padding: 8 }}>Amount</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Date</th>
                                                <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receipts.map(r => (
                                                <tr key={r._id} style={{ borderTop: '1px solid #eef2f7' }}>
                                                    <td style={{ padding: 8 }}>{String(r._id).slice(-8)}</td>
                                                    <td style={{ padding: 8 }}>{r.studentName || '-'}</td>
                                                    <td style={{ padding: 8 }}>{r.studentEmail || '-'}</td>
                                                    <td style={{ padding: 8 }}>{r.class || '-'}</td>
                                                    <td style={{ padding: 8 }}>{r.term || '-'}</td>
                                                    <td style={{ padding: 8, textAlign: 'right' }}>₹{Number(r.amount || 0).toFixed(2)}</td>
                                                    <td style={{ padding: 8 }}>{new Date(r.createdAt || r.updatedAt || Date.now()).toLocaleString()}</td>
                                                    <td style={{ padding: 8 }}>
                                                        <button className="btn outline small" onClick={() => {
                                                            // open printable receipt in new window for PDF
                                                            const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111} .box{max-width:680px;margin:0 auto;border:1px solid #eee;padding:18px;border-radius:8px} h1{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin-top:12px} td{padding:6px 8px;border-bottom:1px solid #f3f4f7}</style></head><body><div class="box"><h1>Payment Receipt</h1><div style="margin-bottom:8px">Receipt ID: ${r._id}</div><table><tr><td style="width:35%"><strong>Student</strong></td><td>${r.studentName || r.studentEmail || '-'}</td></tr><tr><td><strong>Email</strong></td><td>${r.studentEmail || '-'}</td></tr><tr><td><strong>Class</strong></td><td>${r.class || '-'}</td></tr><tr><td><strong>Term</strong></td><td>${r.term || '-'}</td></tr><tr><td><strong>Amount</strong></td><td>₹${Number(r.amount || 0).toFixed(2)}</td></tr><tr><td><strong>Date</strong></td><td>${new Date(r.createdAt || r.updatedAt || Date.now()).toLocaleString()}</td></tr></table><div style="margin-top:14px;color:#666;font-size:13px">This is a system generated receipt.</div></div></body></html>`;
                                                            const w = window.open('', '_blank');
                                                            if (!w) { alert('Popup blocked. Allow popups to download PDF.'); return }
                                                            w.document.write(html);
                                                            w.document.close();
                                                            // give browser a moment to render then trigger print
                                                            setTimeout(() => { w.focus(); w.print(); }, 300);
                                                        }}>Download PDF</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* All fee history aggregated across classes/sections */}
                    {tab === 'fee-structure' && feeItems && feeItems.length > 0 && (
                        <div className="card" style={{ marginTop: 16 }}>
                            <h3>All Fee History</h3>
                            <div className="history-aggregate" style={{ maxHeight: 320, overflowY: 'auto', padding: 8, border: '1px solid #eef2f7', borderRadius: 6 }}>
                                {(() => {
                                    const all = [];
                                    (feeItems || []).forEach(fi => {
                                        (fi.history || []).forEach(h => all.push(Object.assign({}, h, { class: fi.class, section: fi.section, feeId: fi._id })))
                                    })
                                    all.sort((a, b) => new Date(b.at) - new Date(a.at))
                                    if (all.length === 0) return <div className="small">No history entries yet.</div>
                                    return all.map(h => (
                                        <div key={(h && h._id) || (h && h.at)} className="history-item" style={{ padding: 8, borderBottom: '1px solid #f3f6fa' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div><strong>{h.by || 'admin'}</strong> • {new Date(h.at).toLocaleString()}</div>
                                                    <div className="small">Class {h.class} • Section {h.section}</div>
                                                    <div>Term1: ₹{h.term1 || 0} • Term2: ₹{h.term2 || 0}</div>
                                                    {h.note && <div className="small">Note: {h.note}</div>}
                                                </div>
                                                <div>
                                                    <button className="btn outline small" onClick={() => handleDeleteHistory(h.feeId, h)}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
