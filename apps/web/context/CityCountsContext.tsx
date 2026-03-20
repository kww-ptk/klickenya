"use client";

import { createContext, useContext } from "react";

export interface CityCount {
  city: string;
  count: number;
  image?: string;
}

const CityCountsContext = createContext<CityCount[]>([]);

export function CityCountsProvider({
  children,
  cityCounts,
}: {
  children: React.ReactNode;
  cityCounts: CityCount[];
}) {
  return (
    <CityCountsContext.Provider value={cityCounts}>
      {children}
    </CityCountsContext.Provider>
  );
}

export function useCityCounts() {
  return useContext(CityCountsContext);
}
