import { NavLink } from 'react-router-dom';
import type { NavItem } from '@/config/sidebarConfig';

interface SidebarProps {
  navItems: NavItem[];
}

export function Sidebar({ navItems }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-stone-200/60 min-h-screen pt-2">
      <nav className="px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-[0.8125rem] transition-colors ${
                isActive
                  ? 'bg-bloom-sage/10 text-bloom-dark font-medium'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-bloom-dark'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
