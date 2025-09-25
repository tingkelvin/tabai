import React from 'react'

interface ActionButtonsProps {
  isMonitoring: boolean
  searchItemsCount: number
  onStartWorkflow: () => void
  onTestSearch: () => void
  onParseResults: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isMonitoring,
  searchItemsCount,
  onStartWorkflow,
  onTestSearch,
  onParseResults
}) => {
  const isDisabled = searchItemsCount === 0

  return (
    <div className="action-buttons">
      <button
        onClick={onStartWorkflow}
        disabled={isDisabled}
        className={`action-btn workflow-btn ${isMonitoring ? 'stop' : 'start'}`}
      >
        {isMonitoring ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop Workflow
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Start Workflow
          </>
        )}
      </button>
        
      <button
        onClick={onTestSearch}
        disabled={isDisabled}
        className="action-btn test-search-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Test Search
      </button>
        
      <button
        onClick={onParseResults}
        disabled={isDisabled}
        className="action-btn parse-results-btn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
        Parse Results
      </button>
    </div>
  )
}

export default ActionButtons
