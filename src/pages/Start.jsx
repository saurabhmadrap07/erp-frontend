import React, { useEffect, useState } from 'react'
import './Start.css'
import './Auth.css'
import { FaUserShield, FaChalkboardTeacher, FaUserGraduate, FaUserFriends, FaUserTie, FaUser } from 'react-icons/fa'
import { getIdCardByCode, API_BASE, postContactQuery } from '../api'
import { getGallery } from '../api'
import { toast } from 'react-toastify'

export default function Start() {
    const [verifyCode, setVerifyCode] = useState('')
    const [verifyResult, setVerifyResult] = useState(null)
    const [verifyError, setVerifyError] = useState('')
    const [contactOpen, setContactOpen] = useState(false)
    const [contactForm, setContactForm] = useState({ name: '', email: '', contact: '', description: '', file: null })
    const [contactSubmitting, setContactSubmitting] = useState(false)
    const contactFileRef = React.createRef()

    async function verifyIdCard(e) {
        e.preventDefault()
        setVerifyError(''); setVerifyResult(null)
        if (!verifyCode.trim()) { setVerifyError('Enter ID card code'); return }
        try {
            const card = await getIdCardByCode(verifyCode.trim())
            setVerifyResult(card || null)
        } catch (err) {
            setVerifyError(err.message || 'Invalid code')
        }
    }
    return (
        <div className="start-root">
            <header className="start-header">
                <div className="logo-edge">ERP</div>
                <div className="header-right">
                    <button className="contact-btn" onClick={() => setContactOpen(true)}>Contact</button>
                </div>
            </header>

            <main className="start-main">
                <h2 className="start-title">WELCOME TO SCHOOL MANAGEMENT SYSTEM</h2>

                <div className="card" style={{ maxWidth: 720, margin: '0 auto 16px', padding: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Verify ID Card</h3>
                    <form onSubmit={verifyIdCard} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input className="cm-input" placeholder="Enter ID Code (e.g., IDC_XXXX)" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} />
                        <button className="btn" type="submit">Verify</button>
                    </form>
                    {verifyError && <div className="error" style={{ marginTop: 8 }}>{verifyError}</div>}
                    {verifyResult && (() => {
                        const prefixType = verifyResult?.idCode?.startsWith('IDF_') ? 'faculty' : (verifyResult?.idCode?.startsWith('IDS_') ? 'staff' : 'student')
                        const resolvedType = (verifyResult.type || prefixType)
                        const label = resolvedType ? (resolvedType.charAt(0).toUpperCase() + resolvedType.slice(1)) : '-'
                        let rawUrl = verifyResult && verifyResult.photoUrl ? String(verifyResult.photoUrl) : ''
                        if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('/')) rawUrl = '/' + rawUrl
                        const absoluteUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${API_BASE || ''}${rawUrl}`) : ''
                        const imgSrc = absoluteUrl || '/default-avatar.svg'
                        return (
                            <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                                <img src={imgSrc} alt="Photo" style={{ width: 96, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                <div>
                                    <div><strong>Type:</strong> {label}</div>
                                    <div><strong>Name:</strong> {verifyResult.name}</div>
                                    {resolvedType === 'student' ? (
                                        <>
                                            <div><strong>Class:</strong> {verifyResult.class} {verifyResult.section}</div>
                                            <div><strong>Roll No:</strong> {verifyResult.rollNo}</div>
                                            <div><strong>House:</strong> {verifyResult.house || '-'}</div>
                                            <div><strong>House Role:</strong> {verifyResult.houseRole || '-'}</div>
                                        </>
                                    ) : (
                                        <div><strong>ID:</strong> {verifyResult.rollNo}</div>
                                    )}
                                    <div className="small" style={{ marginTop: 6 }}><strong>ID Code:</strong> {verifyResult.idCode}</div>
                                    <div className="small"><strong>Valid Upto:</strong> {verifyResult.validUpto ? new Date(verifyResult.validUpto).toLocaleDateString() : '-'}</div>
                                </div>
                            </div>
                        )
                    })()}
                </div>

                <div style={{ maxWidth: 980, margin: '18px auto' }}>
                    <GalleryGrid filterLabel={'Gallery'} showLabel={false} large={true} />
                </div>

                <div className="panels">
                    <div className="panel admin">
                        <div className="panel-icon" aria-hidden>
                            <FaUserShield />
                        </div>
                        <h3>Admin Panel</h3>
                        <p>Access administrative tools: manage users, settings and reports.</p>
                        <a
                            className="panel-btn"
                            href="/admin-login"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/admin-login')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            Login
                        </a>
                    </div>

                    <div className="panel faculty">
                        <div className="panel-icon" aria-hidden>
                            <FaChalkboardTeacher />
                        </div>
                        <h3>Faculty Panel</h3>
                        <p>Teacher tools: class management, attendance and grading.</p>
                        <a
                            className="panel-btn"
                            href="/faculty-login"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/faculty-login')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            Login
                        </a>
                    </div>

                    <div className="panel student">
                        <div className="panel-icon" aria-hidden>
                            <FaUserGraduate />
                        </div>
                        <h3>Student Panel</h3>
                        <p>Student dashboard: timetable, assignments and results.</p>
                        <a
                            className="panel-btn"
                            href="/student-login"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/student-login')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            Login
                        </a>
                    </div>

                    <div className="panel parents">
                        <div className="panel-icon" aria-hidden>
                            <FaUserFriends />
                        </div>
                        <h3>Parents Panel</h3>
                        <p>Parent access: view student progress, notices and communication tools.</p>
                        <a
                            className="panel-btn"
                            href="/parents-login"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/parents-login')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            Login
                        </a>
                    </div>

                    <div className="panel staff">
                        <div className="panel-icon" aria-hidden>
                            <FaUserTie />
                        </div>
                        <h3>Staff Panel</h3>
                        <p>Office staff access: receipts, notices and records.</p>
                        <a
                            className="panel-btn"
                            href="/staff-login"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/staff-login')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            Login
                        </a>
                    </div>
                </div>


                {/* Small forms banner above footer with contact info */}
            </main>

            {contactOpen && (
                <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(2,6,23,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ width: 560, maxWidth: '96%', background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 30px 80px rgba(2,6,23,0.28)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800 }}>Contact Us</div>
                                <div style={{ color: '#6b7280', fontSize: 13 }}>Send your query and attach a PDF (optional)</div>
                            </div>
                            <button type="button" onClick={() => setContactOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                        </div>

                        <form onSubmit={async (e) => {
                            try {
                                e.preventDefault()
                                setContactSubmitting(true)
                                // validation
                                if (!contactForm.name || !contactForm.email || !contactForm.contact || !contactForm.description) throw new Error('Please fill all required fields')
                                if ((contactForm.description || '').length > 1000) throw new Error('Description must be 1000 characters or less')
                                if (contactForm.file) {
                                    const f = contactForm.file
                                    const max = 500 * 1024 * 1024
                                    if (f.size > max) throw new Error('Attachment must be 500MB or smaller')
                                    if (f.type !== 'application/pdf') throw new Error('Only PDF attachments allowed')
                                }

                                const fd = new FormData()
                                fd.append('name', contactForm.name)
                                fd.append('email', contactForm.email)
                                fd.append('contact', contactForm.contact)
                                fd.append('description', contactForm.description)
                                if (contactForm.file) fd.append('attachment', contactForm.file)

                                await postContactQuery(fd)
                                toast.success('Query submitted — admin will review it')
                                setContactOpen(false)
                                setContactForm({ name: '', email: '', contact: '', description: '', file: null })
                                if (contactFileRef && contactFileRef.current) contactFileRef.current.value = null
                            } catch (err) {
                                console.error(err)
                                toast.error(err?.message || 'Submission failed')
                            } finally { setContactSubmitting(false) }
                        }} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                            <label style={{ fontSize: 13 }}>Name *</label>
                            <input name="name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            <label style={{ fontSize: 13 }}>Email *</label>
                            <input name="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} type="email" required style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            <label style={{ fontSize: 13 }}>Mobile No *</label>
                            <input name="contact" value={contactForm.contact} onChange={e => setContactForm({ ...contactForm, contact: e.target.value })} required style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            <label style={{ fontSize: 13 }}>Attachment (PDF, optional — max 500MB)</label>
                            <input name="attachment" ref={contactFileRef} onChange={e => setContactForm({ ...contactForm, file: e.target.files && e.target.files[0] })} type="file" accept="application/pdf,.pdf" />
                            <label style={{ fontSize: 13 }}>Description * (max 1000 chars)</label>
                            <textarea name="description" value={contactForm.description} onChange={e => setContactForm({ ...contactForm, description: e.target.value })} rows={6} maxLength={1000} required style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                                <button type="button" onClick={() => setContactOpen(false)} style={{ padding: '8px 12px', borderRadius: 8, background: '#eef2ff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={contactSubmitting} style={{ padding: '8px 14px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>{contactSubmitting ? 'Submitting…' : 'Submit'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="start-forms-banner">
                <div className="start-forms-inner">
                    <div className="start-forms-left">
                        <div className="start-forms-brand">ERP — School Management</div>
                        <div className="start-forms-desc">Reliable, secure, and easy-to-use school management platform — manage students, staff, finances and communications.</div>
                        <div className="start-forms-contact">Contact: <a href="tel:6378452145">6378452145</a> • Email: <a href="mailto:erp@creator">erp@creator</a></div>
                    </div>
                    <div className="start-forms-right">
                        <a className="start-forms-cta" href="/forms" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/forms'); window.dispatchEvent(new PopStateEvent('popstate')) }}>View Forms</a>
                    </div>
                </div>
            </div>

            <footer className="start-footer">©2025 ERP</footer>
        </div>
    )
}

function GalleryGrid({ filterLabel, showLabel = true, large = false }) {
    const [items, setItems] = useState([])
    useEffect(() => { fetchIt() }, [])
    async function fetchIt() {
        try { const g = await getGallery(); setItems(g || []) } catch (e) { console.warn('gallery', e) }
    }
    if (!items || items.length === 0) return <div className="card" style={{ padding: 12 }}>No gallery items</div>
    // If a filterLabel provided, try to show that gallery only (case-insensitive)
    const target = filterLabel ? (items.find(it => String(it.label || '').toLowerCase() === String(filterLabel || '').toLowerCase())) : null
    const toRender = target ? [target] : items
    // If large view is requested, flatten images from the target gallery (or all) and render a full-width carousel
    if (large) {
        const gallery = toRender[0]
        const images = (gallery && gallery.images) ? gallery.images.map(im => {
            const raw = im && im.url ? String(im.url) : ''
            const src = raw && (raw.startsWith('http://') || raw.startsWith('https://')) ? raw : (raw && raw.startsWith('/') ? `${API_BASE}${raw}` : (im && im.filename ? `${API_BASE}/uploads/${im.filename}` : raw))
            return { src, alt: im.originalname || '', id: im.filename || im._id }
        }) : []

        return <CarouselWithAutoplay images={images} />
    }

    return (
        <div className={`gallery-grid ${large ? 'start-large' : ''}`}>
            {toRender.map(it => (
                <div key={it._id} className={`gallery-card ${large ? 'large' : ''}`}>
                    {showLabel && <div className="gallery-label">{it.label}</div>}
                    <div className="gallery-images">
                        {(it.images || []).map((im, idx) => {
                            const raw = im && im.url ? String(im.url) : ''
                            const src = raw && (raw.startsWith('http://') || raw.startsWith('https://')) ? raw : (raw && raw.startsWith('/') ? `${API_BASE}${raw}` : (im && im.filename ? `${API_BASE}/uploads/${im.filename}` : raw))
                            return <img key={idx} className={large ? 'gallery-img large' : 'gallery-img'} src={src} alt={im.originalname || ''} />
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

function Carousel({ images = [] }) {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)

    if (!images || images.length === 0) return null

    function prev() {
        setIndex(i => (i - 1 + images.length) % images.length)
    }
    function next() {
        setIndex(i => (i + 1) % images.length)
    }

    // Clicking the image advances to next
    return (
        <div className="start-carousel">
            <button className="carousel-nav left" onClick={prev} aria-label="Previous">‹</button>
            <div className="carousel-view" onClick={next} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <img className="carousel-image" src={images[index].src} alt={images[index].alt} />
            </div>
            <button className="carousel-nav right" onClick={next} aria-label="Next">›</button>
            <div className="carousel-dots">
                {images.map((_, i) => (
                    <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Go to ${i + 1}`} />
                ))}
            </div>
        </div>
    )
}

// Add autoplay behaviour outside to allow auto sliding
function useCarouselAutoplay({ index, setIndex, length, paused }) {
    useEffect(() => {
        if (paused) return
        const t = setInterval(() => {
            setIndex(i => (i + 1) % length)
        }, 3000)
        return () => clearInterval(t)
    }, [paused, setIndex, length])
}

// Wrap Carousel to inject autoplay
function CarouselWithAutoplay(props) {
    const { images = [] } = props
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    useCarouselAutoplay({ index, setIndex, length: images.length, paused })
    if (!images || images.length === 0) return null
    function prev() { setIndex(i => (i - 1 + images.length) % images.length) }
    function next() { setIndex(i => (i + 1) % images.length) }
    return (
        <div className="start-carousel">
            <button className="carousel-nav left" onClick={prev} aria-label="Previous">‹</button>
            <div className="carousel-view" onClick={next} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <img className="carousel-image" src={images[index].src} alt={images[index].alt} />
            </div>
            <button className="carousel-nav right" onClick={next} aria-label="Next">›</button>
            <div className="carousel-dots">
                {images.map((_, i) => (
                    <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Go to ${i + 1}`} />
                ))}
            </div>
        </div>
    )
}
