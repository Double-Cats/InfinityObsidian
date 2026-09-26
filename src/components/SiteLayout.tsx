/**
 * src/components/SiteLayout.tsx — 全站外壳：玻璃导航 + 页脚（静态版）
 */
import { Link, NavLink, Outlet } from "react-router";
import { settings } from "@/lib/blog-data";

export function useSiteSettings() {
  return settings;
}

export function GemLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z"
        stroke="#a88afd"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="rgba(168,138,250,0.12)"
      />
      <path d="M12 2.5 20 7l-8 4.5L4 7l8-4.5Z" fill="rgba(168,138,250,0.28)" stroke="#a88afd" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 11.5v10" stroke="#a88afd" strokeWidth="1" />
    </svg>
  );
}

export default function SiteLayout() {
  const { blogTitle } = useSiteSettings();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="nav-brand">
            <GemLogo />
            <span>{blogTitle}</span>
          </Link>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              首页
            </NavLink>
            <NavLink to="/tags" className={({ isActive }) => (isActive ? "active" : "")}>
              标签
            </NavLink>
            <NavLink to="/archive" className={({ isActive }) => (isActive ? "active" : "")}>
              归档
            </NavLink>
          </div>
        </div>
      </nav>
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span className="flex items-center gap-2">
            <GemLogo size={16} />
            {blogTitle}
          </span>
          <span>由 Obsidian 写作 · 托管于 GitHub Pages</span>
          <span className="foot-right">INFINITY OBSIDIAN</span>
        </div>
      </footer>
    </div>
  );
}
