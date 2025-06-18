// LinkedinContentApp.jsx - With thinking bubble indicators!
import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  const idToPlaceholderMap = useRef(new Map());
  const childToParentRef = useRef(new Map());
  const chatHook = useChat();

  const thinkingIntervalRef = useRef(new Map());

  // Thinking animation frames
  const thinkingFrames = ['thinking', 'thinking.', 'thinking..', 'thinking...'];

  // Helper function to start thinking animation for a field
  const startThinkingAnimation = (element) => {
    if (!element) return;

    let frameIndex = 0;
    const originalPlaceholder = element.placeholder || '';

    const animate = () => {
      const frame = thinkingFrames[frameIndex % thinkingFrames.length];
      element.placeholder = frame;
      frameIndex++;
    };

    // Start animation immediately
    animate();

    // Continue animation every 500ms
    const intervalId = setInterval(animate, 1000);

    thinkingIntervalRef.current.set(element, {
      intervalId,
      originalPlaceholder
    });
  };

  // Cleanup function for all thinking animations
  // Improved cleanup function for all thinking animations
  const cleanupAllThinkingAnimations = () => {
    thinkingIntervalRef.current.forEach(({ intervalId, originalPlaceholder }, element) => {
      // Stop the interval
      clearInterval(intervalId);

      // Restore original placeholder for each element
      if (element && element.placeholder !== undefined) {
        element.placeholder = originalPlaceholder || "";
      }
    });

    // Clear the entire map
    thinkingIntervalRef.current.clear();

    console.log('🧹 Cleaned up all thinking animations');
  };

  // Helper function to build the message for AI
  const buildAIMessage = (jobObject, fileContents, fields) => {
    const filledFields = [];
    const fieldsToAutoFill = [];

    for (let i = 0; i < fields.length; i++) {

      const field = fields[i];
      console.log("field", field)
      const fieldData = {
        id: i,
        label: field.label || "unknown",
        placeholder: field.placeholder || "unknown",
        header: field.nearestHeader?.text || "unknown",
        value: field.value || "",
      };

      if (field.value && field.value.trim() !== '') {
        filledFields.push(fieldData);
      } else {
        fieldsToAutoFill.push(fieldData);
      }
    }

    let message = `<job>${JSON.stringify(jobObject, null, 2)}</job>`;
    message += `<resume>${fileContents}</resume>`;
    message += `<filled_fields>${JSON.stringify(filledFields, null, 2)}</filled_fields>\n`;
    message += `<fields>${JSON.stringify(fieldsToAutoFill, null, 2)}</fields>\n`;
    message += "<request>job apply, fill in ALL the fields using resume data if value is not already filled without using filled fields</request>";
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

    if (cleanSuggestion) {
      domElement.element.placeholder = `${cleanSuggestion}`;


      const maxHistory = 5;
      const existing = userCachedElementsRef.current.get(domElement.element) || [];
      const updated = [...existing, { value: cleanSuggestion, timestamp: new Date() }].slice(-maxHistory);
      userCachedElementsRef.current.set(domElement.element, updated);

      console.log('🤖 AI suggestion for', fieldElement.label || fieldElement.nearestHeader?.text, ':', cleanSuggestion);
    }
  };

  // Main function to get suggestions
  const getSuggestion = async (fields, idToDomMap, indexToIdMap) => {
    if (fields.length === 0) return;

    // Start thinking animations for all fields being processed
    const fieldElements = fields.map(field => {
      const originalId = indexToIdMap[fields.indexOf(field)];
      return idToDomMap[originalId]?.element;
    }).filter(Boolean);

    fieldElements.forEach(element => {
      startThinkingAnimation(element);
    });

    try {
      // Get resume content
      const fileContents = fileContentsRef.current;
      if (!fileContents) {
        // Stop all thinking animations
        cleanupAllThinkingAnimations()
        chatHook.addAssistantMessage("Please upload a resume");
        return;
      }

      // Build and send message
      const message = buildAIMessage(jobObject, fileContents, fields, indexToIdMap);
      const suggestion = await chatHook.sendMessage(message, false);
      cleanupAllThinkingAnimations()
      // Process suggestions
      const suggestions = parseAISuggestions(suggestion);

      // Update fields with suggestions
      suggestions.forEach(({ id, suggestion: fieldSuggestion }) => {
        const fieldElement = fields[id];
        const originalId = indexToIdMap[id];
        const domElement = idToDomMap[originalId];
        updateFieldWithSuggestion(fieldElement, domElement, fieldSuggestion, userCachedElementsRef);
      });

      chatHook.addAssistantMessage("tab to fill, ⬇️ for new query, ⬆️ for history queries");

    } catch (error) {
      console.error('Error getting suggestions:', error);
      // Stop all thinking animations on error
      cleanupAllThinkingAnimations()
    }
  };

  // Helper function to gather fields to auto-fill
  const gatherFieldsToAutoFill = (focusedElement, sectionElements) => {
    const fields = [];
    const idToDomMap = {};
    const indexToIdMap = {};

    for (const element of sectionElements) {
      if ((element.tagName === 'textarea' || element.tagName === 'input') &&
        element.nearestHeader?.text === focusedElement.nearestHeader?.text) {

        // Set original placeholder if not already set
        if (!idToPlaceholderMap.current.has(element.id)) {
          idToPlaceholderMap.current.set(element.id, element.placeholder);
        }

        // Create a deep copy of element data without DOM reference
        const { element: domElement, ...rest } = element;
        const elementWithoutDomRef = {
          ...rest,
          // Explicitly copy these to avoid reference sharing
          placeholder: idToPlaceholderMap.current.get(element.id)
        };

        // Store mappings
        idToDomMap[element.id] = element;

        indexToIdMap[fields.length] = elementWithoutDomRef.id;

        // Store parent reference using the actual DOM element
        childToParentRef.current.set(domElement, element);

        fields.push(elementWithoutDomRef);
      }
    }
    console.log(fields)

    return { fields, idToDomMap, indexToIdMap };
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
      const { fields, idToDomMap, indexToIdMap } = gatherFieldsToAutoFill(focusedElement, sectionElements);
      getSuggestion(fields, idToDomMap, indexToIdMap);
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

      if (placeholder) {
        e.preventDefault(); // Prevent normal tab behavior
        // Store current value before overwriting
        const currentValue = e.target.getAttribute('value') || e.target.value || '';
        e.target.setAttribute('data-original-value', currentValue);

        // Fill the field with suggestion
        e.target.value = placeholder;
        e.target.setAttribute('value', placeholder);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
        e.target.dispatchEvent(new Event('change', { bubbles: true }));

        userFilledElementsRef.current.set(e.target, {
          value: placeholder,
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
        !userFilledElementsRef.current.has(currentElement.element)) {// Find the current field in sectionElements to get fresh suggestions
        const { fields, idToDomMap, indexToIdMap } = gatherFieldsToAutoFill(currentElement, getElementsInContainer(e.target));
        getSuggestion(fields, idToDomMap, indexToIdMap);
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
        e.target.placeholder = suggestion.value
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

      if (resumeNeeded && (!fileContents || !fileContents.trim() || fileContents.length !== 1)) {
        chatHook.addAssistantMessage("Please upload one resume.");
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