// hooks/useLinkedInUrlTracking.js - Simplified version
import { useState, useEffect } from 'react';
import { useUrlTracking } from './useUrlTracking';

export const useLinkedInUrlTracking = () => {
  const currentUrl = useUrlTracking();
  const [jobObject, setJobObject] = useState(null);
  const [isLinkedInJobPage, setIsLinkedInJobPage] = useState(false);

  // Helper function to extract job ID from URL
  const extractJobId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('linkedin.com')) {
        const jobViewMatch = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
        if (jobViewMatch) return jobViewMatch[1];
        
        const currentJobId = urlObj.searchParams.get('currentJobId');
        if (currentJobId) return currentJobId;
      }
    } catch (error) {
      console.error('Error extracting job ID:', error);
    }
    return null;
  };

  // Function to clean and extract text
  const extractCleanText = (element) => {
    if (!element) return '';
    return element.textContent?.trim()?.replace(/\s+/g, ' ') || '';
  };

  // Extract job details from page
  const extractJobFromPage = () => {
    const job = {};

    try {
      // Job title
      const titleElement = document.querySelector('h1, .job-details-jobs-unified-top-card__job-title');
      if (titleElement) job.jobTitle = extractCleanText(titleElement);

      // Company
      const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a, a[href*="/company/"]');
      if (companyElement) job.company = extractCleanText(companyElement);

      // Location
      const locationElement = document.querySelector('.tvm__text, [data-test="job-location"]');
      if (locationElement) job.location = extractCleanText(locationElement);

      // Description
      const descElement = document.querySelector('.jobs-description__content, .jobs-box__html-content');
      if (descElement) job.description = extractCleanText(descElement);

      // Job ID
      const jobId = extractJobId(window.location.href);
      if (jobId) job.jobId = jobId;

    } catch (error) {
      console.error('Error extracting job:', error);
    }

    return Object.keys(job).length > 0 ? job : null;
  };

  // Handle URL changes
  useEffect(() => {
    const jobId = extractJobId(currentUrl);
    const isJobPage = !!jobId;
    
    setIsLinkedInJobPage(isJobPage);
    
    if (isJobPage) {
      // Small delay to let LinkedIn load content
      const timer = setTimeout(() => {
        const job = extractJobFromPage();
        console.log('Extracted job:', job);
        setJobObject(job);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setJobObject(null);
    }
  }, [currentUrl]);

  const formattedTitle = jobObject?.jobTitle 
    ? `💼 ${jobObject.jobTitle}${jobObject.company ? ` at ${jobObject.company}` : ''}`
    : 'LinkedIn';

  return {
    jobObject,
    formattedTitle
  };
};