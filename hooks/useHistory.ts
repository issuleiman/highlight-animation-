import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const currentState = prev[currentIndex];
      const nextState = typeof newState === 'function' ? (newState as Function)(currentState) : newState;
      
      // If the state hasn't changed, don't add to history
      if (JSON.stringify(currentState) === JSON.stringify(nextState)) {
        return prev;
      }

      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(nextState);
      
      // Limit history size to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      setCurrentIndex((curr) => Math.min(prev.length - 1, curr + 1));
      return prev;
    });
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return [history[currentIndex], set, { undo, redo, canUndo, canRedo }] as const;
}
