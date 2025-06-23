/**
 * Wait for page and frames to load completely
 * @param minimumWaitTime - Minimum time to wait in seconds (default: 2)
 */
async function waitForPageAndFramesLoad(minimumWaitTime: number = 2): Promise<void> {
    // Start timing
    const startTime = Date.now();

    // Wait for page load
    try {
        await waitForStableNetwork();
    } catch (error) {
        console.warn('Page load failed, continuing...', error);
    }

    // Calculate remaining time to meet minimum wait time
    const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
    const remaining = Math.max(minimumWaitTime - elapsed, 0);

    console.debug(
        `--Page loaded in ${elapsed.toFixed(2)} seconds, waiting for additional ${remaining.toFixed(2)} seconds`,
    );

    // Sleep remaining time if needed
    if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining * 1000)); // Convert seconds to milliseconds
    }
}

/**
 * Wait for network to stabilize (no network requests for a period)
 */
async function waitForStableNetwork(stableTime: number = 500, maxWait: number = 10000): Promise<void> {
    return new Promise((resolve) => {
        let lastActivity = Date.now();
        let timeoutId: number;
        let maxTimeoutId: number;

        // Set maximum wait timeout
        maxTimeoutId = window.setTimeout(() => {
            window.clearTimeout(timeoutId);
            resolve();
        }, maxWait);

        const checkStability = () => {
            const now = Date.now();
            if (now - lastActivity >= stableTime) {
                window.clearTimeout(maxTimeoutId);
                resolve();
            } else {
                timeoutId = window.setTimeout(checkStability, 100);
            }
        };

        // Monitor for new network requests
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
                lastActivity = Date.now();
            }
        });

        // Start observing network requests
        observer.observe({ entryTypes: ['resource'] });

        // Start checking for stability
        checkStability();

        // Clean up observer when done
        setTimeout(() => {
            observer.disconnect();
        }, maxWait);
    });
}