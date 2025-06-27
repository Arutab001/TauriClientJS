import React, { useState } from 'react';
import { useWebSocket } from '../../WebSocketContext.jsx';

function getNotes(character) {
  // Собираем все notes-X
  const notes = [];
  if (character?.text) {
    Object.keys(character.text).forEach(key => {
      if (key.startsWith('notes-')) {
        const content = character.text[key]?.value?.data?.content?.map(par => par.content?.[0]?.text || '') || [];
        notes.push({ key, content });
      }
    });
  }
  if (notes.length === 0) notes.push({ key: 'notes-1', content: [''] });
  return notes;
}

export default function NotesPage({ character, onUpdateCharacter, playerId }) {
  const [notes, setNotes] = useState(getNotes(character));
  const { send } = useWebSocket();

  const handleChange = (noteIdx, parIdx, value) => {
    const newNotes = notes.map((note, idx) => {
      if (idx !== noteIdx) return note;
      const newContent = [...note.content];
      newContent[parIdx] = value;
      return { ...note, content: newContent };
    });
    setNotes(newNotes);
    // Сохраняем в character
    const newText = { ...character.text };
    newNotes.forEach(note => {
      newText[note.key] = {
        value: {
          ...character.text?.[note.key]?.value,
          data: {
            ...character.text?.[note.key]?.value?.data,
            content: note.content.map(text => ({
              type: 'paragraph',
              content: [{ type: 'text', text }]
            }))
          }
        }
      };
    });
    const updatedChar = { ...character, text: newText };
    onUpdateCharacter(updatedChar);
    if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  const handleAddNote = () => {
    const nextIdx = notes.length + 1;
    setNotes([...notes, { key: `notes-${nextIdx}`, content: [''] }]);
  };

  return (
    <div>
      <h1>Заметки</h1>
      {notes.map((note, noteIdx) => (
        <div key={note.key} style={{ marginBottom: 16 }}>
          <h3>{note.key}</h3>
          {note.content.map((par, parIdx) => (
            <textarea
              key={parIdx}
              value={par}
              onChange={e => handleChange(noteIdx, parIdx, e.target.value)}
              style={{ width: '100%', minHeight: 40, marginBottom: 8 }}
            />
          ))}
          <button onClick={() => handleChange(noteIdx, note.content.length, '')}>Добавить параграф</button>
        </div>
      ))}
      <button onClick={handleAddNote}>Добавить новый блок заметок</button>
    </div>
  );
} 