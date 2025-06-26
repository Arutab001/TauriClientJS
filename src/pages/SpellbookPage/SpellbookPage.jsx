import React, { useState } from 'react';
import './SpellbookPage.css';

function getSpellLevels(character) {
  // Собираем все ключи вида spells-level-X внутри character.text
  return Object.keys(character.text || {})
    .filter(k => k.startsWith('spells-level-'))
    .map(k => parseInt(k.replace('spells-level-', ''), 10))
    .sort((a, b) => a - b);
}

function getSpellsForLevel(character, level) {
  const key = `spells-level-${level}`;
  const content = character.text?.[key]?.value?.data?.content;
  if (!Array.isArray(content)) return [];
  return content
    .map(par => par.content?.[0]?.text?.trim())
    .filter(Boolean);
}

function getSlots(character, level) {
  const slotObj = character.spells?.[`slots-${level}`];
  if (!slotObj) return null;
  return { value: slotObj.value, filled: slotObj.filled };
}

export default function SpellbookPage({ character, onUpdateCharacter }) {
  const [openLevels, setOpenLevels] = useState([]);
  if (!character) return <div>Нет данных о персонаже</div>;
  const spellLevels = getSpellLevels(character);

  const handleToggle = (level) => {
    setOpenLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleSlotChange = (level, delta) => {
    if (!onUpdateCharacter) return;
    const slots = character.spells[`slots-${level}`];
    if (!slots) return;
    const newFilled = Math.max(0, Math.min(slots.value, (slots.filled || 0) + delta));
    // Обновляем только filled
    onUpdateCharacter({
      ...character,
      spells: {
        ...character.spells,
        [`slots-${level}`]: {
          ...slots,
          filled: newFilled
        }
      }
    });
  };

  return (
    <div className="spellbook-page-container">
      <h1>Книга заклинаний</h1>
      {spellLevels.length === 0 && <div>Нет заклинаний</div>}
      {spellLevels.map(level => {
        const spells = getSpellsForLevel(character, level);
        const slots = getSlots(character, level);
        return (
          <div key={level} className="spell-level-block">
            <div className="spell-level-header" onClick={() => handleToggle(level)}>
              <b>{level === 0 ? 'Фокусы (0)' : `${level} уровень`}</b>
              <span style={{ marginLeft: 16, fontSize: 14, color: '#aaa' }}>
                {slots ? `Ячеек: ${slots.value}, Использовано: ${slots.filled}` : ''}
              </span>
              <span style={{ float: 'right' }}>{openLevels.includes(level) ? '▲' : '▼'}</span>
            </div>
            {openLevels.includes(level) && (
              <div className="spell-level-content">
                {slots && (
                  <div style={{ marginBottom: 8 }}>
                    <button onClick={() => handleSlotChange(level, -1)} disabled={slots.filled <= 0}>-</button>
                    <span style={{ margin: '0 8px' }}>Использовано: {slots.filled} / {slots.value}</span>
                    <button onClick={() => handleSlotChange(level, 1)} disabled={slots.filled >= slots.value}>+</button>
                  </div>
                )}
                <ul>
                  {spells.length === 0 && <li>Нет заклинаний</li>}
                  {spells.map((spell, idx) => <li key={idx}>{spell}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 