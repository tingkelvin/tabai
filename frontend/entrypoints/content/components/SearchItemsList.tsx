import React from 'react'
import SearchItem from './SearchItem'
import AddSearchItem from './AddSearchItem'

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

interface SearchItem {
  name: string
  notes: [string, string, string]
  results: SearchResult[]
  lastSearchTime: Date | null
}

interface SearchItemsListProps {
  searchItems: SearchItem[]
  newSearchItem: {
    name: string
    notes: [string, string, string]
  }
  onUpdateItemName: (index: number, name: string) => void
  onUpdateItemNote: (index: number, noteIndex: number, value: string) => void
  onRemoveItem: (index: number) => void
  onUpdateNewItemName: (name: string) => void
  onUpdateNewItemNote: (noteIndex: number, value: string) => void
  onAddItem: () => void
}

const SearchItemsList: React.FC<SearchItemsListProps> = ({
  searchItems,
  newSearchItem,
  onUpdateItemName,
  onUpdateItemNote,
  onRemoveItem,
  onUpdateNewItemName,
  onUpdateNewItemNote,
  onAddItem
}) => {
  return (
    <div className="search-items-list">
      <div className="search-items-header">
        🔍 Search Items ({searchItems.length})
      </div>
      
      <div className="search-items-content">
        {searchItems.length === 0 ? (
          <div className="search-items-empty">
            No search items configured
          </div>
        ) : (
          <>
            {searchItems.map((item, index) => (
              <SearchItem
                key={index}
                item={item}
                index={index}
                onUpdateName={onUpdateItemName}
                onUpdateNote={onUpdateItemNote}
                onRemove={onRemoveItem}
              />
            ))}

            <AddSearchItem
              newItem={newSearchItem}
              onUpdateName={onUpdateNewItemName}
              onUpdateNote={onUpdateNewItemNote}
              onAdd={onAddItem}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default SearchItemsList
