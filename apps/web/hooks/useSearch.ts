"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SearchResults {
  query: string;
  listings: Record<string, unknown>[];
  posts: Record<string, unknown>[];
  destinations: Record<string, unknown>[];
  total: number;
  context?: Record<string, unknown>;
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const cache = useRef<Map<string, SearchResults>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchResults = useCallback(async (q: string) => {
    // Check cache first
    const cached = cache.current.get(q);
    if (cached) {
      setResults(cached);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Search failed");

      const data: SearchResults = await res.json();

      // Cache the result
      cache.current.set(q, data);

      // Only update if this is still the active request
      if (!controller.signal.aborted) {
        setResults(data);
        setIsOpen(true);
        setIsLoading(false);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced search when query changes
  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    // Open dropdown immediately so skeleton shows while loading
    setIsLoading(true);
    setIsOpen(true);

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, fetchResults]);

  // Escape key closes dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setIsOpen(false);
    setIsLoading(false);
    abortRef.current?.abort();
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    clear,
  };
}
