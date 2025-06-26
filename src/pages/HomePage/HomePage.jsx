import React from 'react'

function lssToInventoryItems(character) {
  let items = [];
  // Оборудование (equipment) — ищем по правильному пути
  const eqArr = character.text?.equipment?.value?.data?.content;
  if (Array.isArray(eqArr)) {
    eqArr.forEach((entry, idx) => {
      if (entry.type === 'paragraph' && entry.content && entry.content[0]?.text) {
        const text = entry.content[0].text;
        // Если есть запятые — разбиваем на предметы
        text.split(',').map(s => s.trim()).forEach((itemText, subIdx) => {
          if (itemText) {
            items.push({
              id: `eq-${idx}-${subIdx}`,
              name: itemText,
              size: { width: 1, height: 1 },
              weight: 1,
              position: { x: (idx + subIdx) % 8, y: Math.floor((idx + subIdx) / 8) }
            });
          }
        });
      }
    });
  }
  // Оружие (weaponsList) — только если есть имя
  if (Array.isArray(character.weaponsList)) {
    character.weaponsList.forEach((w, idx) => {
      const weaponName = w.name?.value?.trim();
      if (weaponName) {
        items.push({
          id: `w-${idx}`,
          name: weaponName,
          size: { width: 1, height: 1 },
          weight: 1,
          position: { x: (idx + 10) % 8, y: Math.floor((idx + 10) / 8) }
        });
      }
    });
  }
  return items;
}

export default function HomePage({ characters, onSelect, onAddCharacter }) {
  const fileInputRef = React.useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let parsed;
    let originalParsed;
    try {
      parsed = JSON.parse(text);
      originalParsed = JSON.parse(text);
    } catch (err) {
      alert('Ошибка чтения JSON');
      return;
    }
    // Если есть поле data, парсим его
    if (parsed.data && typeof parsed.data === 'string') {
      try {
        parsed = { ...parsed, ...JSON.parse(parsed.data) };
      } catch (err) {
        alert('Ошибка чтения вложенного JSON');
        return;
      }
    }
    // Добавляем items для инвентаря, если это LSS-структура
    if (!parsed.items) {
      parsed.items = lssToInventoryItems(parsed);
    }
    // Сохраняем оригинал для экспорта
    parsed.__original = originalParsed;
    onAddCharacter(parsed);
    e.target.value = '';
  };

  return (
    <div>
      <h2>Выберите персонажа</h2>
      <button onClick={() => fileInputRef.current.click()} style={{ marginBottom: 8 }}>Добавить персонажа из файла (браузер)</button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div style={{ display: 'flex', gap: 24 }}>
        {characters.map(char => (
          <div key={char.name?.value || char.name} style={{ border: '1px solid #888', padding: 16, borderRadius: 8 }}>
            <div><b>{typeof char.name === 'object' ? char.name.value : char.name}</b></div>
            <div>Класс: {char.info?.charClass?.value || char.characterClass || (typeof char.charClass === 'object' ? char.charClass.value : char.charClass)}</div>
            <div>Раса: {char.info?.race?.value || char.race || (typeof char.race === 'object' ? char.race.value : char.race)}</div>
            <button onClick={() => onSelect(char)}>Выбрать</button>
          </div>
        ))}
      </div>
    </div>
  )
}