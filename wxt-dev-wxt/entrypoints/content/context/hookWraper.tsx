// utils/mutationWrapper.ts
import React, { createContext, useContext } from 'react';

// Simple types
type MutationPause = <T>(fn: () => T) => Promise<T>;

// Context
const MutationContext = createContext<MutationPause | null>(null);

// Provider
export const MutationProvider: React.FC<{
    children: React.ReactNode;
    withMutationPaused: MutationPause | null;
}> = ({ children, withMutationPaused }) => (
    <MutationContext.Provider value={withMutationPaused}>
        {children}
    </MutationContext.Provider>
);

// Simple hook wrapper
export function wrapHook<T extends (...args: any[]) => any>(hook: T): T {
    return ((...args: any[]) => {
        const pause = useContext(MutationContext);
        const result = hook(...args);

        if (!result || typeof result !== 'object') return result;

        // Wrap functions that start with common prefixes
        const wrapped = { ...result };
        Object.keys(result).forEach(key => {
            if (typeof result[key] === 'function' &&
                /^(handle|set|start|stop|toggle|add|remove|update|process)/.test(key) &&
                pause) {
                wrapped[key] = async (...funcArgs: any[]) =>
                    pause(() => result[key](...funcArgs));
            }
            console.log("pasing")
        });

        return wrapped;
    }) as T;
}