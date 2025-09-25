import React from 'react'
import { PlusIcon } from './Icons'

interface AddSearchItemProps {
  newItem: {
    name: string
    notes: [string, string, string]
  }
  onUpdateName: (name: string) => void
  onUpdateNote: (noteIndex: number, value: string) => void
  onAdd: () => void
}

const AddSearchItem: React.FC<AddSearchItemProps> = ({
  newItem,
  onUpdateName,
  onUpdateNote,
  onAdd
}) => {
  return (
    <div className="add-search-item">
      <input
        type="text"
        value={newItem.name}
        onChange={(e) => onUpdateName(e.target.value)}
        placeholder="名稱"
        onKeyPress={(e) => e.key === 'Enter' && onAdd()}
        className="add-search-item-name-input"
      />
      {newItem.notes.map((note, noteIndex) => (
        <input
          key={noteIndex}
          type="text"
          value={note}
          onChange={(e) => onUpdateNote(noteIndex, e.target.value)}
          placeholder={`字條${noteIndex + 1}`}
          onKeyPress={(e) => e.key === 'Enter' && onAdd()}
          className="add-search-item-note-input"
        />
      ))}
      <button
        onClick={onAdd}
        disabled={!newItem.name.trim()}
        className="add-search-item-btn"
        title="Add new item"
      >
        <PlusIcon />
      </button>
    </div>
  )
}

export default AddSearchItem
