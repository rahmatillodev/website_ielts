'use client';
import { useSyncExternalStore, useEffect, useState } from "react";

/// custom hook that returns boolean by checking connection of user. I used useSyncExternalStore react hook for this
function useNetworkStatus() {
    // Start optimistically as online to avoid false positives on initial load
    const [isOnline, setIsOnline] = useState(true);

    // Use useSyncExternalStore for reactive updates from navigator
    const navigatorOnline = useSyncExternalStore(

        /// subscribing for changes
        (cb) => {
            // rendering when user is connected to internet
            window.addEventListener('online', cb);

            // rendering when user is disconnected from internet
            window.addEventListener('offline', cb);

            // disposing for fix memory-leak
            return () => {
                window.removeEventListener("online", cb);
                window.removeEventListener("offline", cb);
            };
        },

        // returns the result. true/false.
        () => navigator.onLine,

        // for SSR - default to online
        () => true
    );

    // Update state when navigator status changes
    useEffect(() => {
        // If navigator says online, trust it immediately
        if (navigatorOnline) {
            setIsOnline(true);
        } else {
            // If navigator says offline, verify with actual network request
            // This prevents false positives where navigator.onLine is incorrect
            const verifyOffline = async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    
                    await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal,
                        cache: 'no-cache'
                    });
                    
                    clearTimeout(timeoutId);
                    // If fetch succeeds, we're actually online despite navigator saying offline
                    setIsOnline(true);
                } catch (error) {
                    // If fetch fails, we're truly offline
                    setIsOnline(false);
                }
            };
            
            verifyOffline();
        }
    }, [navigatorOnline]);

    return isOnline;
}

export default useNetworkStatus