'use client';
import { useSyncExternalStore } from "react";

/// custom hook that returns boolean by checking connection of user. I used useSyncExternalStore react hook for this
function useNetworkStatus() {

    // release of checking
    return useSyncExternalStore(

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

        // for SSR
        () => true
    )
}

export default useNetworkStatus