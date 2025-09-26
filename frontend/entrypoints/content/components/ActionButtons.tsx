import React from 'react'

interface ActionButtonsProps {
  isMonitoring: boolean
  searchItemsCount: number
  onStartWorkflow: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isMonitoring,
  searchItemsCount,
  onStartWorkflow
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
            開始
          </>
        )}
      </button>
    </div>
  )
}

export default ActionButtons
