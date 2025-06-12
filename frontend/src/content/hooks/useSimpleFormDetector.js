// hooks/useSimpleFormDetector.js - Fixed LinkedIn form detector
import { useState, useEffect, useCallback } from 'react';

export const useSimpleFormDetector = () => {
  const [focusedElement, setFocusedElement] = useState(null);
  const [sectionElements, setSectionElements] = useState([]);

  // Check if an element is visible/not hidden
  const isElementVisible = useCallback((element) => {
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    try {
      // Quick check - if offsetParent is null, element is likely hidden
      // (except for position: fixed elements)
      if (element.offsetParent === null) {
        // Additional check for position: fixed elements
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.position !== 'fixed') {
          return false;
        }
      }

      // Check computed styles for common hiding techniques
      const computedStyle = window.getComputedStyle(element);

      // Hidden via display: none
      if (computedStyle.display === 'none') {
        return false;
      }

      // Hidden via visibility: hidden
      if (computedStyle.visibility === 'hidden') {
        return false;
      }

      // Hidden via opacity: 0
      if (parseFloat(computedStyle.opacity) === 0) {
        return false;
      }

      // Hidden via zero dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }

      // Check if element is outside the viewport (optional - uncomment if needed)
      // if (rect.bottom < 0 || rect.right < 0 || 
      //     rect.left > window.innerWidth || rect.top > window.innerHeight) {
      //   return false;
      // }

      return true;
    } catch (error) {
      console.warn('Error checking element visibility:', error);
      return false;
    }
  }, []);

  // Find the nearest header element (h1, h2, h3, etc.) above the target element
  const findNearestHeader = useCallback((element) => {
    if (!element) return null;

    let current = element;

    while (current && current !== document.body) {
      // Check if current element is a header
      if (current.tagName && /^H[1-6]$/i.test(current.tagName)) {
        return {
          element: current,
          text: current.textContent.trim(),
          level: parseInt(current.tagName.charAt(1)),
          tagName: current.tagName.toLowerCase()
        };
      }

      // Check previous siblings
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (/^H[1-6]$/i.test(sibling.tagName)) {
          return {
            element: sibling,
            text: sibling.textContent.trim(),
            level: parseInt(sibling.tagName.charAt(1)),
            tagName: sibling.tagName.toLowerCase()
          };
        }

        // Also check if sibling contains a header
        const headerInSibling = sibling.querySelector('h1, h2, h3, h4, h5, h6');
        if (headerInSibling) {
          return {
            element: headerInSibling,
            text: headerInSibling.textContent.trim(),
            level: parseInt(headerInSibling.tagName.charAt(1)),
            tagName: headerInSibling.tagName.toLowerCase()
          };
        }

        sibling = sibling.previousElementSibling;
      }

      // Move up to parent and continue searching
      current = current.parentElement;
    }

    return null;
  }, []);

  // Simple function to extract element information (now includes header)
  const getElementInfo = useCallback((element) => {
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    // Get the label text (works for various form structures)
    const getLabel = () => {
      try {
        // Method 1: Direct label element (HTML standard)
        if (element.labels && element.labels[0]) {
          return element.labels[0].textContent.trim();
        }

        // Method 2: Find label by 'for' attribute matching element id
        if (element.id) {
          const labelByFor = document.querySelector(`label[for="${element.id}"]`);
          if (labelByFor) {
            return labelByFor.textContent.trim();
          }
        }

        // Method 3: Look for label in the same control-group (Bootstrap style)
        if (element.closest) {
          const controlGroup = element.closest('.control-group');
          if (controlGroup) {
            const label = controlGroup.querySelector('label.control-label');
            if (label) {
              return label.textContent.trim();
            }
          }

          // Method 4: Look for label in any parent container
          const container = element.closest('div');
          if (container) {
            const label = container.querySelector('label');
            if (label) {
              return label.textContent.trim();
            }
          }
        }

        // Method 5: Check previous siblings for labels
        let sibling = element.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === 'LABEL') {
            return sibling.textContent.trim();
          }
          sibling = sibling.previousElementSibling;
        }

        // Method 6: Check parent's previous siblings (nested structures)
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          let parentSibling = parent.previousElementSibling;
          while (parentSibling) {
            if (parentSibling.tagName === 'LABEL') {
              return parentSibling.textContent.trim();
            }
            if (parentSibling.querySelector) {
              const labelInSibling = parentSibling.querySelector('label');
              if (labelInSibling) {
                return labelInSibling.textContent.trim();
              }
            }
            parentSibling = parentSibling.previousElementSibling;
          }
          parent = parent.parentElement;
          // Don't go too far up the DOM
          if (parent && parent.tagName === 'FORM') break;
        }

        // Method 7: aria-label or aria-labelledby
        if (element.getAttribute) {
          if (element.getAttribute('aria-label')) {
            return element.getAttribute('aria-label').trim();
          }

          if (element.getAttribute('aria-labelledby')) {
            const labelId = element.getAttribute('aria-labelledby');
            const labelElement = document.getElementById(labelId);
            if (labelElement) {
              return labelElement.textContent.trim();
            }
          }
        }

        return null;
      } catch (error) {
        console.warn('Error getting label:', error);
        return null;
      }
    };

    // Get select options if it's a select element
    const getOptions = () => {
      try {
        if (element.tagName && element.tagName.toLowerCase() === 'select' && element.options) {
          return Array.from(element.options).map(option => ({
            value: option.value,
            text: option.textContent.trim()
          }));
        }
        return null;
      } catch (error) {
        console.warn('Error getting options:', error);
        return null;
      }
    };

    try {
      return {
        id: element.id || `generated-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tagName: element.tagName ? element.tagName.toLowerCase() : '',
        type: element.type || '',
        label: getLabel(),
        placeholder: element.placeholder || '',
        value: element.value || '',
        required: element.required || false,
        disabled: element.disabled || false,
        readonly: element.readOnly || false,
        tabIndex: element.tabIndex,
        className: element.className || '',
        options: getOptions(),
        nearestHeader: findNearestHeader(element), // Added header information
        element: element // Keep reference to the actual DOM element
      };
    } catch (error) {
      console.warn('Error creating element info:', error);
      return null;
    }
  }, [findNearestHeader]); // Added findNearestHeader to dependencies

  // Get elements in the same container (now filters hidden elements)
  const getElementsInContainer = useCallback((element) => {
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const elements = [];

    try {
      // Find a reasonable container (form, fieldset, or div with multiple inputs)
      let container = null;

      if (element.closest) {
        container = element.closest('form, fieldset');
      }

      if (!container) {
        // Look for a div container that has multiple form elements
        let current = element.parentElement;
        while (current && current !== document.body) {
          if (current.querySelectorAll) {
            const formElementsCount = current.querySelectorAll('input, select, textarea').length;
            if (formElementsCount > 1) {
              container = current;
              break;
            }
          }
          current = current.parentElement;
        }
      }

      if (container && container.querySelectorAll) {
        const formElements = container.querySelectorAll('input, select, textarea');
        formElements.forEach(el => {
          // Filter out hidden elements before processing
          if (isElementVisible(el)) {
            const elementInfo = getElementInfo(el);
            if (elementInfo) {
              elements.push(elementInfo);
            }
          }
        });
      }

      return elements;
    } catch (error) {
      console.warn('Error getting elements in container:', error);
      return [];
    }
  }, [getElementInfo, isElementVisible]);

  // Focus handler (simplified since header is now included in getElementInfo)
  const handleFocus = useCallback((e) => {
    try {
      // Ensure we have a valid DOM element
      if (!e || !e.target || !e.target.nodeType || e.target.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (['input', 'select', 'textarea'].includes(tagName)) {
        const elementInfo = getElementInfo(e.target);
        if (!elementInfo) return;

        console.log('🎯 Focused element:', elementInfo);

        // Also get all elements in the same section (now filtered for visibility)
        const sectionElements = getElementsInContainer(e.target);
        console.log('📋 Section elements (visible only):', sectionElements);

        setSectionElements(sectionElements);
        setFocusedElement(elementInfo);
      }
    } catch (error) {
      console.warn('Error in handleFocus:', error);
    }
  }, [getElementInfo, getElementsInContainer]); // Updated dependencies

  const handleBlur = useCallback(() => {
    // Simple version - just clear focused element immediately
    setFocusedElement(null);
  }, []);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [handleFocus, handleBlur]);

  return {
    focusedElement,
    sectionElements,
    getElementsInContainer
  };
};