import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;
}

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [delay]
  ) as T;
}

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function useMount(effect: () => void | (() => void)): void {
  useEffect(effect, []);
}

export function useUnmount(effect: () => void): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    return () => effectRef.current();
  }, []);
}

export function useUpdateEffect(effect: () => void | (() => void), deps: unknown[]): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
  }, deps);
}

export function useBoolean(initial = false) {
  const [value, setValue] = useState(initial);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue(v => !v), []);

  return { value, setTrue, setFalse, toggle, setValue };
}

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => Math.max(0, c - 1)), []);
  const reset = useCallback(() => setCount(initial), [initial]);

  return { count, increment, decrement, reset, setCount };
}

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue] as const;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      AsyncStorage.getItem(key).then((value: string | null) => {
        if (value !== null) {
          setStoredValue(JSON.parse(value));
        }
      });
    } catch {}
  }, [key]);

  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {}
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

export function useAppState(onForeground?: () => void, onBackground?: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        onForeground?.();
      } else if (nextState.match(/inactive|background/)) {
        onBackground?.();
      }
    });

    return () => subscription.remove();
  }, [onForeground, onBackground]);
}

export function useMountedRef(): { readonly current: boolean } {
  const ref = useRef(true);
  useEffect(() => {
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}

export function useCallbackRef<T extends (...args: unknown[]) => unknown>(callback: T): T {
  const ref = useRef(callback);
  ref.current = callback;
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
