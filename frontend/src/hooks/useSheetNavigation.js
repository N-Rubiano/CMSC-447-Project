/**
 * useSheetNavigation.js
 * Bi-directional deep-link hook for cross-navigating between the
 * Tasks / Photos list and the Sheet canvas.
 *
 * How to use:
 *   const nav = useSheetNavigation();
 *
 *   // From a task card or photo card → jump to pin on sheet:
 *   nav.navigateToPin(task);              // task must have { sheet_id, sheet_page, x_pct, y_pct }
 *
 *   // From the sheet canvas pin click → open task overlay:
 *   nav.openPinOverlay(task);
 *
 *   // Clear the overlay:
 *   nav.closePinOverlay();
 *
 *   // Read current focus state:
 *   nav.focusPin                          // { x, y } | null  → consumed by <SheetCanvas focusPin={...} />
 *   nav.overlayTask                       // task object | null → consumed by <PinOverlayCard task={...} />
 *   nav.pendingSheetId                    // string | null      → App.jsx should switch active sheet to this
 */

import { useState, useCallback, useRef } from 'react';

export function useSheetNavigation() {
  // The pin to focus/animate on the canvas
  const [focusPin, setFocusPin]         = useState(null);  // { x: number, y: number }

  // The task to show in an overlay card
  const [overlayTask, setOverlayTask]   = useState(null);

  // The sheet the app should switch to (consumed by App.jsx)
  const [pendingSheetId, setPendingSheetId] = useState(null);

  // Prevent duplicate animations from rapid clicks
  const animationRef = useRef(null);

  /**
   * navigateToPin(task)
   * Called from a task card or photo card when user clicks "View on Sheet".
   * Causes the app to:
   *   1. Switch active module to 'sheets'
   *   2. Load the correct sheet (via pendingSheetId)
   *   3. Pan and zoom the canvas to the pin coordinates
   *   4. Render a 1.5-second pulse animation around the pin
   *
   * @param {object} task — must include sheet_id, x_pct, y_pct (0-100 range)
   */
  const navigateToPin = useCallback((task) => {
    if (!task?.sheet_id) return;

    // Clear any previous focus immediately
    setFocusPin(null);
    setOverlayTask(null);

    // Signal App to switch to sheets module and load the sheet
    setPendingSheetId(task.sheet_id);

    // Defer the focus pin slightly so the canvas has time to mount / re-render
    if (animationRef.current) clearTimeout(animationRef.current);
    animationRef.current = setTimeout(() => {
      setFocusPin({
        x:        task.x_pct ?? task.location?.coordinates?.x ?? 50,
        y:        task.y_pct ?? task.location?.coordinates?.y ?? 50,
        taskId:   task.id,
        taskLabel: task.task_id || task.id,
        color:    resolveStatusColor(task.status),
        animate:  true,      // SheetCanvas reads this to trigger pulse animation
      });
    }, 120);
  }, []);

  /**
   * openPinOverlay(task)
   * Called from SheetCanvas when user clicks a pin/stamp on the canvas.
   * Displays an overlay card with task summary, photo thumbnail, assignees.
   *
   * @param {object} task — full task object (with photos, assignees arrays)
   */
  const openPinOverlay = useCallback((task) => {
    setOverlayTask(task);
  }, []);

  /**
   * closePinOverlay()
   * Dismiss the pin overlay card.
   */
  const closePinOverlay = useCallback(() => {
    setOverlayTask(null);
  }, []);

  /**
   * clearFocusPin()
   * Called by SheetCanvas after the focus animation finishes, or when the
   * sheet changes and the previous focus is no longer relevant.
   */
  const clearFocusPin = useCallback(() => {
    setFocusPin(null);
    setPendingSheetId(null);
  }, []);

  return {
    focusPin,
    overlayTask,
    pendingSheetId,
    navigateToPin,
    openPinOverlay,
    closePinOverlay,
    clearFocusPin,
  };
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Map normalized status → canvas color token */
export function resolveStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'open')    return '#EF4444';
  if (s === 'closed')  return '#22C55E';
  if (s === 'pending') return '#F59E0B';
  return '#EF4444';
}
