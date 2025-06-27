export const isValidPage = (url?: string): boolean => {
    if (!url || url === '' || url === 'about:blank' || url === 'chrome://newtab/') {
        return false;
    }

    const invalidPrefixes = [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        'edge-extension://',
        'about:',
        'data:',
        'javascript:',
        'file://',
        'ftp://'
    ];

    return !invalidPrefixes.some(prefix => url.startsWith(prefix));
};