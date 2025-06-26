import './App.css'
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage/HomePage.jsx';
import InventoryPage from './pages/InventoryPage/InventoryPage.jsx';
import CharacterPage from './pages/CharacterPage/CharacterPage.jsx';
import SpellbookPage from './pages/SpellbookPage/SpellbookPage.jsx';
import SideMenu from './components/SideMenu/SideMenu.jsx';

const LS_KEY = 'dnd-characters';

export default function App() {
  const [selectedChar, setSelectedChar] = useState(null);
  const [currentPage, setCurrentPage] = useState('character');
  const [characterList, setCharacterList] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        setCharacterList(JSON.parse(saved));
      } catch {
        setCharacterList([]);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(characterList));
  }, [characterList]);

  const handleSelectChar = (character) => {
    setSelectedChar(character);
    setCurrentPage('character');
  };

  const handleAddCharacter = (char) => {
    setCharacterList(prev => [...prev, char]);
  };

  const handleUpdateCharacter = (updatedChar) => {
    setCharacterList(prev => prev.map(c => (c === selectedChar ? updatedChar : c)));
    setSelectedChar(updatedChar);
  };

  const handleExit = async () => {
    // Сохраняем все открытые файлы
    if (window.__TAURI__) {
      const { writeTextFile } = await import('@tauri-apps/api/fs');
      // Предполагаем, что у тебя есть массив characters
      for (const char of characterList) {
        if (char.__filePath) {
          // Если у тебя есть оригинальная структура для экспорта — используй её!
          const dataToSave = char.__original
            ? { ...char.__original, data: JSON.stringify({ ...char, __original: undefined, __filePath: undefined }) }
            : char;
          await writeTextFile({
            path: char.__filePath,
            contents: JSON.stringify(dataToSave, null, 2)
          });
        }
      }
      // Закрываем приложение
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.close();
    } else {
      // В браузере — просто перезагрузка или ничего не делаем
      window.close();
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'character':
        return <CharacterPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} />;
      case 'inventory':
        return <InventoryPage character={selectedChar} />;
      case 'spellbook':
        return <SpellbookPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} />;
      default:
        return <CharacterPage character={selectedChar} onUpdateCharacter={handleUpdateCharacter} />;
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
      {!selectedChar ? (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <HomePage
            characters={characterList}
            onSelect={handleSelectChar}
            onAddCharacter={handleAddCharacter}
          />
        </div>
      ) : (
        <>
          <SideMenu onSelectPage={setCurrentPage} onBack={() => setSelectedChar(null)} />
          <div className="main-content">
            {renderCurrentPage()}
            <button onClick={handleExit}>Выйти</button>
          </div>
        </>
      )}
    </div>
  );
}
