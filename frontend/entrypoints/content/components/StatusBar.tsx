import React from 'react'

interface StatusBarProps {
  currentSearchingItem: string | null
  lastSearchTime: Date | null
  isMonitoring: boolean
}

const StatusBar: React.FC<StatusBarProps> = ({
  currentSearchingItem,
  lastSearchTime,
  isMonitoring
}) => {
  return (
    <div className="status-bar">
      <div className="status-section">
        <div className="status-label">搜索:</div>
        <div className="status-value">
          {isMonitoring && currentSearchingItem ? (
            <span className="searching-indicator">
              🔍 {currentSearchingItem}
            </span>
          ) : (
            <span className="idle-indicator">待機中</span>
          )}
        </div>
      </div>
      
      <div className="status-section">
        <div className="status-label">上一次搜索:</div>
        <div className="status-value">
          {lastSearchTime ? (
            lastSearchTime.toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          ) : (
            <span className="no-data">未実行</span>
          )}
        </div>
      </div>
      
      <div className="status-section">
        <div className="status-label">Status:</div>
        <div className="status-value">
          <span className={`status-indicator ${isMonitoring ? 'monitoring' : 'stopped'}`}>
            {isMonitoring ? '🟢 執行中' : '🔴 停止中'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
