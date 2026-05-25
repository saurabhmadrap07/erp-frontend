import React, { useState, useEffect } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import './Events.css'
import { getAuth } from '../utils/session'
import { getEvents, postEvent } from '../api'

export default function Events() {
    const [open, setOpen] = useState(false)
    const [current, setCurrent] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1)
    })
    const [events, setEvents] = useState({})
    const [formDate, setFormDate] = useState('')
    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const { token } = getAuth()
                const items = await getEvents()
                // transform array of events into map keyed by yyyy-mm-dd
                const map = {}
                    ; (items || []).forEach((ev, idx) => {
                        const d = new Date(ev.date)
                        const y = d.getFullYear()
                        const m = String(d.getMonth() + 1).padStart(2, '0')
                        const day = String(d.getDate()).padStart(2, '0')
                        const key = `${y}-${m}-${day}`
                        const entry = { title: ev.title, desc: ev.description || '', color: ['blue', 'purple', 'green', 'orange'][idx % 4], id: ev._id }
                        map[key] = map[key] ? [...map[key], entry] : [entry]
                    })
                setEvents(map)
            } catch (e) {
                console.warn('Failed to load events from server', e)
            }
        }
        load()
    }, [])

    function openModal(dateKey) {
        setFormDate(dateKeyToDisplay(dateKey || null))
        setTitle('')
        setDesc('')
        setOpen(true)
    }

    function closeModal() { setOpen(false); setFormDate(''); setTitle(''); setDesc('') }

    function prevMonth() { setCurrent(c => new Date(c.getFullYear(), c.getMonth() - 1, 1)) }
    function nextMonth() { setCurrent(c => new Date(c.getFullYear(), c.getMonth() + 1, 1)) }
    function gotoToday() { const d = new Date(); setCurrent(new Date(d.getFullYear(), d.getMonth(), 1)) }

    function monthTitle(d) {
        return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    }

    function daysMatrix(d) {
        const year = d.getFullYear(), month = d.getMonth()
        const firstDay = new Date(year, month, 1)
        const startWeekday = firstDay.getDay() // 0..6 (Sun..Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const prevDays = startWeekday // number of days to take from previous month
        const prevMonthLast = new Date(year, month, 0).getDate()

        const cells = []
        // previous month tail
        for (let i = prevMonthLast - prevDays + 1; i <= prevMonthLast; i++) {
            const date = new Date(year, month - 1, i)
            cells.push({ date, inMonth: false })
        }
        // current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i)
            cells.push({ date, inMonth: true })
        }
        // next month fill
        let next = 1
        while (cells.length < 42) {
            const date = new Date(year, month + 1, next++)
            cells.push({ date, inMonth: false })
        }
        return cells
    }

    function dateKey(d) {
        if (!d) return ''
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    function dateKeyToDisplay(key) {
        if (!key) return ''
        const [y, m, d] = key.split('-')
        return `${d}/${m}/${y}`
    }

    function parseDisplayToKey(s) {
        // expect dd/mm/yyyy
        if (!s) return ''
        const parts = s.split('/')
        if (parts.length !== 3) return ''
        const [d, m, y] = parts
        if (!d || !m || !y) return ''
        return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    async function saveEvent() {
        const key = parseDisplayToKey(formDate)
        if (!key) return alert('Please provide a valid date in dd/mm/yyyy')
        const colors = ['blue', 'purple', 'green', 'orange']
        const ev = { title: title || '(no title)', description: desc || '', date: new Date(`${key}T00:00:00Z`) };
        try {
            const { token } = getAuth()
            await postEvent(ev, token)
            // reload events from server
            const items = await getEvents()
            const map = {}
                ; (items || []).forEach((e, idx) => {
                    const d = new Date(e.date)
                    const y = d.getFullYear()
                    const m = String(d.getMonth() + 1).padStart(2, '0')
                    const day = String(d.getDate()).padStart(2, '0')
                    const k = `${y}-${m}-${day}`
                    const entry = { title: e.title, desc: e.description || '', color: ['blue', 'purple', 'green', 'orange'][idx % 4], id: e._id }
                    map[k] = map[k] ? [...map[k], entry] : [entry]
                })
            setEvents(map)
            closeModal()
        } catch (err) {
            console.error('Failed to save event', err)
            alert('Failed to save event: ' + (err.message || 'server error'))
        }
    }

    const cells = daysMatrix(current)

    return (
        <AdminLayout title="Events">
            <div className="events-page">
                <header className="events-header">
                    <h1 className="page-title"><span className="icon">📅</span> Admin Event Calendar</h1>
                    <div className="controls">
                        <button className="ctrl today" onClick={gotoToday}>today</button>
                        <button className="ctrl nav" onClick={prevMonth}>&lt;</button>
                        <button className="ctrl nav" onClick={nextMonth}>&gt;</button>
                        <button className="btn-add" onClick={() => openModal(dateKey(new Date()))}>+ Add Event</button>
                    </div>
                </header>

                <section className="calendar-panel">
                    <div className="calendar-header">
                        <div className="month-title">{monthTitle(current)}</div>
                    </div>
                    <div className="calendar">
                        <div className="cal-weeknames">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => <div key={w} className="cal-weekname">{w}</div>)}
                        </div>
                        <div className="cal-grid">
                            {cells.map((cell, i) => {
                                const key = dateKey(cell.date)
                                const dayNum = cell.date.getDate()
                                const cellEvents = events[key] || []
                                const todayKey = dateKey(new Date())
                                const isToday = key === todayKey
                                // If the cell has events, add a has-events class and a color class based on the first event
                                const hasEvents = cellEvents.length > 0
                                const primaryColor = hasEvents ? (cellEvents[0].color || '') : ''
                                return (
                                    <div key={i} className={`cal-cell ${cell.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${hasEvents ? `has-events ${primaryColor}` : ''}`} onClick={() => openModal(key)}>
                                        <div className="day-num">{dayNum}</div>
                                        <div className="events-list">
                                            {cellEvents.slice(0, 2).map((ev, idx) => (
                                                <div key={idx} className={`event-pill ${ev.color || 'blue'}`}>{ev.title}</div>
                                            ))}
                                            {cellEvents.length > 2 && <div className="more">+{cellEvents.length - 2}</div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {open && (
                    <div className="modal-backdrop">
                        <div className="modal">
                            <h2 className="modal-title">+ Add New Event</h2>
                            <div className="modal-body">
                                <input value={formDate} onChange={e => setFormDate(e.target.value)} placeholder="dd/mm/yyyy" />
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" />
                                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Event Description" />
                            </div>
                            <div className="modal-actions">
                                <button className="btn cancel" onClick={closeModal}>Cancel</button>
                                <BusyButton className="btn save" asyncAction={saveEvent}>Save</BusyButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
