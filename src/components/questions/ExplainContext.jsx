import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * Explain open/close state for a review session.
 *
 * ONE OPEN AT A TIME, across every question type. The inline types (gap-fill,
 * table completion, universal, drag-drop) expand a full-width panel that pushes
 * the text below it down; two of those open at once turns a passage into a wall
 * of panels. Card types (MC, TFNG, YNNG) share the same rule so the interaction
 * feels identical wherever a student meets it.
 *
 * The provider is mounted ONLY by the reading practice page in review mode.
 * That is what keeps Explain off listening and off the test-taking view: the
 * question components are shared, so `useExplain()` returning null is the
 * structural guarantee that no Explain control can render there, independent of
 * whatever happens to be stored on the row.
 */
const ExplainContext = createContext(null);

export function ExplainProvider({ children }) {
  const [openKey, setOpenKey] = useState(null);

  const value = useMemo(
    () => ({
      isOpen: (key) => openKey !== null && openKey === String(key),
      toggle: (key) =>
        setOpenKey((current) => (current === String(key) ? null : String(key))),
      close: () => setOpenKey(null),
    }),
    [openKey]
  );

  return <ExplainContext.Provider value={value}>{children}</ExplainContext.Provider>;
}

/** Null outside a provider - callers must treat that as "no Explain here". */
export function useExplain() {
  return useContext(ExplainContext);
}
