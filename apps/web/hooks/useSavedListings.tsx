"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SavedListingsContextValue {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  addSaved: (id: string) => void;
  removeSaved: (id: string) => void;
}

const SavedListingsContext = createContext<SavedListingsContextValue>({
  savedIds: new Set(),
  isSaved: () => false,
  addSaved: () => {},
  removeSaved: () => {},
});

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/listings/saved")
      .then((r) => r.json())
      .then((d) => {
        if (d.ids?.length) setSavedIds(new Set(d.ids));
      })
      .catch(() => {});
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const addSaved = useCallback((id: string) => {
    setSavedIds((prev) => new Set(prev).add(id));
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <SavedListingsContext.Provider value={{ savedIds, isSaved, addSaved, removeSaved }}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings() {
  return useContext(SavedListingsContext);
}
