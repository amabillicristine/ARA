
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons';

export interface PdfConfig {
  filename: string;
  backgroundColor: string | null; // '#FFFFFF' for white, null for original canvas background
}

interface PdfConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PdfConfig) => void;
  initialConfig: PdfConfig;
  onConfigChange: (newConfig: PdfConfig) => void; // To update App's state for persistence
}

const PdfConfigModal: React.FC<PdfConfigModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialConfig,
    onConfigChange 
}) => {
  const [filename, setFilename] = useState(initialConfig.filename);
  const [bgColor, setBgColor] = useState(initialConfig.backgroundColor);

  useEffect(() => {
    if (isOpen) {
        setFilename(initialConfig.filename);
        setBgColor(initialConfig.backgroundColor);
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    const finalFilename = filename.trim() === '' ? 'current-reality-tree.pdf' : filename;
    onSave({ filename: finalFilename, backgroundColor: bgColor });
  };

  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilename(e.target.value);
    onConfigChange({ filename: e.target.value, backgroundColor: bgColor });
  };

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBgColor = e.target.value === 'original' ? null : e.target.value;
    setBgColor(newBgColor);
    onConfigChange({ filename, backgroundColor: newBgColor });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-config-title"
    >
      <div className="bg-gray-700 p-6 rounded-lg shadow-xl w-full max-w-md text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 id="pdf-config-title" className="text-xl font-semibold">Configurar Exportação PDF</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            aria-label="Fechar modal de configuração de PDF"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="pdf-filename" className="block text-sm font-medium text-gray-300 mb-1">
              Nome do Arquivo
            </label>
            <input
              type="text"
              id="pdf-filename"
              value={filename}
              onChange={handleFilenameChange}
              placeholder="ex: arvore_realidade.pdf"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-white"
            />
          </div>

          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-300 mb-2">Cor de Fundo do PDF</legend>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="bg-white"
                    name="bgColor"
                    type="radio"
                    value="#FFFFFF"
                    checked={bgColor === '#FFFFFF'}
                    onChange={handleBgColorChange}
                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-500 bg-gray-600"
                  />
                  <label htmlFor="bg-white" className="ml-3 block text-sm text-gray-200">
                    Branco
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="bg-original"
                    name="bgColor"
                    type="radio"
                    value="original"
                    checked={bgColor === null}
                    onChange={handleBgColorChange}
                    className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-500 bg-gray-600"
                  />
                  <label htmlFor="bg-original" className="ml-3 block text-sm text-gray-200">
                    Original da Tela (atual: cinza claro)
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-500 hover:bg-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-purple-500 transition-colors"
          >
            Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfConfigModal;
