"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type LaunchpadActivitySelection = {
  id: string;
  event_type: string;
  public_code: string | null;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

type LaunchpadOperationalState = {
  selectedActivity: LaunchpadActivitySelection | null;
  setSelectedActivity: (event: LaunchpadActivitySelection | null) => void;
};

const LaunchpadOperationalContext = createContext<LaunchpadOperationalState | null>(null);

export function LaunchpadOperationalProvider({ children }: { children: ReactNode }) {
  const [selectedActivity, setSelectedActivity] = useState<LaunchpadActivitySelection | null>(null);
  const value = useMemo(
    () => ({ selectedActivity, setSelectedActivity }),
    [selectedActivity],
  );
  return (
    <LaunchpadOperationalContext.Provider value={value}>
      {children}
    </LaunchpadOperationalContext.Provider>
  );
}

export function useLaunchpadOperational() {
  const ctx = useContext(LaunchpadOperationalContext);
  if (!ctx) {
    throw new Error("useLaunchpadOperational must be used within LaunchpadOperationalProvider");
  }
  return ctx;
}
