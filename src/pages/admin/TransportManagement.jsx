import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getStudents, getTransportAllocations, createTransportAllocation, API_BASE, createTransportRazorpayOrder, confirmTransportPayment, markTransportAllocationPaid } from '../../api'
import { getAuth } from '../../utils/session'

function uuid() { return Math.random().toString(36).slice(2) }
function loadLS(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { } }

export default function TransportManagement() {
    const { token } = getAuth()
    const [students, setStudents] = useState([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [adminPaying, setAdminPaying] = useState(false)

    // Data models
    // buses: { id, name, numberPlate, seats, driverName, helperName }
    const [buses, setBuses] = useState(() => loadLS('erp_transport_buses', []))
    // routes: { id, name, busId, stops: [{ id, name, time }], feeByClass: { "I": 500, ... } }
    const [routes, setRoutes] = useState(() => loadLS('erp_transport_routes', []))
    // allocations: { id, when, student, routeId, stopId, busId, seatNo, fee: { amount, option } }
    const [allocations, setAllocations] = useState([])

    // UI states
    const [newBus, setNewBus] = useState({ name: '', numberPlate: '', seats: 40, driverName: '', helperName: '', fee: '' })
    const [newRoute, setNewRoute] = useState({ name: '', busId: '', stopName: '', stopTime: '' })
    const [routeFeeClass, setRouteFeeClass] = useState({ class: 'I', amount: '' })

    const [qStudent, setQStudent] = useState('')
    const [allocForm, setAllocForm] = useState({ busId: '', routeId: '', stopId: '', studentId: '', seatNo: '', option: 'add-to-fee', feeAmount: '' })


    useEffect(() => { saveLS('erp_transport_buses', buses) }, [buses])
    useEffect(() => { saveLS('erp_transport_routes', routes) }, [routes])

    // Load allocations from backend
    async function loadAllocations() {
        try {
            const data = await getTransportAllocations({}, token)
            setAllocations(Array.isArray(data) ? data : [])
        } catch (e) {
            setAllocations([])
            console.error('Failed to load transport allocations', e)
        }
    }
    useEffect(() => { loadAllocations() }, [token])
    // Refresh allocations when a student completes payment
    useEffect(() => {
        function onPayment() { loadAllocations() }
        window.addEventListener('erp_transport_payment_completed', onPayment)
        return () => window.removeEventListener('erp_transport_payment_completed', onPayment)
    }, [])

    // Admin Razorpay payment handler
    async function handleAdminPay(allocation) {
        if (!allocation) return
        try {
            // load Razorpay script
            await new Promise((resolve) => {
                if (window.Razorpay) return resolve(true)
                const script = document.createElement('script')
                script.src = 'https://checkout.razorpay.com/v1/checkout.js'
                script.onload = () => resolve(true)
                script.onerror = () => resolve(false)
                document.body.appendChild(script)
            })
            const allocationId = allocation._id || allocation.id
            const amount = Number((allocation && allocation.fee && allocation.fee.amount) ?? allocation.amount ?? 0)
            if (!allocationId) return alert('Allocation id missing')
            const order = await createTransportRazorpayOrder(amount, `transport_${allocationId}`, token)
            const options = {
                key: order && (order.keyId || order.key_id) || 'rzp_test_YourKeyHere',
                amount: order.amount,
                currency: order.currency,
                name: 'School Name',
                description: 'Transport Fee Payment (admin)',
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const payload = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            allocationId: allocationId,
                            studentId: allocation.student && (allocation.student.id || allocation.student._id),
                            studentName: allocation.student && allocation.student.name,
                            studentEmail: allocation.student && allocation.student.email,
                            amount: amount,
                            routeName: allocation.routeName || '',
                            stopName: allocation.stopName || '',
                            busName: allocation.busName || ''
                        }
                        const res = await confirmTransportPayment(payload, token)
                        console.log('admin confirmTransportPayment response', res)
                        // refresh allocations to pick up receipt and updated paid state
                        await loadAllocations()
                        // notify other pages
                        window.dispatchEvent(new Event('erp_transport_payment_completed'))
                    } catch (e) {
                        console.warn('Admin payment confirm failed', e)
                        alert('Payment confirmation failed: ' + (e.message || e))
                    }
                },
                prefill: {
                    name: allocation.student && allocation.student.name,
                    email: allocation.student && allocation.student.email,
                },
                theme: { color: '#3399cc' }
            }
            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (e) {
            alert('Payment failed: ' + (e.message || 'Unknown error'))
        }
    }

    async function loadStudents() {
        setLoadingStudents(true)
        try {
            const data = await getStudents({}, token)
            setStudents(Array.isArray(data) ? data : [])
        } catch (e) { console.error('Failed to load students', e) }
        finally { setLoadingStudents(false) }
    }
    useEffect(() => { loadStudents() }, [])

    // Bus CRUD
    function addBus() {
        const seats = Number(newBus.seats || 0)
        if (!newBus.name.trim()) return alert('Bus name required')
        if (seats <= 0) return alert('Seats must be > 0')
        const bus = { id: uuid(), ...newBus, seats, fee: Number(newBus.fee || 0) }
        setBuses(list => [...list, bus])
        setNewBus({ name: '', numberPlate: '', seats: 40, driverName: '', helperName: '', fee: '' })
    }
    function removeBus(id) {
        setBuses(list => list.filter(b => b.id !== id))
        setRoutes(list => list.map(r => r.busId === id ? { ...r, busId: '' } : r))
    }

    // Route CRUD
    function addRoute() {
        if (!newRoute.name.trim()) return alert('Route name required')
        const r = { id: uuid(), name: newRoute.name.trim(), busId: newRoute.busId || '', stops: [], feeByClass: {} }
        setRoutes(list => [...list, r])
        setNewRoute({ name: '', busId: '', stopName: '', stopTime: '' })
    }
    function addStop(routeId) {
        const name = (newRoute.stopName || '').trim()
        const time = (newRoute.stopTime || '').trim()
        if (!name) return alert('Stop name required')
        setRoutes(list => list.map(r => r.id !== routeId ? r : { ...r, stops: [...r.stops, { id: uuid(), name, time }] }))
        setNewRoute(n => ({ ...n, stopName: '', stopTime: '' }))
    }
    function assignBusToRoute(routeId, busId) {
        setRoutes(list => list.map(r => r.id !== routeId ? r : { ...r, busId }))
    }
    function setRouteFee(routeId) {
        const cls = routeFeeClass.class
        const amt = Number(routeFeeClass.amount || 0)
        setRoutes(list => list.map(r => r.id !== routeId ? r : { ...r, feeByClass: { ...r.feeByClass, [cls]: amt } }))
    }
    function removeRoute(id) { setRoutes(list => list.filter(r => r.id !== id)) }
    function removeStop(routeId, stopId) { setRoutes(list => list.map(r => r.id !== routeId ? r : { ...r, stops: r.stops.filter(s => s.id !== stopId) })) }

    const filteredStudents = useMemo(() => {
        const t = qStudent.trim().toLowerCase(); if (!t) return students
        return students.filter(s => (
            String(s.name || '').toLowerCase().includes(t) ||
            String(s.rollNo || '').toLowerCase().includes(t) ||
            String(s.class || '').toLowerCase().includes(t)
        ))
    }, [students, qStudent])

    function calcRouteFee(route, student) {
        if (!route) return 0
        const base = Number(route.feeByClass[String(student.class || '')] || 0)
        return base
    }

    // Prefill feeAmount in allocation form when route/student/bus changes
    useEffect(() => {
        const { routeId, studentId, busId, feeAmount } = allocForm
        if (!routeId) return
        if (feeAmount !== '' && feeAmount !== null) return // don't override if user already entered
        const route = routes.find(r => r.id === routeId)
        const st = students.find(s => String(s._id) === String(studentId)) || { class: '' }
        const bus = buses.find(b => b.id === (busId || route?.busId))
        const busFee = Number(bus?.fee || 0)
        const routeFee = calcRouteFee(route, st)
        const pre = busFee || routeFee || ''
        setAllocForm(f => ({ ...f, feeAmount: pre === '' ? '' : String(pre) }))
    }, [allocForm.routeId, allocForm.studentId, allocForm.busId, routes, students, buses])

    async function allocateTransport() {
        const st = students.find(s => String(s._id) === String(allocForm.studentId))
        if (!st) return alert('Select student')
        const route = routes.find(r => r.id === allocForm.routeId)
        if (!route) return alert('Select route')
        const stop = route.stops.find(s => s.id === allocForm.stopId)
        if (!stop) return alert('Select stop')
        const bus = buses.find(b => b.id === route.busId)
        if (!bus) return alert('Please assign a bus to the route')

        const seatNo = Number(allocForm.seatNo || 0)
        if (seatNo < 1 || seatNo > bus.seats) return alert('Seat number invalid for this bus')

        // Basic seat occupancy check (backend will also check)
        const occupied = allocations.some(a => a.busId === bus.id && Number(a.seatNo) === seatNo)
        if (occupied) return alert('Seat already allocated')

        let amount = 0
        if (allocForm.feeAmount !== '' && allocForm.feeAmount != null) {
            amount = Number(allocForm.feeAmount || 0)
        }
        if (!amount) {
            const busFee = Number(buses.find(b => b.id === bus.id)?.fee || 0)
            amount = busFee || calcRouteFee(route, st)
        }
        const payload = {
            when: Date.now(),
            student: { id: st._id, name: st.name, email: st.email || '', rollNo: st.rollNo || '', class: st.class || '' },
            routeId: route.id, stopId: stop.id, busId: bus.id,
            routeName: route.name,
            stopName: stop.name,
            busName: bus.name,
            seatNo,
            fee: { amount, option: allocForm.option },
        }
        try {
            await createTransportAllocation(payload, token)
            alert(`Allocated seat ${seatNo} on ${bus.name} for ${st.name} at stop ${stop.name}. Fee: ₹${amount}.`)
            setAllocForm(f => ({ ...f, seatNo: '' }))
            loadAllocations()
        } catch (e) {
            alert('Failed to allocate: ' + (e.message || 'Unknown error'))
        }
    }

    return (
        <AdminLayout title="Transport Management">
            <div style={{ padding: 20, display: 'grid', gap: 16 }}>
                {/* Create Bus */}
                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Create Bus</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 8 }}>
                        <input placeholder="Bus name" value={newBus.name} onChange={e => setNewBus({ ...newBus, name: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input placeholder="Number plate" value={newBus.numberPlate} onChange={e => setNewBus({ ...newBus, numberPlate: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input type="number" placeholder="Seats" value={newBus.seats} onChange={e => setNewBus({ ...newBus, seats: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input placeholder="Driver name" value={newBus.driverName} onChange={e => setNewBus({ ...newBus, driverName: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input placeholder="Helper name" value={newBus.helperName} onChange={e => setNewBus({ ...newBus, helperName: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input type="number" placeholder="Default fee (₹)" value={newBus.fee} onChange={e => setNewBus({ ...newBus, fee: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                    </div>
                    <button style={{ marginTop: 10 }} onClick={addBus}>Add Bus</button>
                </section>

                {/* Buses List */}
                <section style={{ background: '#f8fafc', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Buses</h3>
                    {!buses.length && <p style={{ color: '#64748b' }}>No buses yet.</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10, marginTop: 8 }}>
                        {buses.map(b => (
                            <div key={b.id} style={{ border: '2px solid #0ea5e9', borderRadius: 12, padding: 12 }}>
                                <div style={{ fontWeight: 600 }}>{b.name} ({b.numberPlate || '—'})</div>
                                <div>Seats: {b.seats}</div>
                                <div>Driver: {b.driverName || '—'} | Helper: {b.helperName || '—'}</div>
                                <div>Fee: ₹{Number(b.fee || 0)}</div>
                                <button style={{ marginTop: 8 }} onClick={() => removeBus(b.id)}>Remove</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Create Route */}
                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Create Route</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                        <input placeholder="Route name" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <select value={newRoute.busId} onChange={e => setNewRoute({ ...newRoute, busId: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="">Assign bus</option>
                            {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <input placeholder="Stop name" value={newRoute.stopName} onChange={e => setNewRoute({ ...newRoute, stopName: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                        <input placeholder="Stop time (e.g., 07:30)" value={newRoute.stopTime} onChange={e => setNewRoute({ ...newRoute, stopTime: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={addRoute}>Add Route</button>
                        {/* Add first stop to the last created route for convenience */}
                        {routes.length > 0 && <button onClick={() => addStop(routes[routes.length - 1].id)}>Add Stop to last route</button>}
                    </div>
                </section>

                {/* Routes List */}
                <section style={{ background: '#f8fafc', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Routes</h3>
                    {!routes.length && <p style={{ color: '#64748b' }}>No routes yet.</p>}
                    {routes.map(r => (
                        <details key={r.id} style={{ marginTop: 10 }}>
                            <summary style={{ cursor: 'pointer' }}>
                                {r.name} — Bus: {buses.find(b => b.id === r.busId)?.name || 'Unassigned'}
                                <button style={{ marginLeft: 8 }} onClick={e => { e.preventDefault(); removeRoute(r.id) }}>Remove</button>
                            </summary>
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <select value={r.busId} onChange={e => assignBusToRoute(r.id, e.target.value)} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                                        <option value="">Assign bus</option>
                                        {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <input placeholder="Stop name" value={newRoute.stopName} onChange={e => setNewRoute({ ...newRoute, stopName: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                                    <input placeholder="Stop time" value={newRoute.stopTime} onChange={e => setNewRoute({ ...newRoute, stopTime: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                                    <button onClick={() => addStop(r.id)}>Add Stop</button>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <label>Class-wise transport fee:</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                        <select value={routeFeeClass.class} onChange={e => setRouteFeeClass({ ...routeFeeClass, class: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '6px 8px' }}>
                                            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(cls => (
                                                <option key={cls} value={cls}>Class {cls}</option>
                                            ))}
                                        </select>
                                        <input type="number" placeholder="Amount" value={routeFeeClass.amount} onChange={e => setRouteFeeClass({ ...routeFeeClass, amount: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '6px 8px' }} />
                                        <button onClick={() => setRouteFee(r.id)}>Set Fee</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 6 }}>
                                        {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(cls => (
                                            <div key={cls} style={{ border: '1px dashed #0ea5e9', borderRadius: 8, padding: 6 }}>
                                                <small>Class {cls}</small>
                                                <div>₹{Number(r.feeByClass[cls] || 0)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <strong>Stops</strong>
                                    {!r.stops.length && <p style={{ color: '#64748b' }}>No stops added.</p>}
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {r.stops.map(s => (
                                            <li key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                                <span style={{ border: '2px solid #3b82f6', borderRadius: 8, padding: '4px 8px' }}>{s.name}</span>
                                                <span style={{ color: '#475569' }}>{s.time}</span>
                                                <button onClick={() => removeStop(r.id, s.id)}>Remove</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </details>
                    ))}
                </section>

                {/* Allocate Student to Transport */}
                <section style={{ background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Allocate Student</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginTop: 8 }}>
                        <select value={allocForm.busId} onChange={e => setAllocForm({ ...allocForm, busId: e.target.value, routeId: '', stopId: '' })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="">Select bus</option>
                            {buses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.numberPlate || '—'})</option>)}
                        </select>

                        <select value={allocForm.routeId} onChange={e => setAllocForm({ ...allocForm, routeId: e.target.value, stopId: '' })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="">Select route</option>
                            {routes.filter(r => !allocForm.busId || r.busId === allocForm.busId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>

                        <select value={allocForm.stopId} onChange={e => setAllocForm({ ...allocForm, stopId: e.target.value })} disabled={!allocForm.routeId} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="">{allocForm.routeId ? 'Select stop' : 'Select route first'}</option>
                            {(() => {
                                const selectedRoute = routes.find(r => r.id === allocForm.routeId);
                                if (!selectedRoute) return null;
                                if (!Array.isArray(selectedRoute.stops) || selectedRoute.stops.length === 0) {
                                    return <option value="" disabled>No stops defined for this route</option>
                                }
                                return selectedRoute.stops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.time})</option>);
                            })()}
                        </select>
                        {allocForm.routeId && (() => {
                            const selectedRoute = routes.find(r => r.id === allocForm.routeId) || { stops: [] }
                            if (!Array.isArray(selectedRoute.stops) || selectedRoute.stops.length === 0) return <div style={{ gridColumn: '1 / -1', color: '#b91c1c', fontSize: 13 }}>No stops added for selected route — add stops in the Routes section above.</div>
                            return null
                        })()}

                        <input type="number" placeholder="Seat no" value={allocForm.seatNo} onChange={e => setAllocForm({ ...allocForm, seatNo: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />

                        <select value={allocForm.studentId} onChange={e => setAllocForm({ ...allocForm, studentId: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="">Select student</option>
                            {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollNo || '—'})</option>)}
                        </select>

                        <select value={allocForm.option} onChange={e => setAllocForm({ ...allocForm, option: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }}>
                            <option value="add-to-fee">Add to fee</option>
                            <option value="pay-now">Pay and take</option>
                        </select>
                        <input type="number" placeholder="Fee amount (₹)" value={allocForm.feeAmount} onChange={e => setAllocForm({ ...allocForm, feeAmount: e.target.value })} style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px' }} />
                    </div>
                    <button style={{ marginTop: 10 }} onClick={allocateTransport} disabled={loadingStudents}>Allocate</button>
                </section>

                {/* Allocations */}
                <section style={{ background: '#f8fafc', border: '2px solid #000', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: 0 }}>Allocations</h3>
                    {!allocations.length && <p style={{ color: '#64748b' }}>No allocations yet.</p>}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student</th>
                                    <th>Route / Stop</th>
                                    <th>Bus / Seat</th>
                                    <th>Fee</th>
                                    <th>Option</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allocations.map((a, idx) => {
                                    const route = routes.find(r => r.id === a.routeId)
                                    const stop = route?.stops?.find(s => s.id === a.stopId)
                                    const bus = buses.find(b => b.id === a.busId)
                                    const pdf = String(a.receiptPdfUrl || '')
                                    const full = pdf.startsWith('http') || pdf.startsWith('//') ? pdf : (API_BASE ? `${API_BASE}${pdf}` : pdf)
                                    return (
                                        <tr key={a._id || a.id || `${a.routeId}-${a.when}-${idx}`}>
                                            <td>{new Date(a.when).toLocaleString()}</td>
                                            <td>{a.student?.name} ({a.student?.rollNo}) — Class {a.student?.class}</td>
                                            <td>{a.routeName || route?.name || '—'} / {a.stopName || stop?.name || '—'}</td>
                                            <td>{a.busName || bus?.name || '—'} / Seat {a.seatNo}</td>
                                            <td>₹{a.fee?.amount}</td>
                                            <td>{a.fee?.option === 'add-to-fee' ? 'Add to fee' : 'Pay and take'}</td>
                                            <td>
                                                {a.paid ? <span style={{ color: 'green' }}>Paid</span> : <span style={{ color: '#b91c1c' }}>Not paid</span>}
                                                {a.paid && a.receiptPdfUrl && (
                                                    <a href={full} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#2563eb' }}>Download receipt</a>
                                                )}
                                                {!a.paid && a.fee && String(a.fee.option) === 'pay-now' && (
                                                    <button onClick={async () => { try { setAdminPaying(true); await handleAdminPay(a) } catch (e) { console.warn(e) } finally { setAdminPaying(false) } }} disabled={adminPaying} style={{ marginLeft: 8, border: '2px solid #000', borderRadius: 8, padding: '6px 10px', background: '#22c55e', color: '#fff' }}>Pay Now</button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    )
}
