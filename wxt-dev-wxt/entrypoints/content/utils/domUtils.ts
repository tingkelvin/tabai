export const getXPath = (element: Element): string => {
    if (element.id) {
        return `//*[@id="${element.id}"]`
    }

    const parts: string[] = []
    let currentElement: Element | null = element

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
        let nbOfPreviousSiblings = 0
        let hasNextSiblings = false
        let sibling = currentElement.previousSibling

        while (sibling) {
            if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE && sibling.nodeName === currentElement.nodeName) {
                nbOfPreviousSiblings++
            }
            sibling = sibling.previousSibling
        }

        sibling = currentElement.nextSibling
        while (sibling) {
            if (sibling.nodeName === currentElement.nodeName) {
                hasNextSiblings = true
                break
            }
            sibling = sibling.nextSibling
        }

        const prefix = currentElement.prefix ? currentElement.prefix + ':' : ''
        const nth = nbOfPreviousSiblings || hasNextSiblings ? `[${nbOfPreviousSiblings + 1}]` : ''
        parts.push(prefix + currentElement.localName + nth)
        currentElement = currentElement.parentNode as Element
    }

    return parts.length ? '/' + parts.reverse().join('/') : ''
}