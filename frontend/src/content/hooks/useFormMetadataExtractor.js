// hooks/useFormMetadataExtractor.js - Enhanced form detector for LLM consumption
import { useState, useEffect, useCallback } from 'react';

export const useFormMetadataExtractor = () => {
  const [formMetadata, setFormMetadata] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Extract comprehensive field information
  const extractFieldInfo = useCallback((element) => {
    if (!element) return null;

    const getLabel = () => {
      // Method 1: Direct label association
      if (element.labels && element.labels[0]) {
        return element.labels[0].textContent.trim();
      }

      // Method 2: Look for label with 'for' attribute
      if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return label.textContent.trim();
      }

      // Method 3: Parent label
      const parentLabel = element.closest('label');
      if (parentLabel) {
        return parentLabel.textContent.replace(element.outerHTML, '').trim();
      }

      // Method 4: LinkedIn-style container
      const container = element.closest('[data-test-form-element]');
      if (container) {
        const label = container.querySelector('label');
        if (label) return label.textContent.trim();
      }

      // Method 5: Previous sibling
      let sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === 'LABEL') {
          return sibling.textContent.trim();
        }
        sibling = sibling.previousElementSibling;
      }

      // Method 6: Aria-label or title
      return element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.getAttribute('data-test-text-entity-list-form-title') ||
        'Unlabeled field';
    };

    const getValidationRules = () => {
      const rules = {
        required: element.required || element.hasAttribute('required'),
        minLength: element.minLength || null,
        maxLength: element.maxLength || null,
        pattern: element.pattern || null,
        min: element.min || null,
        max: element.max || null
      };

      // Check for custom validation attributes
      const dataValidation = element.getAttribute('data-val');
      if (dataValidation) {
        // Parse common validation attributes
        if (element.getAttribute('data-val-required')) {
          rules.required = true;
          rules.requiredMessage = element.getAttribute('data-val-required');
        }
        if (element.getAttribute('data-val-email')) {
          rules.email = true;
          rules.emailMessage = element.getAttribute('data-val-email');
        }
        if (element.getAttribute('data-val-phone')) {
          rules.phone = true;
          rules.phoneMessage = element.getAttribute('data-val-phone');
        }
        if (element.getAttribute('data-val-length-max')) {
          rules.maxLength = parseInt(element.getAttribute('data-val-length-max'));
        }
      }

      return rules;
    };

    const getOptions = () => {
      if (element.tagName.toLowerCase() === 'select') {
        return Array.from(element.options).map(option => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected,
          disabled: option.disabled
        }));
      }

      // For radio buttons with same name
      if (element.type === 'radio') {
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        return Array.from(radioGroup).map(radio => ({
          value: radio.value,
          text: radio.labels?.[0]?.textContent.trim() || radio.value,
          checked: radio.checked,
          disabled: radio.disabled
        }));
      }

      return null;
    };

    const getFieldContext = () => {
      // Get surrounding context for better understanding
      const fieldset = element.closest('fieldset');
      const section = element.closest('section');
      const container = element.closest('[data-test-form-element]');

      return {
        fieldsetLegend: fieldset?.querySelector('legend')?.textContent.trim() || null,
        sectionHeading: section?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim() || null,
        containerContext: container?.getAttribute('data-test-form-element') || null,
        parentClasses: element.parentElement?.className || null
      };
    };

    return {
      // Basic identification
      id: element.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: element.name || '',
      tagName: element.tagName.toLowerCase(),
      type: element.type || element.tagName.toLowerCase(),

      // User-visible information
      label: getLabel(),
      placeholder: element.placeholder || '',
      value: element.value || '',

      // Validation and constraints
      validation: getValidationRules(),

      // Options for select/radio elements
      options: getOptions(),

      // Context and grouping
      context: getFieldContext(),

      // Additional metadata
      disabled: element.disabled,
      readonly: element.readOnly,
      tabIndex: element.tabIndex,
      className: element.className,

      // Custom attributes (useful for dynamic forms)
      customAttributes: Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),

      // Position information
      position: {
        offsetTop: element.offsetTop,
        offsetLeft: element.offsetLeft,
        boundingRect: element.getBoundingClientRect()
      }
    };
  }, []);

  // Extract form structure and metadata
  const extractFormMetadata = useCallback(() => {
    setIsScanning(true);

    try {
      const forms = document.querySelectorAll('form');
      const allFields = document.querySelectorAll('input, select, textarea');
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="reset"]');

      // Extract form information
      const formInfo = Array.from(forms).map((form, index) => ({
        id: form.id || `form_${index}`,
        action: form.action || '',
        method: form.method || 'get',
        enctype: form.enctype || '',
        name: form.name || '',
        className: form.className || '',
        fieldCount: form.querySelectorAll('input, select, textarea').length
      }));

      // Extract all field information
      const fields = Array.from(allFields).map(extractFieldInfo).filter(Boolean);

      // Extract button information
      const actionButtons = Array.from(buttons).map((button, index) => ({
        id: button.id || `button_${index}`,
        type: button.type || 'button',
        text: button.textContent.trim() || button.value || '',
        name: button.name || '',
        disabled: button.disabled,
        className: button.className || '',
        form: button.form?.id || null
      }));

      // Group fields by context/section
      const groupedFields = fields.reduce((groups, field) => {
        const groupKey = field.context.fieldsetLegend ||
          field.context.sectionHeading ||
          'main';

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(field);
        return groups;
      }, {});

      // Extract page context
      const pageContext = {
        title: document.title,
        url: window.location.href,
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent.trim()
        })),
        formPurpose: forms[0]?.closest('section')?.querySelector('h1, h2')?.textContent.trim() ||
          document.querySelector('h1')?.textContent.trim() ||
          'Unknown form purpose'
      };

      const metadata = {
        pageContext,
        forms: formInfo,
        fieldGroups: groupedFields,
        allFields: fields,
        buttons: actionButtons,
        totalFields: fields.length,
        requiredFields: fields.filter(f => f.validation.required).length,
        extractedAt: new Date().toISOString(),

        // Summary for LLM
        summary: {
          formPurpose: pageContext.formPurpose,
          totalFields: fields.length,
          requiredFields: fields.filter(f => f.validation.required).length,
          fieldTypes: [...new Set(fields.map(f => f.type))],
          hasFileUpload: fields.some(f => f.type === 'file'),
          hasSelectFields: fields.some(f => f.type === 'select'),
          estimatedComplexity: fields.length > 10 ? 'high' : fields.length > 5 ? 'medium' : 'low'
        }
      };

      setFormMetadata(metadata);
      return metadata;
    } catch (error) {
      console.error('Error extracting form metadata:', error);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [extractFieldInfo]);

  // Generate LLM-friendly prompt
  const generateLLMPrompt = useCallback((userGoal = '') => {
    if (!formMetadata) return null;

    const prompt = `
FORM FILLING ASSISTANT REQUEST

Page Context:
- Page Title: ${formMetadata.pageContext.title}
- Form Purpose: ${formMetadata.pageContext.formPurpose}
- URL: ${formMetadata.pageContext.url}

User Goal: ${userGoal || 'Fill out this form completely and accurately'}

Form Summary:
- Total Fields: ${formMetadata.summary.totalFields}
- Required Fields: ${formMetadata.summary.requiredFields}
- Field Types: ${formMetadata.summary.fieldTypes.join(', ')}
- Complexity: ${formMetadata.summary.estimatedComplexity}

Field Details:
${Object.entries(formMetadata.fieldGroups).map(([groupName, fields]) => `
Section: ${groupName}
${fields.map(field => `
  - ${field.label} (${field.type})
    ID: ${field.id}
    Required: ${field.validation.required ? 'Yes' : 'No'}
    ${field.placeholder ? `Placeholder: ${field.placeholder}` : ''}
    ${field.options ? `Options: ${field.options.map(opt => opt.text).join(', ')}` : ''}
    ${Object.keys(field.validation).filter(key => field.validation[key] && key !== 'required').length > 0 ?
        `Validation: ${Object.entries(field.validation).filter(([key, value]) => value && key !== 'required').map(([key, value]) => `${key}: ${value}`).join(', ')}` : ''}
`).join('')}
`).join('')}

Available Actions:
${formMetadata.buttons.map(button => `- ${button.text} (${button.type})`).join('\n')}

Please provide step-by-step instructions for filling out this form, including:
1. The order in which to fill fields
2. What information is needed for each field
3. Any validation requirements or format specifications
4. Tips for any complex fields (file uploads, selects, etc.)
5. What to do after completing the form

Focus on being practical and specific about the data needed for each field.
`;

    return prompt;
  }, [formMetadata]);

  // Auto-scan on mount and when DOM changes significantly
  useEffect(() => {
    console.log('🚀 Form metadata extractor mounted');
    // Initial scan
    const timer = setTimeout(extractFormMetadata, 100);

    // Set up observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      const hasFormChanges = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.tagName === 'FORM' || node.querySelector?.('input, select, textarea'))
        )
      );

      if (hasFormChanges) {
        clearTimeout(timer);
        setTimeout(extractFormMetadata, 500); // Debounce
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [extractFormMetadata]);

  return {
    formMetadata,
    isScanning,
    extractFormMetadata,
    generateLLMPrompt
  };
};