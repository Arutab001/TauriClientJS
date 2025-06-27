import React, { useState } from 'react';
import { useWebSocket } from '../../WebSocketContext.jsx';

export default function GoalsPage({ character, onUpdateCharacter, playerId }) {
  const initial = character?.text?.goals?.value?.data?.content?.map(par => par.content?.[0]?.text || '') || [''];
  const [goals, setGoals] = useState(initial);
  const { send } = useWebSocket();

  const handleChange = (idx, value) => {
    const newGoals = [...goals];
    newGoals[idx] = value;
    setGoals(newGoals);
    // Сохраняем в character
    const newContent = newGoals.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }]
    }));
    const updatedChar = {
      ...character,
      text: {
        ...character.text,
        goals: {
          value: {
            ...character.text?.goals?.value,
            data: {
              ...character.text?.goals?.value?.data,
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
      <h1>Цели</h1>
      {goals.map((goal, idx) => (
        <textarea
          key={idx}
          value={goal}
          onChange={e => handleChange(idx, e.target.value)}
          style={{ width: '100%', minHeight: 40, marginBottom: 8 }}
        />
      ))}
      <button onClick={() => setGoals([...goals, ''])}>Добавить цель</button>
    </div>
  );
} 