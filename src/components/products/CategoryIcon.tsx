import {
  Baby,
  Backpack,
  Briefcase,
  Camera,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  Heart,
  Key,
  Layers,
  Leaf,
  Music,
  Package,
  Palette,
  Ribbon,
  Shirt,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Tag,
  Umbrella,
  Users,
  Wallet,
  Watch,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ProductCategoryIcon } from '@/types';

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function strokeProps({ size = 16, className, strokeWidth = 1.75 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  };
}

function PantsIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M8 3h8l1 7v11h-4.5l-.5-9h-1l-.5 9H7V10L8 3z" />
      <path d="M8 3h8" />
    </svg>
  );
}

function ShortsIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M7 4h10l1 6-3 5H9L6 10 7 4z" />
      <path d="M7 4h10" />
      <path d="M12 4v6" />
    </svg>
  );
}

function HatIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M4 14c0-4 3.5-7 8-7s8 3 8 7" />
      <path d="M3 14h18" />
      <path d="M8 7.5c1-.8 2.2-1.2 4-1.2s3 .4 4 1.2" />
    </svg>
  );
}

function ScarfIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M9 3h6v5a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V3z" />
      <path d="M9 8v13" />
      <path d="M15 8v13" />
      <path d="M9 14h2" />
      <path d="M13 18h2" />
    </svg>
  );
}

function DressIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M9 3h6l1 4-2 2v2l4 10H6l4-10V9L8 7l1-4z" />
      <path d="M10 3v2" />
      <path d="M14 3v2" />
    </svg>
  );
}

function HoodieIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M8 8a4 4 0 0 1 8 0v2l3 3v8H5v-8l3-3V8z" />
      <path d="M9 21v-5a3 3 0 0 1 6 0v5" />
      <path d="M10 9h4" />
    </svg>
  );
}

function SocksIcon(props: IconProps) {
  return (
    <svg {...strokeProps(props)}>
      <path d="M10 3h4v9l2 2a3 3 0 1 1-4.2 4.2L10 16V3z" />
      <path d="M10 8h4" />
    </svg>
  );
}

const lucideMap: Record<string, LucideIcon> = {
  shirt: Shirt,
  undershirt: Layers,
  footprints: Footprints,
  watch: Watch,
  glasses: Glasses,
  gem: Gem,
  bag: ShoppingBag,
  backpack: Backpack,
  wallet: Wallet,
  umbrella: Umbrella,
  crown: Crown,
  ribbon: Ribbon,
  key: Key,
  tag: Tag,
  sparkles: Sparkles,
  package: Package,
  gift: Gift,
  heart: Heart,
  star: Star,
  zap: Zap,
  flame: Flame,
  dumbbell: Dumbbell,
  palette: Palette,
  camera: Camera,
  music: Music,
  gamepad: Gamepad2,
  baby: Baby,
  users: Users,
  briefcase: Briefcase,
  leaf: Leaf,
  snowflake: Snowflake,
  sun: Sun,
};

const customMap: Record<string, (props: IconProps) => ReturnType<typeof PantsIcon>> = {
  pants: PantsIcon,
  shorts: ShortsIcon,
  hat: HatIcon,
  scarf: ScarfIcon,
  dress: DressIcon,
  hoodie: HoodieIcon,
  socks: SocksIcon,
};

export default function CategoryIcon({
  name,
  size = 16,
  className,
  strokeWidth = 1.75,
}: {
  name: ProductCategoryIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Custom = customMap[name];
  if (Custom) {
    return <Custom size={size} className={className} strokeWidth={strokeWidth} />;
  }

  const Lucide = lucideMap[name] ?? Tag;
  return <Lucide size={size} className={className} strokeWidth={strokeWidth} />;
}
