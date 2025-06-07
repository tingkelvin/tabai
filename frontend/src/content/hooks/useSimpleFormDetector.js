// hooks/useSimpleFormDetector.js - Simple LinkedIn form detector
import { useState, useEffect, useCallback } from 'react';

export const useSimpleFormDetector = () => {
  const [focusedElement, setFocusedElement] = useState(null);

  // Simple function to extract what we can see from LinkedIn elements
  const getElementInfo = useCallback((element) => {
    if (!element) return null;

    // Get the label text (most important for LinkedIn)
    const getLabel = () => {
      // Method 1: Direct label element
      if (element.labels && element.labels[0]) {
        return element.labels[0].textContent.trim();
      }
      
      // Method 2: Look for label in the same container
      const container = element.closest('[data-test-form-element]');
      if (container) {
        const label = container.querySelector('label');
        if (label) {
          return label.textContent.trim();
        }
      }
      
      // Method 3: Previous sibling label
      let sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === 'LABEL') {
          return sibling.textContent.trim();
        }
        sibling = sibling.previousElementSibling;
      }
      
      return 'Unknown field';
    };

    return {
      id: element.id || 'no-id',
      tagName: element.tagName.toLowerCase(),
      type: element.type || '',
      label: getLabel(),
      placeholder: element.placeholder || '',
      value: element.value || '',
      required: element.required || false,
      className: element.className || ''
    };
  }, []);

  // Focus handler
  const handleFocus = useCallback((e) => {
    // Only track form elements
    const tagName = e.target.tagName.toLowerCase();
    if (['input', 'select', 'textarea'].includes(tagName)) {
      const elementInfo = getElementInfo(e.target);
      console.log('Focused element:', elementInfo);
      setFocusedElement(elementInfo);
    }
  }, [getElementInfo]);

  // Blur handler
  const handleBlur = useCallback(() => {
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
    focusedElement
  };
};