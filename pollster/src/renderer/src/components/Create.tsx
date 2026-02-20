export default function Create() {
    return (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1 style={{ margin: 0 }}>Create</h1>
            <p style={{ color: '#8892a4', fontSize: 16, marginTop: 12 }}>
                Build custom quizzes and polls for your students.
            </p>

            <div
                style={{
                    marginTop: 32,
                    padding: 32,
                    background: '#1e2230',
                    borderRadius: 12,
                    border: '1px dashed rgba(255,255,255,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16
                }}
            >
                <div style={{ fontSize: 48 }}>📝</div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Quiz Builder</h2>
                <p style={{ margin: 0, color: '#8892a4', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>
                    Create multiple-choice questions, set correct answers, and organize your quizzes. Coming
                    soon!
                </p>
                <button
                    disabled
                    style={{
                        marginTop: 8,
                        padding: '10px 24px',
                        background: 'rgba(91,141,239,0.15)',
                        color: '#5b8def',
                        border: '1px solid rgba(91,141,239,0.3)',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.6
                    }}
                >
                    + New Quiz
                </button>
            </div>
        </div>
    )
}
