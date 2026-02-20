export default function Settings() {
    return (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1 style={{ margin: 0 }}>Settings</h1>
            <p style={{ color: '#8892a4', fontSize: 16, marginTop: 12 }}>
                Configure your Pollster experience.
            </p>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Server Settings */}
                <div
                    style={{
                        padding: 24,
                        background: '#1e2230',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>🌐</span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Server</h3>
                    </div>
                    <p style={{ margin: 0, color: '#8892a4', fontSize: 14 }}>
                        Server configuration and network settings. Coming soon!
                    </p>
                </div>

                {/* Appearance */}
                <div
                    style={{
                        padding: 24,
                        background: '#1e2230',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>🎨</span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Appearance</h3>
                    </div>
                    <p style={{ margin: 0, color: '#8892a4', fontSize: 14 }}>
                        Customize the look and feel of your dashboard. Coming soon!
                    </p>
                </div>

                {/* About */}
                <div
                    style={{
                        padding: 24,
                        background: '#1e2230',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>ℹ️</span>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>About</h3>
                    </div>
                    <p style={{ margin: 0, color: '#8892a4', fontSize: 14 }}>
                        Pollster v1.0.0 — An interactive polling tool for classrooms.
                    </p>
                </div>
            </div>
        </div>
    )
}
