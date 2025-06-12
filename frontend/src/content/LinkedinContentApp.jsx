// LinkedinContentApp.jsx - Much simpler!
import React, { useEffect, useRef, useCallback } from 'react';
import { useLinkedInUrlTracking } from './hooks/useLinkedInUrlTracking';
import { useSimpleFormDetector } from './hooks/useSimpleFormDetector';
import { useChat } from './hooks/useChat';
import ContentApp from './ContentApp';
import { SummaryIcon, SalaryIcon, DutiesIcon, ResumeIcon } from './components/Icons'
import { useFileContext } from './contexts/FileProvider';

const LinkedinContentApp = () => {
  const { jobObject, formattedTitle } = useLinkedInUrlTracking();
  const { getAllContentAsString } = useFileContext();
  const { focusedElement, sectionElements, getElementsInContainer } = useSimpleFormDetector();
  const userFilledElementsRef = useRef(new Map());
  const userCachedElementsRef = useRef(new Map());
  const childToParentRef = useRef(new Map());
  const chatHook = useChat();

  // Helper function to build the message for AI
  const buildAIMessage = (jobObject, fileContents, fieldsToAutoFill) => {
    let message = `<job>${JSON.stringify(jobObject, null, 2)}</job>`;
    message += `<resume>${fileContents}</resume>`;
    message += `<fields>${JSON.stringify(fieldsToAutoFill.map(field => ({
      id: field.id || "unknown",
      label: field.label || "unknown",
      placeholder: field.placeholder || "unknown",
      header: field.nearestHeader?.text || "unknown",
      value: field.value || "",
      tagName: field.tagName || "unknown",
      required: field.required || false,
    })), null, 2)}</fields>`;
    message += "<request>job apply, fill in ALL the fields using resume data if value is not already filled without repeating value</request>";
    message += "<rules>Reply with JSON format: [{\"id\": \"field_id\", \"suggestion\": \"your_answer_here\"}] for each field. No explanations.</rules>";
    return message;
  };

  // Helper function to parse AI response
  const parseAISuggestions = (suggestion) => {
    try {
      const jsonMatch = suggestion.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(suggestion);
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return [];
    }
  };

  // Helper function to update field with suggestion
  const updateFieldWithSuggestion = (fieldElement, domElement, suggestion, userCachedElementsRef) => {
    if (!fieldElement || !domElement) return;

    const cleanSuggestion = suggestion.replace(/['"]/g, '').trim();
    domElement.element.placeholder = `${cleanSuggestion} (Press Tab to auto-fill)`;

    const maxHistory = 5;
    const existing = userCachedElementsRef.current.get(domElement.element) || [];
    const updated = [...existing, { value: cleanSuggestion, timestamp: new Date() }].slice(-maxHistory);
    userCachedElementsRef.current.set(domElement.element, updated);

    console.log('🤖 AI suggestion for', fieldElement.label || fieldElement.nearestHeader?.text, ':', cleanSuggestion);
  };

  // Main function to get suggestions
  const getSuggestion = async (fieldsToAutoFill, idToDomMap) => {
    console.log("getSuggestion fieldsToAutoFill", fieldsToAutoFill)
    if (fieldsToAutoFill.length === 0) return;

    // Get resume content
    const fileContents = fileContentsRef.current;
    if (!fileContents) {
      chatHook.addAssistantMessage("Please upload a resume");
      return;
    }

    // Build and send message
    const message = buildAIMessage(jobObject, fileContents, fieldsToAutoFill);
    const suggestion = await chatHook.sendMessage(message);

    // Process suggestions
    const suggestions = parseAISuggestions(suggestion);

    // Update fields with suggestions
    suggestions.forEach(({ id, suggestion: fieldSuggestion }) => {
      const fieldElement = fieldsToAutoFill.find(field => field.id === id);
      const domElement = idToDomMap[id];
      updateFieldWithSuggestion(fieldElement, domElement, fieldSuggestion, userCachedElementsRef);
    });
  };


  // Helper function to gather fields to auto-fill
  const gatherFieldsToAutoFill = (focusedElement, sectionElements) => {
    console.log("gatherFieldsToAutoFill sectionElements", sectionElements)
    const fieldsToAutoFill = [];
    const idToDomMap = {};
    console.log("current", userFilledElementsRef.current)
    // First add cached elements with same header
    for (const [element, data] of userFilledElementsRef.current) {
      const parentElement = childToParentRef.current.get(element);
      if (parentElement?.nearestHeader?.text === focusedElement.nearestHeader?.text) {
        const { element: _, ...elementWithoutDomRef } = parentElement;
        fieldsToAutoFill.push({
          ...elementWithoutDomRef,
          value: "" // Include the cached value
        });
        idToDomMap[elementWithoutDomRef.id] = parentElement;
      }
    }

    // Then add current section elements
    for (const element of sectionElements) {
      if ((element.tagName === 'textarea' || element.tagName === 'input') &&
        element.nearestHeader?.text === focusedElement.nearestHeader?.text) {
        const { element: _, ...elementWithoutDomRef } = element;
        fieldsToAutoFill.push(elementWithoutDomRef);
        idToDomMap[elementWithoutDomRef.id] = element;
        childToParentRef.current.set(element.element, element);
      }
    }

    return { fieldsToAutoFill, idToDomMap };
  };

  // Add this ref to cache file contents
  const fileContentsRef = useRef('');

  // Add this useEffect to cache file contents
  useEffect(() => {
    const updateFileContents = async () => {
      const contents = await getAllContentAsString();
      fileContentsRef.current = contents || '';
    };
    updateFileContents();
  }, [getAllContentAsString]);

  useEffect(() => {
    if (focusedElement?.label !== "Unknown field" &&
      focusedElement?.placeholder !== "Ask me anything..." &&
      !focusedElement?.className?.includes('chat-input') &&
      focusedElement?.element &&
      !userFilledElementsRef.current.has(focusedElement.element) &&
      !userCachedElementsRef.current.has(focusedElement.element)) {
      const { fieldsToAutoFill, idToDomMap } = gatherFieldsToAutoFill(focusedElement, sectionElements);
      getSuggestion(fieldsToAutoFill, idToDomMap);
    }
  }, [focusedElement, sectionElements]);

  const handleKeyDown = useCallback((e) => {
    // Skip if not in a form field or inside extension widget
    if (!e.target.closest || e.target.closest('.extension-widget')) return;

    const isFormField = e.target.matches('input, textarea, select');
    if (!isFormField) return;

    if (e.key === 'Tab' && e.target.placeholder && !e.target.closest('.extension-widget')) {
      // Extract suggestion from placeholder (remove the instruction part)
      const placeholder = e.target.placeholder;
      const cleanSuggestion = placeholder.replace(/\s*\(Press Tab to auto-fill\)$/i, '').trim();

      if (cleanSuggestion) {
        e.preventDefault(); // Prevent normal tab behavior

        // Store current value before overwriting
        const currentValue = e.target.getAttribute('value') || e.target.value || '';
        e.target.setAttribute('data-original-value', currentValue);

        // Fill the field with suggestion
        e.target.value = cleanSuggestion;
        e.target.setAttribute('value', cleanSuggestion);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Tab auto-filled input:', cleanSuggestion);

        userFilledElementsRef.current.set(e.target, {
          value: cleanSuggestion,
          timestamp: new Date(),
          agreedByTab: true
        });

        // Move focus to next field
        setTimeout(() => {
          const formElements = Array.from(document.querySelectorAll('input, select, textarea'))
            .filter(el => !el.closest('.extension-widget') && !el.disabled && !el.readOnly);

          const currentIndex = formElements.indexOf(e.target);
          const nextField = formElements[currentIndex + 1];

          if (nextField) {
            nextField.focus();
          }
        }, 100);
      }
    }

    else if (e.key === 'ArrowDown') {
      console.log("arrow down")
      // Fetch new suggestion for current field
      e.preventDefault();

      const currentElement = childToParentRef.current.get(e.target);
      console.log("currentElement", currentElement, getElementsInContainer(e.target))

      if (currentElement?.label !== "Unknown field" &&
        currentElement?.placeholder !== "Ask me anything..." &&
        !currentElement?.className?.includes('chat-input') &&
        currentElement?.element &&
        !userFilledElementsRef.current.has(currentElement.element)) {
        console.log('🔄 Fetching new suggestion for field...');
        // Find the current field in sectionElements to get fresh suggestions
        const { fieldsToAutoFill, idToDomMap } = gatherFieldsToAutoFill(currentElement, getElementsInContainer(e.target));
        console.log("fieldsToAutoFill", fieldsToAutoFill)
        getSuggestion(fieldsToAutoFill, idToDomMap);
      }
    }

    else if (e.key === 'ArrowUp') {
      // Browse through history suggestions
      e.preventDefault();

      const cachedSuggestions = userCachedElementsRef.current.get(e.target);
      if (!cachedSuggestions || cachedSuggestions.length === 0) {
        console.log('📝 No suggestion history for this field');
        return;
      }

      // Get current suggestion index (stored on the element)
      let currentIndex = parseInt(e.target.getAttribute('data-suggestion-index') || '0');

      // Move to previous suggestion (wrap around to end if at beginning)
      currentIndex = currentIndex <= 0 ? cachedSuggestions.length - 1 : currentIndex - 1;

      const suggestion = cachedSuggestions[currentIndex];
      if (suggestion) {
        // Update placeholder with history suggestion
        e.target.placeholder = `${suggestion.value} (Press Tab to auto-fill) - History ${currentIndex + 1}/${cachedSuggestions.length}`;
        e.target.setAttribute('data-suggestion-index', currentIndex.toString());

        console.log(`📚 History suggestion ${currentIndex + 1}/${cachedSuggestions.length}:`, suggestion.value);
      }
    }
  }, [focusedElement, sectionElements, userFilledElementsRef, userCachedElementsRef, getSuggestion, gatherFieldsToAutoFill]);

  useEffect(() => {

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Auto-extract when new job is detected

  const ask = async (question, resumeNeeded = false, ansOnly = false) => {
    if (!jobObject) {
      chatHook.addAssistantMessage("No job posting found to analyze.");
      return;
    }

    console.log('Asking question about job:', question);
    chatHook.addUserMessage(question);

    try {
      const jobContext = `${JSON.stringify(jobObject, null, 2)}`;
      const fileContents = await getAllContentAsString();

      if (resumeNeeded && (!fileContents || !fileContents.trim())) {
        chatHook.addAssistantMessage("Please upload your resume first.");
        return;
      }

      let message = `<job>${jobContext}</job>`
      message += "<platform>linkedin<</platform>"
      message += `<resume>${resumeNeeded && fileContents ? `Resume: ${fileContents}` : ''} </resume>`
      message += `<request>${question}</request>`
      if (ansOnly) message += "<rules>no other text</rules>"
      console.log('🚀 Message:', message);
      const response = await chatHook.sendMessage(message);

      if (response) {
        chatHook.addAssistantMessage(response);
        console.log('🚀 Response:', response);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      chatHook.addAssistantMessage("Sorry, I encountered an error while processing your request. Please try again.");
    }
  };

  // Updated actions array with SVG icons
  const linkedinActions = [
    {
      id: 'generate-cover-letter',
      label: 'Cover letter',
      icon: <SummaryIcon />,
      onClick: () => ask("cover letter", true, true),
      isVisible: () => !!jobObject,
      className: 'cover-letter-action',
      title: 'Generate a cover letter of the job'
    },
    {
      id: 'generate-summary',
      label: 'Summary',
      icon: <SummaryIcon />,
      onClick: () => ask("summary"),
      isVisible: () => !!jobObject,
      className: 'summary-action',
      title: 'Generate a summary of the job'
    },
    {
      id: 'salary-info',
      label: 'Salary',
      icon: <SalaryIcon />,
      onClick: () => ask("salary?"),
      isVisible: () => !!jobObject,
      className: 'salary-action',
      title: 'Get salary information'
    },
    {
      id: 'job-duties',
      label: 'Duties',
      icon: <DutiesIcon />,
      onClick: () => ask("duties?"),
      isVisible: () => !!jobObject,
      className: 'duties-action',
      title: 'Learn about job duties'
    },
    {
      id: 'resume-fit',
      label: 'Resume Fit',
      icon: <ResumeIcon />,
      onClick: () => ask("resume fit?", true),
      isVisible: () => !!jobObject,
      className: 'resume-fit-action',
      title: 'Check if your resume matches this job'
    }
  ];

  return (
    <ContentApp
      title={formattedTitle}
      customChatHook={chatHook}
      customActions={linkedinActions}
    />
  );
};

export default LinkedinContentApp;