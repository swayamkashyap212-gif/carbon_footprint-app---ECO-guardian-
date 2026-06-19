export default function EarthPulse() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Orbital ring */}
      <div
        className="absolute rounded-full border-2 border-dashed"
        style={{
          width: 160,
          height: 160,
          borderColor: 'rgba(188, 240, 174, 0.5)',
          animation: 'orbit 8s linear infinite',
        }}
      />

      {/* Earth sphere */}
      <div
        className="relative rounded-full"
        style={{
          width: 100,
          height: 100,
          background: 'linear-gradient(135deg, #154212 0%, #2d5a27 35%, #123c5a 55%, #2d5372 100%)',
          boxShadow: '0 0 40px rgba(21, 66, 18, 0.3), inset -8px -4px 20px rgba(0,0,0,0.25)',
          animation: 'rotate-earth 14s linear infinite, breathe 2.4s ease-in-out infinite',
        }}
      >
        {/* Continents overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse 40% 30% at 35% 45%, rgba(188,240,174,0.5) 0%, transparent 100%), ' +
              'radial-gradient(ellipse 25% 20% at 65% 60%, rgba(195,238,115,0.4) 0%, transparent 100%), ' +
              'radial-gradient(ellipse 20% 25% at 55% 30%, rgba(188,240,174,0.35) 0%, transparent 100%)',
            animation: 'rotate-continents 14s linear infinite reverse',
          }}
        />
        {/* Atmosphere glow */}
        <div
          className="absolute inset-[-3px] rounded-full"
          style={{
            background: 'radial-gradient(circle, transparent 50%, rgba(188,240,174,0.15) 100%)',
          }}
        />
      </div>

      <style>{`
        @keyframes rotate-earth {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes rotate-continents {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
