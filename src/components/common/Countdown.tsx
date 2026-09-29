import { useCountdown } from '@/hooks/useCountdown';

interface CountdownProps {
  targetDate: string | Date;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'text-2xl sm:text-3xl',
  md: 'text-4xl sm:text-5xl',
  lg: 'text-6xl sm:text-7xl lg:text-8xl',
  xl: 'text-7xl sm:text-8xl lg:text-9xl',
};

const labelSize = {
  sm: 'text-[9px]',
  md: 'text-[10px]',
  lg: 'text-xs',
  xl: 'text-xs sm:text-sm',
};

export default function Countdown({ targetDate, className = '', size = 'lg' }: CountdownProps) {
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate);

  if (expired) {
    return (
      <div className={`font-display ${sizeClasses[size]} text-lime tracking-tight ${className}`}>
        AVAILABLE NOW
      </div>
    );
  }

  const units = [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINUTES' },
    { value: seconds, label: 'SECONDS' },
  ];

  return (
    <div className={`flex items-baseline gap-3 sm:gap-6 lg:gap-8 ${className}`}>
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-baseline gap-3 sm:gap-6 lg:gap-8">
          <div className="flex flex-col items-center">
            <span className={`font-display ${sizeClasses[size]} text-bone tabular-nums tracking-tight`}>
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className={`${labelSize[size]} tracking-widest2 uppercase text-bone-muted mt-2`}>
              {unit.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className={`font-display ${sizeClasses[size]} text-bone-muted/30`}>
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
