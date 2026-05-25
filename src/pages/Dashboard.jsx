import React from 'react'
import './Dashboard.css'

export default function Dashboard() {
    return (
        <div className="dashboard-root">
            <header className="dashboard-header">
                <div className="logo logo-edge">ERP</div>
                <div className="header-inner">
                    <div className="header-actions">
                        <a
                            className="btn-get-started"
                            href="/start"
                            onClick={(e) => {
                                e.preventDefault()
                                window.history.pushState({}, '', '/start')
                                window.dispatchEvent(new PopStateEvent('popstate'))
                            }}
                        >
                            GET STARTED
                        </a>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <h1 className="erp">ERP</h1>
                <h2 className="system">SCHOOL MANAGEMENT SYSTEM</h2>
                <p className="powered">co-powered by ERP</p>
            </main>

            <footer className="dashboard-footer">©2025 ERP</footer>
        </div>
    )
}
