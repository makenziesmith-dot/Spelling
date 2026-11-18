import React from 'react';

interface ConfettiBurstProps {
  triggerKey: number;
  pointsLabel?: string;
}

const PARTICLES = [
  { left: '12%', delay: '0ms', color: '#FACC15', shape: 'star' },
  { left: '24%', delay: '40ms', color: '#22C55E', shape: 'circle' },
  { left: '36%', delay: '20ms', color: '#F97316', shape: 'rect' },
  { left: '48%', delay: '60ms', color: '#0EA5E9', shape: 'star' },
  { left: '60%', delay: '10ms', color: '#FACC15', shape: 'circle' },
  { left: '72%', delay: '50ms', color: '#EC4899', shape: 'rect' },
  { left: '84%', delay: '30ms', color: '#22C55E', shape: 'star' },
  { left: '90%', delay: '70ms', color: '#6366F1', shape: 'circle' },
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ triggerKey, pointsLabel }) => {
  if (triggerKey <= 0) return null;

  return (
    <div
      key={triggerKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-2 flex justify-center overflow-visible z-20"
    >
      <div className="relative w-full max-w-md h-24">
        {PARTICLES.map((p, idx) => (
          <span
            key={idx}
            className="absolute top-0 animate-confetti"
            style={{
              left: p.left,
              animationDelay: p.delay,
            }}
          >
            {p.shape === 'star' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={p.color}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ) : p.shape === 'circle' ? (
              <span
                className="block w-3 h-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
            ) : (
              <span
                className="block w-3 h-2 rounded-xs"
                style={{ backgroundColor: p.color }}
              />
            )}
          </span>
        ))}

        {pointsLabel && (
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="animate-float-up inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-amber-400 text-slate-900 font-display font-bold text-base border-2 border-amber-500 shadow-sm">
              {pointsLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
