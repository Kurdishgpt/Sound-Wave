export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#23272a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        textAlign: 'center',
        padding: '48px 64px',
        background: '#2c2f33',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Discord-style bot avatar placeholder */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#5865f2',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
        }}>
          🎵
        </div>

        {/* Bot name */}
        <h1 style={{
          color: '#ffffff',
          fontSize: 28,
          fontWeight: 700,
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Adventurix
        </h1>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#1e2124',
          borderRadius: 999,
          padding: '6px 16px',
          marginTop: 12,
        }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#3ba55c',
            display: 'inline-block',
            boxShadow: '0 0 0 0 rgba(59,165,92,0.6)',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ color: '#3ba55c', fontSize: 14, fontWeight: 600 }}>
            Online
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          color: '#b9bbbe',
          fontSize: 14,
          marginTop: 20,
          marginBottom: 0,
        }}>
          Discord music bot · Active and ready
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(59,165,92,0.6); }
          70%  { box-shadow: 0 0 0 8px rgba(59,165,92,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,165,92,0); }
        }
      `}</style>
    </div>
  );
}
