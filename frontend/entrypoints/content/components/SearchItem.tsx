import React from 'react'
import { RemoveIcon } from './Icons'

interface SearchResult {
  itemName: string
  price: string
  shopName: string
  slot: string
  quantity: string
  buySell: string
  ssi: string
  timestamp: string
}

interface SearchItemProps {
  item: {
    name: string
    notes: [string, string, string]
    results: SearchResult[]
    lastSearchTime: Date | null
  }
  index: number
  onUpdateName: (index: number, name: string) => void
  onUpdateNote: (index: number, noteIndex: number, value: string) => void
  onRemove: (index: number) => void
}

const SearchItem: React.FC<SearchItemProps> = ({
  item,
  index,
  onUpdateName,
  onUpdateNote,
  onRemove
}) => {
  return (
    <div className="search-item">
      {/* Item Configuration Row */}
      <div className="search-item-config">
        {/* Name field */}
        <input
          type="text"
          value={item.name}
          onChange={(e) => onUpdateName(index, e.target.value)}
          placeholder="名稱"
          className="search-item-name-input"
        />
        
        {/* Notes fields */}
        {item.notes.map((note, noteIndex) => (
          <input
            key={noteIndex}
            type="text"
            value={note}
            onChange={(e) => onUpdateNote(index, noteIndex, e.target.value)}
            placeholder={`字條${noteIndex + 1}`}
            className="search-item-note-input"
          />
        ))}

        {/* Remove button */}
        <button
          onClick={() => onRemove(index)}
          className="search-item-remove-btn"
          title="Remove item"
        >
          <RemoveIcon />
        </button>
      </div>
      
      {/* Search Results for this item */}
      {item.results.length > 0 && (
        <div className="search-item-results">
        <div className="search-item-results-header">
          Latest Result ({item.lastSearchTime?.toLocaleTimeString()})
        </div>
          {item.results.slice(0, 1).map((result: SearchResult, resultIndex: number) => (
            <div key={resultIndex} className="search-item-result-grid">
              <div><strong></strong> {result.itemName}</div>
              <div><strong>$:</strong> {result.price}</div>
              <div><strong>商店:</strong> {result.shopName}</div>
              <div><strong>數量:</strong> {result.quantity}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchItem
