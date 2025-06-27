import React, { useState } from 'react';
import { useWebSocket } from '../../WebSocketContext.jsx';

export default function FeaturesPage({ character, onUpdateCharacter, playerId }) {
  const initial = character?.text?.features?.value?.data?.content?.map(par => par.content?.[0]?.text || '') || [''];
  const [features, setFeatures] = useState(initial);
  const { send } = useWebSocket();

  const handleChange = (idx, value) => {
    const newFeatures = [...features];
    newFeatures[idx] = value;
    setFeatures(newFeatures);
    // Сохраняем в character
    const newContent = newFeatures.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }]
    }));
    const updatedChar = {
      ...character,
      text: {
        ...character.text,
        features: {
          value: {
            ...character.text?.features?.value,
            data: {
              ...character.text?.features?.value?.data,
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
      <h1>Способности</h1>
      {features.map((feature, idx) => (
        <textarea
          key={idx}
          value={feature}
          onChange={e => handleChange(idx, e.target.value)}
          style={{ width: '100%', minHeight: 40, marginBottom: 8 }}
        />
      ))}
      <button onClick={() => setFeatures([...features, ''])}>Добавить способность</button>
    </div>
  );
} 