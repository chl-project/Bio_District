"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MAIN_PROJECT, PROJECTS, useAppContext, type ProjectName } from "@/context/app-context";
import { NAV_ITEMS } from "@/lib/nav-config";
import { ChevronIcon, MoonIcon, SunIcon } from "@/components/icons";
import styles from "./app-shell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { dark, toggleDark, sidebarCollapsed, toggleSidebar, activeProject, setActiveProject, isMainProject } =
    useAppContext();

  const current = NAV_ITEMS.find((item) => item.href === pathname);
  const screenTitle = current?.label ?? "";

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark}>H</div>
          {!sidebarCollapsed && (
            <div className={styles.brandText}>
              Harmoni
              <br />
              <span className={styles.brandSub}>Feasibility Studio</span>
            </div>
          )}
        </div>

        <nav className={styles.navList}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <Icon />
                {!sidebarCollapsed && <span className={styles.navLabel}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <button type="button" className={styles.collapseToggle} onClick={toggleSidebar}>
          <ChevronIcon className={`${styles.collapseIcon} ${sidebarCollapsed ? styles.rotated : ""}`} />
          {!sidebarCollapsed && <span>Ciutkan</span>}
        </button>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.screenTitle}>{screenTitle}</div>
          <div className={styles.topbarDivider} />
          <select
            value={activeProject}
            onChange={(e) => setActiveProject(e.target.value as ProjectName)}
            className={`input ${styles.projectSelect}`}
          >
            {PROJECTS.map((p) => (
              <option key={p} value={p}>
                Proyek: {p}
              </option>
            ))}
          </select>
          {!isMainProject && (
            <span className={styles.previewNote}>
              (pratinjau memakai data contoh {MAIN_PROJECT})
            </span>
          )}
          <div className={styles.spacer} />
          <button
            type="button"
            onClick={toggleDark}
            className="btn btn-icon btn-secondary"
            title="Ganti tema"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className={styles.avatar}>A</div>
        </div>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
