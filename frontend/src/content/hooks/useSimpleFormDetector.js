// hooks/useSimpleFormDetector.js - Enhanced LinkedIn form detector with tab simulation
import { useState, useEffect, useCallback } from 'react';

export const useSimpleFormDetector = () => {
  const [focusedElement, setFocusedElement] = useState(null);
  const [allFormElements, setAllFormElements] = useState([]);
  const [formElementsByHeader, setFormElementsByHeader] = useState({});

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

      // Method 4: aria-label or aria-labelledby
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
      
      return null;
    };

    // Get select options if it's a select element
    const getOptions = () => {
      if (element.tagName.toLowerCase() === 'select') {
        return Array.from(element.options).map(option => ({
          value: option.value,
          text: option.textContent.trim()
        }));
      }
      return null;
    };

    return {
      id: element.id || `generated-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tagName: element.tagName.toLowerCase(),
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
      element: element // Keep reference to the actual DOM element
    };
  }, []);

  // Function to find the nearest header for an element
  const findNearestHeader = useCallback((element) => {
    let current = element;
    
    // Walk up the DOM tree to find a header
    while (current && current !== document.body) {
      // Check if current element has a header as a sibling or parent
      let sibling = current.previousElementSibling;
      
      // Look for headers in previous siblings
      while (sibling) {
        const header = sibling.querySelector('h1, h2, h3, h4, h5, h6');
        if (header) {
          return {
            text: header.textContent.trim(),
            level: parseInt(header.tagName.substring(1)),
            element: header
          };
        }
        
        // Check if the sibling itself is a header
        if (/^h[1-6]$/i.test(sibling.tagName)) {
          return {
            text: sibling.textContent.trim(),
            level: parseInt(sibling.tagName.substring(1)),
            element: sibling
          };
        }
        
        sibling = sibling.previousElementSibling;
      }
      
      // Move up to parent
      current = current.parentElement;
      
      // Check if parent contains a header before this element
      if (current) {
        const headers = current.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (let i = headers.length - 1; i >= 0; i--) {
          const header = headers[i];
          // Check if this header comes before our element in the DOM
          if (header.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
            return {
              text: header.textContent.trim(),
              level: parseInt(header.tagName.substring(1)),
              element: header
            };
          }
        }
      }
    }
    
    return {
      text: 'Unknown Section',
      level: 0,
      element: null
    };
  }, []);

  // Alternative method: Use document.querySelectorAll as fallback
// Alternative method: Use document.querySelectorAll as fallback
const extractAllFormElements = useCallback(() => {
  console.log('📋 Using querySelector method as fallback...');
  
  // Find all focusable elements using CSS selector
  const focusableElements = document.querySelectorAll(
    'input:not([disabled]):not([tabindex="-1"]), ' +
    'select:not([disabled]):not([tabindex="-1"]), ' +
    'textarea:not([disabled]):not([tabindex="-1"]), ' +
    'button:not([disabled]):not([tabindex="-1"]), ' +
    '[tabindex]:not([tabindex="-1"])'
  );
  
  const elements = [];
  const tempGroupedByHeader = {}; // Temporary grouping

  focusableElements.forEach((element, index) => {
    // Skip elements that are part of the extension widget
    if (element.closest('.extension-widget')) {
      return;
    }

    const elementInfo = getElementInfo(element);

    if (elementInfo.label == null) return;

    const nearestHeader = findNearestHeader(element);
    
    const elementWithHeader = {
      ...elementInfo,
      nearestHeader: nearestHeader,
      tabOrder: index + 1
    };

    elements.push(elementWithHeader);

    // Group by header temporarily
    const headerKey = nearestHeader.text;
    if (!tempGroupedByHeader[headerKey]) {
      tempGroupedByHeader[headerKey] = {
        header: nearestHeader,
        elements: []
      };
    }
    tempGroupedByHeader[headerKey].elements.push(elementWithHeader);
  });

  // Filter to only include sections with at least one required element
  const groupedByHeader = {};
  Object.keys(tempGroupedByHeader).forEach(headerKey => {
    const section = tempGroupedByHeader[headerKey];
    const hasRequiredElement = section.elements.some(element => element.required);
    
    if (hasRequiredElement) {
      groupedByHeader[headerKey] = section;
    }
  });

  setAllFormElements(elements);
  setFormElementsByHeader(groupedByHeader);

  console.log('📋 QuerySelector method found:', elements.length, 'total elements');
  console.log('📋 Sections with required fields:', Object.keys(groupedByHeader).length);
  return { elements, groupedByHeader };
}, [getElementInfo, findNearestHeader]);

  // Focus handler
  const handleFocus = useCallback((e) => {
    const tagName = e.target.tagName.toLowerCase();
    if (['input', 'select', 'textarea'].includes(tagName)) {
      const elementInfo = getElementInfo(e.target);
      const nearestHeader = findNearestHeader(e.target);
      
      const focusedElementWithHeader = {
        ...elementInfo,
        nearestHeader: nearestHeader
      };
      
      console.log('🎯 Focused element:', focusedElementWithHeader);
      setFocusedElement(focusedElementWithHeader);
    }
  }, [getElementInfo, findNearestHeader]);

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

  // Function to get a summary of form elements and their state
  const getFormSummary = useCallback(() => {
    const sections = Object.keys(formElementsByHeader).map(headerKey => {
      const section = formElementsByHeader[headerKey];
      const requiredElements = section.elements.filter(el => el.required);
      const emptyRequired = requiredElements.filter(el => !el.value || el.value.trim() === '');
      
      return {
        header: headerKey,
        elementCount: section.elements.length,
        requiredCount: requiredElements.length,
        emptyRequiredCount: emptyRequired.length,
        completion: requiredElements.length > 0 
          ? Math.round(((requiredElements.length - emptyRequired.length) / requiredElements.length) * 100)
          : 100
      };
    });

    const totalElements = allFormElements.length;
    const requiredElements = allFormElements.filter(el => el.required).length;
    const emptyRequired = allFormElements.filter(el => el.required && (!el.value || el.value.trim() === '')).length;
    const totalSections = Object.keys(formElementsByHeader).length;

    return {
      totalSections,
      totalElements,
      requiredElements,
      emptyRequired,
      completion: requiredElements > 0 
        ? Math.round(((requiredElements - emptyRequired) / requiredElements) * 100)
        : 100,
      sections
    };
  }, [allFormElements, formElementsByHeader]);

    // Function to show detailed form analysis
  const showFormAnalysis = useCallback(() => {
    const summary = getFormSummary();
    return {
      ...summary,
      details: summary.sections.map(section => ({
        ...section,
        fields: formElementsByHeader[section.header]?.elements.map(el => {
          // Get current value from the actual DOM element if available
          const currentValue = el.element ? (el.element.value || '') : el.value;
          const isFilled = !!(currentValue && currentValue.trim());
          
          return {
            id: el.id,
            label: el.label,
            tagName: el.tagName,
            type: el.type,
            required: el.required,
            disabled: el.disabled,
            readonly: el.readonly,
            tabIndex: el.tabIndex,
            placeholder: el.placeholder,
            currentValue: currentValue,
            originalValue: el.value, // Original value when detected
            filled: isFilled,
            isEmpty: !isFilled,
            className: el.className,
            // Select options if it's a dropdown
            options: el.options || null,
            // Validation status
            validationStatus: el.required ? (isFilled ? '✅ Valid' : '❌ Required but empty') : '➖ Optional',
            // Field state summary
            status: {
              isRequired: el.required,
              isFilled: isFilled,
              isDisabled: el.disabled,
              isReadonly: el.readonly,
              hasPlaceholder: !!(el.placeholder && el.placeholder.trim()),
              hasOptions: !!(el.options && el.options.length > 0)
            },
            // Accessibility info
            accessibility: {
              hasLabel: !!(el.label && el.label !== 'Unknown field'),
              hasAriaLabel: !!(el.element && el.element.getAttribute('aria-label')),
              hasAriaLabelledBy: !!(el.element && el.element.getAttribute('aria-labelledby')),
              tabOrder: el.tabIndex
            }
          };
        }) || []
      }))
    };
  }, [getFormSummary, formElementsByHeader]);

  return {
    focusedElement,
    allFormElements,
    formElementsByHeader,
    extractAllFormElements,
    getFormSummary,
    showFormAnalysis
  };
};