interface PromotionalBannerSectionProps {
  text: string;
  image: string;
}

export default function PromotionalBannerSection({ text, image }: PromotionalBannerSectionProps) {
  return (
    <section className="relative h-[40vh] lg:h-[50vh] overflow-hidden bg-ink flex items-center justify-center">
      <div className="absolute inset-0">
        <img src={image} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-ink/50" />
      </div>
      <div className="relative z-10 text-center px-4">
        <p className="font-display text-3xl sm:text-5xl lg:text-7xl tracking-tighter text-bone/90 leading-tight">
          {text}
        </p>
      </div>
    </section>
  );
}
