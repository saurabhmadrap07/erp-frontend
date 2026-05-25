import React, { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStudents, createHostelAllocation, getHostelAllocations, clearHostelAllocations, getHostels, createHostel, deleteHostel, API_BASE } from '../../api'
import { getAuth } from '../../utils/session'

function uuid() { return Math.random().toString(36).slice(2) }

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6', '#f97316', '#e11d48', '#0ea5e9', '#84cc16']
function pickColor(seed) { return COLORS[Math.abs(Number(seed)) % COLORS.length] }
const colColor = (i) => COLORS[Math.abs(Number(i)) % COLORS.length]
const rowColor = (i) => COLORS[Math.abs(Number(i)) % COLORS.length]

function loadLS(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def }
    catch { return def }
}
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { } }

export default function HostelManagement() {
    const { token } = getAuth()
    const [students, setStudents] = useState([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    // Data: hostels -> floors -> rooms -> beds
    const [hostels, setHostels] = useState([])
    const [feesConfig, setFeesConfig] = useState(() => loadLS('erp_hostel_fees', { byClass: {}, bedTypeMultiplier: { '1-bed': 1.0, '2-bed': 0.9, '3-bed': 0.8 } }))
    const [allocations, setAllocations] = useState([])

    // UI state
    const [newHostel, setNewHostel] = useState({ name: '', floors: 4, roomsPerFloor: 10, bedsPerRoom: 2 })
    const [qStudent, setQStudent] = useState('')
    const [allocForm, setAllocForm] = useState({ hostelId: '', floorNo: '', roomNo: '', bedIndex: '', studentId: '', bedType: '2-bed', parts: 2, option: 'add-to-fee' })

    useEffect(() => { saveLS('erp_hostel_fees', feesConfig) }, [feesConfig])
    // Load allocations from backend
    useEffect(() => {
        (async () => {
            try { const list = await getHostelAllocations({}, token); setAllocations(Array.isArray(list) ? list : []) }
            catch (e) { console.error('Failed to load allocations', e) }
        })()
    }, [token])

    // Load hostels from backend
    useEffect(() => {
        (async () => {
            try { const list = await getHostels(token); setHostels(Array.isArray(list) ? list : []) }
            catch (e) { console.error('Failed to load hostels', e) }
        })()
    }, [token])

    // Listen for payment events from student pages and refresh allocations when payments happen
    useEffect(() => {
        // Helper: poll for server PDF for a given receiptId and update allocations when found
        async function pollForReceiptPdf(receiptId, allocationId, attempts = 6, delay = 800) {
            if (!receiptId) return null
            const url = `${API_BASE || ''}/uploads/receipt_hostel_${receiptId}.pdf`
            for (let i = 0; i < attempts; i++) {
                try {
                    const resp = await fetch(url, { method: 'HEAD' })
                    if (resp && resp.ok) {
                        setAllocations(list => (list || []).map(a => {
                            if (String(a._id || a.id) !== String(allocationId)) return a
                            return { ...a, receiptPdfUrl: url }
                        }))
                        return url
                    }
                } catch (e) { /* ignore network/CORS until final attempt */ }
                await new Promise(r => setTimeout(r, delay))
            }
            return null
        }

        function onPayment(e) {
            try {
                // If event carries allocationId and a receipt object, optimistically update UI first
                const detail = e && e.detail
                if (detail && detail.allocationId) {
                    setAllocations(list => (list || []).map(a => {
                        if (String(a._id || a.id) !== String(detail.allocationId)) return a
                        // mark as paid and append payment entry if provided
                        const copy = { ...a }
                        copy.paid = true
                        copy.payments = Array.isArray(copy.payments) ? [...copy.payments] : []
                        // Detail.receipt may be the backend receipt directly, or a wrapper that contains backendReceipt
                        let rec = (detail.receipt && (detail.receipt._id || detail.receipt.id)) ? detail.receipt : (detail.receipt && detail.receipt.backendReceipt) ? detail.receipt.backendReceipt : (detail.receipt && detail.receipt.receipt) ? detail.receipt.receipt : null
                        if (rec) {
                            const p = { partIndex: rec.partIndex || 1, amount: Number(rec.amount || rec.feeAmount || 0), orderId: rec.orderId || rec.razorpayOrderId || '', paymentId: rec.paymentId || rec.razorpayPaymentId || '', receiptId: rec._id || rec.id || rec.receiptId || '', status: 'paid', term: rec.term || '' }
                            // avoid duplicate receipt entries
                            const exists = copy.payments.some(x => (p.receiptId && String(x.receiptId) === String(p.receiptId)) || (p.paymentId && String(x.paymentId) === String(p.paymentId)))
                            if (!exists) copy.payments.push(p)
                            // attach receiptPdfUrl if available from backendReceipt
                            const rid = p.receiptId || (rec && (rec._id || rec.id))
                            if (rec && (rec.pdfUrl || rec.pdfPath)) {
                                copy.receiptPdfUrl = rec.pdfUrl || (rec.pdfPath ? `/uploads/${rec.pdfPath.split('/').pop()}` : undefined)
                            } else if (rid) {
                                // optimistic URL (may 404 until server writes file) — set it and also poll to replace when available
                                const optUrl = `${API_BASE || ''}/uploads/receipt_hostel_${rid}.pdf`
                                copy.receiptPdfUrl = optUrl
                                // start polling in background to wait for actual file
                                pollForReceiptPdf(rid, copy._id || copy.id || detail.allocationId).catch(() => { })
                            }
                        }
                        return copy
                    }))
                }
            } catch (err) {
                console.warn('Failed to apply optimistic allocation update from event', err)
            }

            // After optimistic update, reload authoritative state from server
            ; (async () => {
                try {
                    const list = await getHostelAllocations({}, token)
                    setAllocations(Array.isArray(list) ? list : [])
                } catch (err) {
                    console.warn('Failed to reload allocations after payment event', err)
                }
            })()
        }

        window.addEventListener('erp_hostel_payment_completed', onPayment)
        // Also listen for cross-tab storage events (student tab may write to localStorage)
        function onStorage(ev) {
            try {
                if (!ev || !ev.key) return
                if (ev.key !== 'erp_hostel_payment_event') return
                const payload = JSON.parse(ev.newValue || ev.oldValue || '{}')
                if (payload && payload.detail) {
                    onPayment({ detail: payload.detail })
                }
            } catch (e) { /* ignore malformed storage payloads */ }
        }
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('erp_hostel_payment_completed', onPayment)
            window.removeEventListener('storage', onStorage)
        }
    }, [token])

    async function loadStudents() {
        setLoadingStudents(true)
        try {
            const data = await getStudents({}, token)
            setStudents(Array.isArray(data) ? data : [])
        } catch (e) { console.error('Failed to load students', e) }
        finally { setLoadingStudents(false) }
    }
    useEffect(() => { loadStudents() }, [])

    async function createHostelLocal() {
        const floorsArr = Array.from({ length: Number(newHostel.floors || 0) }, (_, fi) => ({
            number: fi + 1,
            rooms: Array.from({ length: Number(newHostel.roomsPerFloor || 0) }, (_, ri) => ({
                number: ri + 1,
                beds: Array.from({ length: Number(newHostel.bedsPerRoom || 0) }, () => ({ occupiedBy: null }))
            }))
        }))
        const payload = { name: newHostel.name.trim() || `Hostel ${hostels.length + 1}`, floors: floorsArr }
        try {
            const saved = await createHostel(payload, token)
            setHostels(list => [saved, ...list])
        } catch (e) {
            alert('Failed to create hostel: ' + (e.message || 'Unknown error'))
        }
        setNewHostel({ name: '', floors: 4, roomsPerFloor: 10, bedsPerRoom: 2 })
    }

    async function removeHostel(id) {
        try { await deleteHostel(id, token); setHostels(list => list.filter(h => String(h._id) !== String(id))) }
        catch (e) { alert('Failed to remove hostel: ' + (e.message || 'Unknown error')) }
    }
    function freeBedsInHostel(id) {
        setHostels(list => list.map(h => String(h._id) !== String(id) ? h : ({
            ...h,
            floors: (h.floors || []).map(f => ({
                ...f,
                rooms: (f.rooms || []).map(r => ({
                    ...r,
                    beds: (r.beds || []).map(() => ({ occupiedBy: null }))
                }))
            }))
        })))
    }
    function freeBedsInAllHostels() {
        setHostels(list => list.map(h => ({
            ...h,
            floors: (h.floors || []).map(f => ({
                ...f,
                rooms: (f.rooms || []).map(r => ({
                    ...r,
                    beds: (r.beds || []).map(() => ({ occupiedBy: null }))
                }))
            }))
        })))
    }

    // Helpers
    function findHostel(id) { return hostels.find(h => String(h._id) === String(id)) }
    function getRoom(hostelId, floorNo, roomNo) {
        const h = findHostel(hostelId); if (!h) return null
        const f = h.floors.find(fl => Number(fl.number) === Number(floorNo)); if (!f) return null
        const r = f.rooms.find(ro => Number(ro.number) === Number(roomNo)); return r || null
    }

    const filteredStudents = useMemo(() => {
        const t = qStudent.trim().toLowerCase(); if (!t) return students
        return students.filter(s => (
            String(s.name || '').toLowerCase().includes(t) ||
            String(s.rollNo || '').toLowerCase().includes(t) ||
            String(s.class || '').toLowerCase().includes(t)
        ))
    }, [students, qStudent])

    // Normalize class to the keys used in feesConfig.byClass (I..XII)
    function normalizeClassKey(val) {
        const s = String(val || '').trim()
        const numMatch = s.match(/\d+/)
        const raw = numMatch ? numMatch[0] : s.toUpperCase().replace(/\s+/g, '')
        const map = {
            '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII',
            'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV', 'V': 'V', 'VI': 'VI', 'VII': 'VII', 'VIII': 'VIII', 'IX': 'IX', 'X': 'X', 'XI': 'XI', 'XII': 'XII'
        }
        return map[raw] || raw
    }

    function calcFee(student, bedType) {
        const clsKey = normalizeClassKey(student.class)
        const base = Number(feesConfig.byClass[clsKey] || 0)
        const mult = Number(feesConfig.bedTypeMultiplier[String(bedType || '2-bed')] || 1)
        return Math.round(base * mult)
    }

    async function allocate() {
        const st = students.find(s => String(s._id) === String(allocForm.studentId))
        if (!st) return alert('Select student')
        const room = getRoom(allocForm.hostelId, allocForm.floorNo, allocForm.roomNo)
        if (!room) return alert('Select valid room')
        const bi = Number(allocForm.bedIndex)
        if (!room.beds[bi]) return alert('Select bed')
        if (room.beds[bi].occupiedBy) return alert('Bed already allocated')

        const amount = calcFee(st, allocForm.bedType)
        const parts = Number(allocForm.parts || 1)
        const perPart = parts > 0 ? Math.round(amount / parts) : amount

        room.beds[bi].occupiedBy = { studentId: st._id }
        setHostels(list => list.map(h => h.id !== allocForm.hostelId ? h : {
            ...h,
            floors: h.floors.map(f => Number(f.number) !== Number(allocForm.floorNo) ? f : {
                ...f,
                rooms: f.rooms.map(r => Number(r.number) !== Number(allocForm.roomNo) ? r : {
                    ...r,
                    beds: r.beds.map((b, idx) => idx !== bi ? b : { occupiedBy: { studentId: st._id } })
                })
            })
        }))

        const record = {
            when: Date.now(),
            hostelId: allocForm.hostelId,
            floorNo: Number(allocForm.floorNo),
            roomNo: Number(allocForm.roomNo),
            bedIndex: bi,
            student: { id: st._id, name: st.name, email: st.email || '', rollNo: st.rollNo || '', class: st.class || '', idCardCode: (st.idCard && st.idCard.code) || '' },
            bedType: allocForm.bedType,
            fee: { amount, parts, perPart, option: allocForm.option },
        }
        try {
            const saved = await createHostelAllocation(record, token)
            setAllocations(list => [saved, ...list])
        } catch (e) {
            console.error('Failed to save allocation', e)
            alert('Failed to save allocation: ' + (e.message || 'Unknown error'))
            return
        }
        alert(`Allocated room ${record.roomNo} bed ${record.bedIndex + 1} to ${st.name}. Fee: ₹${amount} (${parts} parts).`)
    }

    // Helpers to generate PDF in admin if server PDF missing
    function formatAmountAdmin(v) { const n = Number(v || 0); return Number.isInteger(n) ? `₹${n}` : `₹${n.toFixed(2)}` }
    function buildReceiptHtmlForAdmin({ allocation, payment }) {
        const student = allocation && allocation.student ? allocation.student : {}
        const hostelObj = findHostel(allocation.hostelId) || {}
        const room = allocation ? `${allocation.floorNo} / ${allocation.roomNo} / ${Number(allocation.bedIndex) + 1}` : ''
        const d = allocation && allocation.when ? new Date(allocation.when).toLocaleString() : new Date().toLocaleString()
        const amt = formatAmountAdmin(payment.amount || allocation.fee?.perPart || allocation.fee?.amount || 0)
        const pid = payment.paymentId || payment.orderId || payment.receiptId || ''
        return `
                <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding:20px;">
                    <div style="max-width:760px;margin:0 auto;background:#fff;border-radius:8px;padding:22px;border:1px solid #e6e9ef;box-shadow:0 1px 0 rgba(15,23,42,0.04);">
                        <div style="text-align:center;margin-bottom:14px;">
                            <div style="font-size:28px;font-weight:700;color:#0b1220;">School Name</div>
                            <div style="font-size:16px;margin-top:6px;color:#0b1220;font-weight:700;">Hostel Fee Receipt</div>
                            <div style="margin-top:6px;color:#475569;font-size:13px">Receipt ID: ${payment.receiptId || ''}</div>
                        </div>
                        <div style="margin-top:8px;border-top:1px solid #eef2f7;padding-top:12px">
                            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0b1220">
                                <tbody>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="width:30%;padding:8px 6px;color:#334155"><strong>Student</strong></td><td style="padding:8px 6px">${student.name || ''}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Roll No</strong></td><td style="padding:8px 6px">${student.rollNo || ''}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Class</strong></td><td style="padding:8px 6px">${student.class || ''}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Email</strong></td><td style="padding:8px 6px">${student.email || ''}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Hostel</strong></td><td style="padding:8px 6px">${hostelObj.name || ''}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Room</strong></td><td style="padding:8px 6px">${room}</td></tr>
                                    <tr style="border-bottom:1px solid #f1f5f9;height:40px"><td style="padding:8px 6px;color:#334155"><strong>Term</strong></td><td style="padding:8px 6px">${payment.term || ''}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:14px;padding:12px 0;border-top:1px dashed #e6eef8;display:flex;justify-content:space-between;align-items:center">
                            <div style="color:#64748b;font-size:12px">This is a system generated receipt.</div>
                            <div style="text-align:right"><div style="font-size:13px;color:#334155">Amount Paid</div><div style="font-weight:800;font-size:20px;margin-top:6px">${amt}</div></div>
                        </div>
                        <div style="margin-top:10px;color:#475569;font-size:12px">Date: ${d}</div>
                        <div style="margin-top:4px;color:#475569;font-size:12px">Payment ID: ${pid}</div>
                    </div>
                </div>`
    }

    async function generatePdfFromHtml(html, filename = `receipt_${Date.now()}.pdf`) {
        const wrapper = document.createElement('div')
        wrapper.style.position = 'fixed'
        wrapper.style.left = '-10000px'
        wrapper.style.top = '0'
        wrapper.style.opacity = '0'
        wrapper.innerHTML = html
        document.body.appendChild(wrapper)
        try {
            const node = wrapper.firstElementChild || wrapper
            const canvas = await html2canvas(node, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] })
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
            pdf.save(filename)
        } catch (e) {
            console.error('Admin PDF generation failed', e)
        } finally {
            document.body.removeChild(wrapper)
        }
    }

    async function downloadFileFromUrl(url, filename) {
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to download file')
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filename || url.split('/').pop()
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(blobUrl)
        } catch (e) {
            throw e
        }
    }

    return (
        <AdminLayout title="House/Hostel Management">
            <div style={{ padding: 20, display: 'grid', gap: 16 }}>
                <style>
                    {`
                    .erp-input, .erp-select { border: 2px solid #000; border-radius: 8px; padding: 8px 10px; background: #fff; color: #0f172a; }
                    .erp-input::placeholder { color: #0f172a; opacity: 0.8; }
                    .erp-select { appearance: none; }
                    `}
                </style>
                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Create Hostel</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                        <input className="erp-input" placeholder="Hostel name" value={newHostel.name} onChange={e => setNewHostel({ ...newHostel, name: e.target.value })} />
                        <input className="erp-input" type="number" placeholder="Floors" value={newHostel.floors} onChange={e => setNewHostel({ ...newHostel, floors: e.target.value })} />
                        <input className="erp-input" type="number" placeholder="Rooms/floor" value={newHostel.roomsPerFloor} onChange={e => setNewHostel({ ...newHostel, roomsPerFloor: e.target.value })} />
                        <input className="erp-input" type="number" placeholder="Beds/room" value={newHostel.bedsPerRoom} onChange={e => setNewHostel({ ...newHostel, bedsPerRoom: e.target.value })} />
                    </div>
                    <button style={{ marginTop: 10 }} onClick={createHostelLocal}>Add Hostel</button>
                </section>

                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f8fafc)', border: '2px solid #000', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#0f172a' }}>Hostels</h3>
                        <button onClick={freeBedsInAllHostels} title="Mark every bed as free">Free all beds</button>
                    </div>
                    {!hostels.length && <p style={{ color: '#64748b' }}>No hostels yet. Create one above.</p>}
                    {hostels.map(h => (
                        <details key={h._id || h.id || h.name} style={{ marginTop: 10 }}>
                            <summary style={{ cursor: 'pointer' }}>
                                {h.name} — {h.floors.length} floors
                                <button style={{ marginLeft: 10 }} onClick={e => { e.preventDefault(); freeBedsInHostel(h._id) }}>Free beds</button>
                                <button style={{ marginLeft: 10 }} onClick={e => { e.preventDefault(); removeHostel(h._id) }}>Remove</button>
                            </summary>
                            {h.floors.map(f => (
                                <div key={`floor-${h._id}-${f.number}`} style={{ marginTop: 8 }}>
                                    <strong>Floor {f.number}</strong>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8, marginTop: 6 }}>
                                        {f.rooms.map(r => {
                                            const color = pickColor((Number(f.number) || 0) + (Number(r.number) || 0))
                                            return (
                                                <div key={`room-${h._id}-${f.number}-${r.number}`} style={{ border: `2px solid ${color}`, borderRadius: 10, padding: 10, background: 'linear-gradient(180deg,#ffffff,#f8fafc)' }}>
                                                    <div style={{ fontWeight: 600, color }}>{`Room ${r.number}`}</div>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                                        {r.beds.map((b, bi) => (
                                                            <span key={`bed-${h._id}-${f.number}-${r.number}-${bi}`} style={{ padding: '4px 10px', borderRadius: 8, border: `2px solid ${color}`, background: b.occupiedBy ? '#fee2e2' : '#d1fae5', fontSize: 13 }}>
                                                                Bed {bi + 1} {b.occupiedBy ? '(occupied)' : '(free)'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </details>
                    ))}
                </section>

                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Fees Configuration</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                        <div>
                            <label>Class-wise base fee</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(cls => (
                                    <div key={cls}>
                                        <small>Class {cls}</small>
                                        <input className="erp-input" type="number" value={feesConfig.byClass[cls] || ''} onChange={e => setFeesConfig(fc => ({ ...fc, byClass: { ...fc.byClass, [cls]: Number(e.target.value || 0) } }))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label>Bed type multiplier</label>
                            {Object.keys(feesConfig.bedTypeMultiplier).map(k => (
                                <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                    <span style={{ width: 80 }}>{k}</span>
                                    <input className="erp-input" type="number" step="0.05" value={feesConfig.bedTypeMultiplier[k]} onChange={e => setFeesConfig(fc => ({ ...fc, bedTypeMultiplier: { ...fc.bedTypeMultiplier, [k]: Number(e.target.value || 1) } }))} />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label>Quick add bed type</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input className="erp-input" placeholder="name (e.g., 2-bed)" id="newBedTypeName" />
                                <input className="erp-input" type="number" step="0.05" placeholder="multiplier" id="newBedTypeMult" />
                                <button onClick={() => {
                                    const name = document.getElementById('newBedTypeName').value.trim()
                                    const mult = Number(document.getElementById('newBedTypeMult').value || 1)
                                    if (!name) return
                                    setFeesConfig(fc => ({ ...fc, bedTypeMultiplier: { ...fc.bedTypeMultiplier, [name]: mult } }))
                                }}>Add</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Allocate Student</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                        <select className="erp-select" value={allocForm.hostelId} onChange={e => setAllocForm({ ...allocForm, hostelId: e.target.value })}>
                            <option value="">Select hostel</option>
                            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                        </select>
                        <input className="erp-input" type="number" placeholder="Floor" value={allocForm.floorNo} onChange={e => setAllocForm({ ...allocForm, floorNo: e.target.value })} />
                        <input className="erp-input" type="number" placeholder="Room" value={allocForm.roomNo} onChange={e => setAllocForm({ ...allocForm, roomNo: e.target.value })} />
                        <input className="erp-input" type="number" placeholder="Bed index (1..n)" value={allocForm.bedIndex} onChange={e => setAllocForm({ ...allocForm, bedIndex: Number(e.target.value) - 1 })} />

                        <select className="erp-select" value={allocForm.studentId} onChange={e => setAllocForm({ ...allocForm, studentId: e.target.value })}>
                            <option value="">Select student</option>
                            {filteredStudents.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollNo || '—'})</option>)}
                        </select>
                        <input className="erp-input" placeholder="Search students" value={qStudent} onChange={e => setQStudent(e.target.value)} />
                        <select className="erp-select" value={allocForm.bedType} onChange={e => setAllocForm({ ...allocForm, bedType: e.target.value })}>
                            {Object.keys(feesConfig.bedTypeMultiplier).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select className="erp-select" value={allocForm.option} onChange={e => setAllocForm({ ...allocForm, option: e.target.value })}>
                            <option value="add-to-fee">Add to panel</option>
                            <option value="pay-now">Pay now</option>
                        </select>
                        <input className="erp-input" type="number" placeholder="Parts (2 or 3)" value={allocForm.parts} onChange={e => setAllocForm({ ...allocForm, parts: Number(e.target.value || 1) })} />
                    </div>
                    <button style={{ marginTop: 10, border: '2px solid #000', borderRadius: 8, padding: '8px 12px', background: 'linear-gradient(90deg,#7c3aed,#22c55e)', color: '#fff' }} onClick={allocate} disabled={loadingStudents}>Allocate</button>
                </section>

                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f8fafc)', border: '2px solid #000', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>Allocations</h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={async () => {
                            if (!confirm('Delete ALL hostel allocations?')) return
                            try { await clearHostelAllocations(token); setAllocations([]) } catch (e) { alert('Failed to clear: ' + (e.message || 'Unknown error')) }
                            // Free all occupied beds locally when allocations are cleared
                            setHostels(list => list.map(h => ({
                                ...h,
                                floors: (h.floors || []).map(f => ({
                                    ...f,
                                    rooms: (f.rooms || []).map(r => ({
                                        ...r,
                                        beds: (r.beds || []).map(b => ({ occupiedBy: null }))
                                    }))
                                }))
                            })))
                            try { localStorage.removeItem('erp_hostel_allocations') } catch { }
                        }}>Delete all allocations</button>
                        <button onClick={async () => {
                            try { const list = await getHostelAllocations({}, token); setAllocations(Array.isArray(list) ? list : []) } catch (e) { alert('Failed to reload: ' + (e.message || 'Unknown error')) }
                        }}>Reload</button>
                    </div>
                    {!allocations.length && <p style={{ color: '#64748b' }}>No allocations yet.</p>}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ borderLeft: `3px solid ${colColor(0)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Date</th>
                                    <th style={{ borderLeft: `3px solid ${colColor(1)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Student</th>
                                    <th style={{ borderLeft: `3px solid ${colColor(2)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Hostel/Floor/Room/Bed</th>
                                    <th style={{ borderLeft: `3px solid ${colColor(3)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Bed Type</th>
                                    <th style={{ borderLeft: `3px solid ${colColor(4)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Fee</th>
                                    <th style={{ borderLeft: `3px solid ${colColor(5)}`, borderBottom: '3px solid #000', padding: '8px 10px' }}>Option</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allocations.map((a, idx) => {
                                    // For each allocation, show per-term/part payment status and receipt links
                                    const parts = Number(a.fee?.parts || 1);
                                    const perPart = Number(a.fee?.perPart || a.fee?.amount || 0);
                                    // Map of partIndex to payment (status/receiptId)
                                    const payments = Array.isArray(a.payments) ? a.payments : [];
                                    // Helper to get receipt PDF URL by receiptId (pointing to backend API base)
                                    const getReceiptUrl = (receiptId) => receiptId ? `${API_BASE || ''}/uploads/receipt_hostel_${receiptId}.pdf` : null;
                                    return (
                                        <tr key={a._id || a.id || `${a.hostelId}-${a.when}-${idx}`} style={{ borderTop: `3px solid ${rowColor(idx)}`, borderBottom: `3px solid ${rowColor(idx)}` }}>
                                            <td style={{ borderLeft: `3px solid ${colColor(0)}`, padding: '8px 10px' }}>{new Date(a.when).toLocaleString()}</td>
                                            <td style={{ borderLeft: `3px solid ${colColor(1)}`, padding: '8px 10px' }}>{a.student.name} ({a.student.rollNo}) — Class {a.student.class}</td>
                                            <td style={{ borderLeft: `3px solid ${colColor(2)}`, padding: '8px 10px' }}>{(findHostel(a.hostelId)?.name) || '—'}/{a.floorNo}/{a.roomNo}/{a.bedIndex + 1}</td>
                                            <td style={{ borderLeft: `3px solid ${colColor(3)}`, padding: '8px 10px' }}>{a.bedType}</td>
                                            <td style={{ borderLeft: `3px solid ${colColor(4)}`, padding: '8px 10px' }}>₹{a.fee.amount} ({a.fee.parts} parts, ₹{a.fee.perPart} each)</td>
                                            <td style={{ borderLeft: `3px solid ${colColor(5)}`, padding: '8px 10px' }}>
                                                {a.fee.option === 'add-to-fee' ? 'Add to panel' : 'Pay now'}
                                                <div style={{ marginTop: 4 }}>
                                                    {Array.from({ length: parts }, (_, i) => {
                                                        const partIdx = i + 1;
                                                        // Find payment for this part
                                                        const pay = payments.find(p => Number(p.partIndex) === partIdx && p.status === 'paid');
                                                        return (
                                                            <div key={partIdx} style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ padding: '2px 8px', border: '1px solid #000', borderRadius: 999, background: pay ? '#d1fae5' : '#fee2e2' }}>
                                                                    Term {partIdx}: {pay ? 'Paid' : 'Not Paid'}
                                                                </span>
                                                                {pay && pay.receiptId && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            const url = getReceiptUrl(pay.receiptId)
                                                                            try {
                                                                                if (url) {
                                                                                    // Check if server PDF exists before downloading
                                                                                    try {
                                                                                        const head = await fetch(url, { method: 'HEAD' })
                                                                                        if (head && head.ok) {
                                                                                            // download file as blob to force download
                                                                                            await downloadFileFromUrl(url, `receipt_${pay.receiptId}.pdf`)
                                                                                            return
                                                                                        }
                                                                                    } catch (e) {
                                                                                        // HEAD may fail due to CORS; try direct download attempt
                                                                                        try { await downloadFileFromUrl(url, `receipt_${pay.receiptId}.pdf`); return } catch (ee) { }
                                                                                    }
                                                                                }
                                                                                // server PDF not available — generate locally and save
                                                                                const html = buildReceiptHtmlForAdmin({ allocation: a, payment: pay })
                                                                                await generatePdfFromHtml(html, `receipt_${pay.receiptId || Date.now()}.pdf`)
                                                                            } catch (e) {
                                                                                console.error('Failed to download or generate receipt PDF', e)
                                                                            }
                                                                        }}
                                                                        style={{ marginLeft: 4, border: 'none', background: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}
                                                                    >
                                                                        View Receipt
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>


            </div>
        </AdminLayout>
    )
}
