import React, { useState } from 'react';
import { useWebSocket } from '../../WebSocketContext.jsx';

export default function TraitsPage({ character, onUpdateCharacter, playerId }) {
  const initial = character?.text?.traits?.value?.data?.content?.map(par => par.content?.[0]?.text || '') || [''];
  const [traits, setTraits] = useState(initial);
  const { send } = useWebSocket();

  const handleChange = (idx, value) => {
    const newTraits = [...traits];
    newTraits[idx] = value;
    setTraits(newTraits);
    // Сохраняем в character
    const newContent = newTraits.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }]
    }));
    const updatedChar = {
      ...character,
      text: {
        ...character.text,
        traits: {
          value: {
            ...character.text?.traits?.value,
            data: {
              ...character.text?.traits?.value?.data,
              content: newContent
            }
          }
        }
      }
    };
    onUpdateCharacter(updatedChar);
    if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  return (
    <div>
      <h1>Личность</h1>
      {traits.map((trait, idx) => (
        <textarea
          key={idx}
          value={trait}
          onChange={e => handleChange(idx, e.target.value)}
          style={{ width: '100%', minHeight: 40, marginBottom: 8 }}
        />
      ))}
      <button onClick={() => setTraits([...traits, ''])}>Добавить черту</button>
    </div>
  );
} 