'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface NavTab {
  title: string;
  url: string;
  icon?: React.ReactNode;
}

interface SlidingCapsuleNavProps {
  tabs: NavTab[];
  className?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  layoutId?: string;
  currentTab?: string;
  onChange?: (url: string) => void;
}

export const SlidingCapsuleNav = ({
  tabs,
  className,
  activeTabClassName,
  tabClassName,
  layoutId = 'capsule-nav',
  currentTab,
  onChange,
}: SlidingCapsuleNavProps) => {
  const pathname = usePathname();
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTabId = React.useMemo(() => {
    if (currentTab) return currentTab;
    if (!pathname) return '/';
    const sortedTabs = [...tabs].sort((a, b) => b.url.length - a.url.length);
    return sortedTabs.find((tab) => {
      if (tab.url === '/') return pathname === '/';
      return pathname.startsWith(tab.url);
    })?.url || '/';
  }, [pathname, tabs, currentTab]);

  const handleTabClick = (e: React.MouseEvent, url: string) => {
    if (onChange) {
      e.preventDefault();
      onChange(url);
    }
  };

  return (
    <nav
      className={cn(
        'relative flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1 shadow-inner select-none',
        className,
      )}
      onMouseLeave={() => setHoveredTab(null)}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.url;
        const isHovered = hoveredTab === tab.url;
        return (
          <Link
            key={tab.url}
            href={tab.url}
            onClick={(e) => handleTabClick(e, tab.url)}
            onMouseEnter={() => setHoveredTab(tab.url)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-mono font-medium rounded-full transition-colors duration-200 cursor-pointer outline-none',
              isActive
                ? 'text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200',
              tabClassName,
            )}
          >
            {isActive && mounted && (
              <motion.div
                layoutId={`${layoutId}-active`}
                transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                className={cn(
                  'absolute inset-0 z-0 rounded-full bg-zinc-50 shadow-md',
                  activeTabClassName,
                )}
              />
            )}
            {isHovered && !isActive && (
              <motion.div
                layoutId={`${layoutId}-hover`}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                className="absolute inset-0 z-0 rounded-full bg-zinc-900"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              <span>{tab.title}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
