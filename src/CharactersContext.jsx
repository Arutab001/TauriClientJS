import React, { createContext, useContext, useState } from 'react';

const CharactersContext = createContext();

export function useCharacters() {
  return useContext(CharactersContext);
}

export function CharactersProvider({ children }) {
  const [characters, setCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);

  return (
    <CharactersContext.Provider value={{
      characters,
      setCharacters,
      selectedChar,
      setSelectedChar
    }}>
      {children}
    </CharactersContext.Provider>
  );
}