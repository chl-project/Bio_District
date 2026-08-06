"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const PROJECTS = [
  "Bio District Cilenggang",
  "Grand Cattleya Residence",
  "Kavling Nirwana Timur",
] as const;

export type ProjectName = (typeof PROJECTS)[number];

export const MAIN_PROJECT: ProjectName = "Bio District Cilenggang";

type AppContextValue = {
  dark: boolean;
  toggleDark: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeProject: ProjectName;
  setActiveProject: (project: ProjectName) => void;
  isMainProject: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectName>(MAIN_PROJECT);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const value: AppContextValue = {
    dark,
    toggleDark: () => setDark((d) => !d),
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    activeProject,
    setActiveProject,
    isMainProject: activeProject === MAIN_PROJECT,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
