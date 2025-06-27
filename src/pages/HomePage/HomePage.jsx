import React, { useEffect, useState } from 'react';
import { useFiles } from '../../FilesContext.jsx';
import { useWebSocket } from '../../WebSocketContext.jsx';

export function lssToInventoryItems(character) {
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

function getDiffFields(obj1, obj2, prefix = '') {
  const diffs = [];
  const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
  for (const key of keys) {
    const val1 = obj1 ? obj1[key] : undefined;
    const val2 = obj2 ? obj2[key] : undefined;
    if (typeof val1 === 'object' && typeof val2 === 'object' && val1 && val2 && !Array.isArray(val1) && !Array.isArray(val2)) {
      diffs.push(...getDiffFields(val1, val2, prefix + key + '.'));
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({ key: prefix + key, local: val1, server: val2 });
    }
  }
  return diffs;
}

function ConflictDialog({ localChar, serverChar, onChoose }) {
  const diffs = getDiffFields(localChar, serverChar);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#222', color: '#fff', padding: 32, borderRadius: 12, minWidth: 400, maxWidth: 700 }}>
        <h3>Конфликт версий персонажа</h3>
        <div style={{ marginBottom: 16 }}>
          <b>Имя:</b> {typeof localChar.name === 'object' ? localChar.name.value : localChar.name}
        </div>
        <div style={{ maxHeight: 220, overflow: 'auto', marginBottom: 16 }}>
          {diffs.length === 0 ? (
            <div style={{ color: '#8f8' }}>Нет различий</div>
          ) : (
            <table style={{ width: '100%', fontSize: 14, background: '#222', color: '#fff', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#333' }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Поле</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Локально</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Сервер</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map(({ key, local, server }) => (
                  <tr key={key}>
                    <td style={{ padding: 4, color: '#4af' }}>{key}</td>
                    <td style={{ padding: 4, color: '#fa4' }}>{JSON.stringify(local)}</td>
                    <td style={{ padding: 4, color: '#4fa' }}>{JSON.stringify(server)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button onClick={() => onChoose('local')}>Использовать локальную</button>
          <button onClick={() => onChoose('server')}>Использовать серверную</button>
          <button onClick={() => onChoose('both')}>Оставить обе версии</button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ characters, serverCharacters, onSelect, onAddCharacter, onRemoveCharacter, onTauriImport, role, playerId, setServerCharacters }) {
  const { setFilePaths } = useFiles();
  const { send, messages, clearMessages, connected } = useWebSocket();
  const [conflict, setConflict] = useState(null); // { localChar, serverChar }
  const [resolvedIds, setResolvedIds] = useState([]); // playerId[]

  // Запросить персонажей при подключении
  useEffect(() => {
    if (connected) {
      send({ type: 'get_characters' });
    }
  }, [connected, send]);

  // Обработка входящих сообщений — обновляем serverCharacters
  useEffect(() => {
    let updated = false;
    for (const msg of messages) {
      if (msg.type === 'character_data') {
        if (role === 'master') {
          setServerCharacters(prev => {
            const others = prev.filter(c => c.playerId !== msg.playerId);
            return [...others, { playerId: msg.playerId, ...msg.character }];
          });
        } else {
          setServerCharacters([{ playerId, ...msg.character }]);
        }
        updated = true;
      }
      if (msg.type === 'all_characters' && role === 'master') {
        setServerCharacters(msg.characters);
        updated = true;
      }
    }
    if (updated) clearMessages();
  }, [messages, clearMessages, role, playerId, setServerCharacters]);

  // Проверка на конфликт по playerId
  function isConflict(localChar) {
    return serverCharacters.some(s => s.playerId === localChar.playerId);
  }

  // При выборе версии в конфликте
  function handleResolveConflict(choice) {
    if (!conflict) return;
    if (choice === 'local') {
      setServerCharacters(prev => prev.filter(c => c.playerId !== conflict.localChar.playerId));
    } else if (choice === 'server') {
      onRemoveCharacter(conflict.localChar);
    } else if (choice === 'both') {
      const newChar = { ...conflict.localChar, playerId: conflict.localChar.playerId + '_localcopy' };
      onAddCharacter(newChar);
    }
    setResolvedIds(ids => [...ids, conflict.localChar.playerId]);
    setConflict(null);
  }

  // Импорт персонажа — добавляем локально и отправляем на сервер
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
    if (parsed.data && typeof parsed.data === 'string') {
      try {
        parsed = { ...parsed, ...JSON.parse(parsed.data) };
      } catch (err) {
        alert('Ошибка чтения вложенного JSON');
        return;
      }
    }
    if (!parsed.items) {
      parsed.items = lssToInventoryItems(parsed);
    }
    parsed.__original = originalParsed;
    onAddCharacter(parsed); // локально
    send({ type: 'import_character', ownerId: playerId, character: parsed });
    e.target.value = '';
  };

  // Импорт через Tauri — вызываем onTauriImport из App.jsx, затем отправляем на сервер
  const handleTauriImportClick = async () => {
    if (onTauriImport) {
      const parsed = await onTauriImport();
      if (parsed && playerId && send) {
        send({ type: 'import_character', ownerId: playerId, character: parsed });
      }
    }
  };

  const fileInputRef = React.useRef();

  return (
    <div>
      {conflict && (
        <ConflictDialog
          localChar={conflict.localChar}
          serverChar={conflict.serverChar}
          onChoose={handleResolveConflict}
        />
      )}
      <h2>{role === 'master' ? 'Все персонажи' : 'Ваши персонажи'}</h2>
      {role !== 'master' && (
        <button onClick={() => fileInputRef.current.click()} style={{ marginBottom: 8 }}>Добавить персонажа из файла (браузер)</button>
      )}
      {role !== 'master' && (
        <button onClick={handleTauriImportClick} style={{ marginBottom: 16, marginLeft: 8 }}>Открыть через Tauri</button>
      )}
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={e => {
          if (onTauriImport) return; // если используется кастомный импорт
          handleFileChange(e);
        }}
      />
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        {characters.map(char => {
          const conflictServer = serverCharacters.find(s => s.playerId === char.playerId);
          const isResolved = resolvedIds.includes(char.playerId);
          return (
            <div
              key={char.__filePath || char.playerId}
              style={{ border: conflictServer && !isResolved ? '2px solid orange' : '1px solid #888', padding: 16, borderRadius: 8 }}
            >
              <div><b>{typeof char.name === 'object' ? char.name.value : char.name}</b></div>
              <div>Класс: {char.info?.charClass?.value || char.characterClass || (typeof char.charClass === 'object' ? char.charClass.value : char.charClass)}</div>
              <div>Раса: {char.info?.race?.value || char.race || (typeof char.race === 'object' ? char.race.value : char.race)}</div>
              {conflictServer && !isResolved && <div style={{ color: 'orange', fontWeight: 600 }}>Конфликт с сервером</div>}
              <button onClick={() => onSelect(char)}>Выбрать (локальный)</button>
              <button onClick={() => onRemoveCharacter(char)} style={{ marginLeft: 8 }}>Закрыть</button>
              {conflictServer && !isResolved && <button style={{ marginLeft: 8 }} onClick={() => setConflict({ localChar: char, serverChar: conflictServer })}>Разрешить конфликт</button>}
            </div>
          );
        })}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Персонажи с сервера:</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {serverCharacters.map(char => (
          <div
            key={char.playerId + '-server'}
            style={{ border: '1px solid #4af', padding: 16, borderRadius: 8, background: '#1a2333' }}
          >
            <div><b>{typeof char.name === 'object' ? char.name.value : char.name}</b> <span style={{ color: '#4af' }}>[сервер]</span></div>
            <div>Класс: {char.info?.charClass?.value || char.characterClass || (typeof char.charClass === 'object' ? char.charClass.value : char.charClass)}</div>
            <div>Раса: {char.info?.race?.value || char.race || (typeof char.race === 'object' ? char.race.value : char.race)}</div>
            <button onClick={() => onSelect(char)}>Выбрать (серверный)</button>
          </div>
        ))}
      </div>
    </div>
  );
}