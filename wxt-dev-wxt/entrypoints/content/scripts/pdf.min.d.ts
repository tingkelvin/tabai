declare module './scripts/pdf.min.js' {
    const pdfjsLib: {
        getDocument: (params: { data: ArrayBuffer }) => {
            promise: Promise<{
                numPages: number;
                getPage: (pageNum: number) => Promise<{
                    getTextContent: () => Promise<{
                        items: Array<{ str: string }>;
                    }>;
                }>;
            }>;
        };
    };
    export = pdfjsLib;
}