import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(
  value: T,
  delayMs = 300,
  onDebouncedChange?: (debounced: T) => void,
): T {
  const [debounced, setDebounced] = useState(value);
  const onDebouncedChangeRef = useRef(onDebouncedChange);

  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
      onDebouncedChangeRef.current?.(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
