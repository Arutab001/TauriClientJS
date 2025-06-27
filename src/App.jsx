import './App.css'
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage/HomePage.jsx';
import InventoryPage from './pages/InventoryPage/InventoryPage.jsx';
import CharacterPage from './pages/CharacterPage/CharacterPage.jsx';
import SpellbookPage from './pages/SpellbookPage/SpellbookPage.jsx';
import SideMenu from './components/SideMenu/SideMenu.jsx';
import { getLevelAndProf, XP_TABLE } from './Data/LevelUtils.js';
import { useFiles } from './FilesContext';
import RoleSelectPage from './pages/RoleSelectPage.jsx';
import { WebSocketProvider } from './WebSocketContext.jsx';
import { lssToInventoryItems } from './pages/HomePage/HomePage.jsx';
import FeaturesPage from './pages/FeaturesPage/FeaturesPage.jsx';
import TraitsPage from './pages/TraitsPage/TraitsPage.jsx';
import GoalsPage from './pages/GoalsPage/GoalsPage.jsx';
import NotesPage from './pages/NotesPage/NotesPage.jsx';
import ItemsDatabasePage from './pages/ItemsDatabasePage/ItemsDatabasePage.jsx';

export default function App() {
  const [selectedChar, setSelectedChar] = useState(null);
  const [currentPage, setCurrentPage] = useState('character');
  const [characterList, setCharacterList] = useState([]);
  const [serverCharacters, setServerCharacters] = useState([]);
  const [isExiting, setIsExiting] = useState(false);
  const [user, setUser] = useState(null); // { role, playerId }
  const { filePaths } = useFiles();

  // Ключ для localStorage зависит от пользователя
  const LS_KEY = user ? `dnd-characters-${user.playerId}` : 'dnd-characters';

  // Проверяем Tauri при загрузке
  useEffect(() => {
    console.log('App загружен');
  }, []);

  // Load from localStorage on mount/смене пользователя
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        setCharacterList(JSON.parse(saved));
      } catch {
        setCharacterList([]);
      }
    } else {
      setCharacterList([]);
    }
  }, [user]);

  // Save to localStorage on change
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(LS_KEY, JSON.stringify(characterList));
  }, [characterList, user]);

  const handleSelectChar = (character) => {
    // Если мастер выбирает персонажа без playerId, добавляем его из serverCharacters
    if (user?.role === 'master' && !character.playerId) {
      // Пытаемся найти персонажа с таким же именем среди serverCharacters
      const found = serverCharacters.find(c => (c.__filePath === character.__filePath || c.name === character.name));
      if (found && found.playerId) {
        character.playerId = found.playerId;
      } else {
        // Если не нашли, генерируем временный playerId
        character.playerId = 'unknown_' + Math.random().toString(36).slice(2, 10);
      }
    }
    setSelectedChar(character);
    setCurrentPage('character');
  };

  const handleAddCharacter = (char) => {
    setCharacterList(prev => [...prev, char]);
  };

  const handleUpdateCharacter = (updatedChar) => {
    setCharacterList(prev =>
      prev.map(c => (c.__filePath === updatedChar.__filePath ? updatedChar : c))
    );
    setSelectedChar(updatedChar);
  };

  const handleRemoveCharacter = (char) => {
    setCharacterList(prev => prev.filter(c => c !== char));
  };

  const handleTauriImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (!filePath) return;
      const text = await readTextFile(filePath);
      let parsed = JSON.parse(text);
      let originalParsed = JSON.parse(text);
      if (parsed.data && typeof parsed.data === 'string') {
        parsed = { ...parsed, ...JSON.parse(parsed.data) };
      }
      if (!parsed.items) {
        parsed.items = lssToInventoryItems(parsed);
      }
      parsed.__original = originalParsed;
      parsed.__filePath = filePath;
      handleAddCharacter(parsed);
      console.log('Tauri import success:', filePath);
      return parsed;
    } catch (e) {
      alert('Ошибка Tauri-импорта: ' + e);
      console.error(e);
    }
  };

  const saveExit = async () => {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    for (const filePath of filePaths) {
      const realPath = getPathString(filePath);
      const char = characterList.find(c => getPathString(c.__filePath) === realPath);
      if (!char) continue;
      let contents;
      if (char.__original && char.__original.data) {
        // Экспортируем LSS-совместимый формат (как в CharacterPage.jsx)
        const exportObj = { ...char.__original };
        let dataObj;
        try {
          dataObj = JSON.parse(exportObj.data);
        } catch {
          dataObj = {};
        }
        // Обновляем опыт, уровень, бонус мастерства, класс
        const xp = char.info?.experience?.value ?? char.experience ?? 0;
        const { level, prof } = getLevelAndProf(xp);
        if (dataObj.info?.experience) dataObj.info.experience.value = xp;
        if (dataObj.experience !== undefined) dataObj.experience = xp;
        if (dataObj.info?.level) dataObj.info.level.value = level;
        if (dataObj.level !== undefined) dataObj.level = level;
        if (dataObj.proficiency !== undefined) dataObj.proficiency = prof;
        if (dataObj.info?.charClass && char.info?.charClass?.value) dataObj.info.charClass.value = char.info.charClass.value;
        // Обновляем заклинания (text.spells-level-X)
        if (dataObj.text) {
          const allSpellKeys = new Set([
            ...Object.keys(dataObj.text).filter(k => k.startsWith('spells-level-')),
            ...Object.keys(char.text || {}).filter(k => k.startsWith('spells-level-'))
          ]);
          for (const k of allSpellKeys) {
            if (char.text && char.text[k]) {
              dataObj.text[k] = char.text[k];
            } else if (!dataObj.text[k]) {
              dataObj.text[k] = {
                value: {
                  data: {
                    type: 'doc',
                    content: []
                  }
                }
              };
            }
          }
        }
        exportObj.data = JSON.stringify(dataObj);
        contents = JSON.stringify(exportObj, null, 2);
      } else {
        contents = JSON.stringify(char, null, 2);
      }
      await writeTextFile({
        path: realPath,
        contents
      });
    }
  };

  const handleExit = async () => {
    try {
      // Передаём актуальные значения из state
      await saveExit();
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('exit_app');
    } catch (e) {
      console.error('Ошибка при выходе:', e);
    }
  };

  const renderCurrentPage = () => {
    const selectedPlayerId = selectedChar?.playerId || user?.playerId;
    switch (currentPage) {
      case 'character':
        return <CharacterPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'inventory':
        return <InventoryPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'spellbook':
        return <SpellbookPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'features':
        return <FeaturesPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'traits':
        return <TraitsPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'goals':
        return <GoalsPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'notes':
        return <NotesPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
      case 'itemsdb':
        return <ItemsDatabasePage />;
      default:
        return <CharacterPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} playerId={selectedPlayerId} />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
      background: '#222',
      alignItems: 'flex-start',
    }}>
      {!user ? (
        <RoleSelectPage onSelectRole={setUser} />
      ) : (
        <WebSocketProvider role={user.role} playerId={user.playerId}>
          {!selectedChar ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <HomePage
                characters={characterList}
                serverCharacters={serverCharacters}
                onSelect={handleSelectChar}
                onAddCharacter={handleAddCharacter}
                onRemoveCharacter={handleRemoveCharacter}
                onTauriImport={handleTauriImport}
                role={user.role}
                playerId={user.playerId}
                setServerCharacters={setServerCharacters}
              />
            </div>
          ) : (
            <>
              <SideMenu onSelectPage={setCurrentPage} onBack={() => setSelectedChar(null)} />
              <div className="main-content">
                {renderCurrentPage()}
                <button onClick={handleExit} disabled={isExiting}>{isExiting ? 'Сохраняю...' : 'Выйти'}</button>
              </div>
            </>
          )}
        </WebSocketProvider>
      )}
    </div>
  );
}
