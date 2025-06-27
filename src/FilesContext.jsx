import React, { createContext, useContext, useState } from 'react';

const FilesContext = createContext();

export function useFiles() {
  return useContext(FilesContext);
}

export function FilesProvider({ children }) {
  const [filePaths, setFilePaths] = useState([]); // массив строк

  return (
    <FilesContext.Provider value={{ filePaths, setFilePaths }}>
      {children}
    </FilesContext.Provider>
  );
} 