import { useEffect, useState } from 'react';
import type { StaffMember, StaffRole } from '@/types';
import { staffService } from '@/services/staffService';

const roleLabels: Record<StaffRole, string> = {
  owner: 'OWNERS',
  management: 'MANAGEMENT',
  staff: 'STAFF',
};

const roleOrder: StaffRole[] = ['owner', 'management', 'staff'];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    staffService.getPublic().then((s) => {
      setStaff(s);
      setLoading(false);
    });
  }, []);

  const grouped = roleOrder.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role).sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  return (
    <div className="min-h-screen bg-ink pt-16 lg:pt-20">
      {/* Hero */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background giant text */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <p className="font-display text-[35vw] leading-none text-white/[0.015] whitespace-nowrap tracking-tighter select-none">
            PROD.
          </p>
        </div>

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-6 animate-fade-up">
            <span className="w-8 h-px bg-lime" />
            <span className="text-xs tracking-widest2 uppercase text-bone-muted">The Team</span>
          </div>
          <h1 className="font-display text-[14vw] sm:text-[10vw] lg:text-[8vw] leading-[0.85] tracking-tighter text-bone animate-fade-up animate-delay-100">
            THE PEOPLE
          </h1>
          <h1 className="font-display text-[14vw] sm:text-[10vw] lg:text-[8vw] leading-[0.85] tracking-tighter text-bone animate-fade-up animate-delay-200">
            BEHIND PROD.
          </h1>
          <p className="mt-8 max-w-xl text-sm lg:text-base text-bone-muted leading-relaxed animate-fade-up animate-delay-300">
            A dedicated team driven by a shared vision for creativity, quality and community.
          </p>
        </div>
      </section>

      {/* Staff sections */}
      {loading ? (
        <div className="py-24 text-center">
          <p className="text-sm tracking-wider uppercase text-bone-muted">Loading...</p>
        </div>
      ) : (
        <>
          {grouped.map((group) => group.members.length > 0 && (
            <section key={group.role} className="py-12 lg:py-16 border-t border-white/5">
              <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex items-center gap-3 mb-8">
                  <span className="w-8 h-px bg-lime" />
                  <h2 className="text-xs tracking-widest2 uppercase text-bone-muted">
                    {roleLabels[group.role]}
                  </h2>
                  <span className="text-xs text-bone-muted/40 font-mono">
                    {String(group.members.length).padStart(2, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="group relative overflow-hidden bg-ink-surface border border-white/5 hover:border-lime/20 transition-colors"
                      onMouseEnter={() => setHoveredId(member.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-ink-raised">
                        <img
                          src={member.photo}
                          alt={member.name}
                          loading="lazy"
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4 lg:p-5">
                        <h3 className="text-base lg:text-lg font-medium text-bone">
                          {member.name}
                        </h3>
                        <p className="text-xs tracking-wider uppercase text-bone-muted mt-1">
                          {member.position}
                        </p>
                      </div>
                      {/* Bio overlay */}
                      <div
                        className={`absolute inset-0 bg-ink/90 backdrop-blur-sm p-6 flex flex-col justify-end transition-opacity duration-300 ${
                          hoveredId === member.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <h3 className="text-lg font-medium text-bone">{member.name}</h3>
                        <p className="text-xs tracking-wider uppercase text-lime mt-1">{member.position}</p>
                        <p className="mt-3 text-sm text-bone-muted leading-relaxed">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
