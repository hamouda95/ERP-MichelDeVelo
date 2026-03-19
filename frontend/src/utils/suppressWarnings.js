/**
 * Suppression des warnings spécifiques à react-beautiful-dnd
 */

// Supprimer le warning sur defaultProps
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Ignorer les warnings spécifiques à react-beautiful-dnd
  if (
    typeof args[0] === 'string' && 
    args[0].includes('Support for defaultProps will be removed') &&
    args[0].includes('react-beautiful-dnd')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Supprimer les warnings sur memo components
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignorer les erreurs spécifiques à react-beautiful-dnd sur defaultProps
  if (
    typeof args[0] === 'string' && 
    args[0].includes('defaultProps will be removed') &&
    args[0].includes('memo components')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// eslint-disable-next-line import/no-anonymous-default-export
export default () => {
  // Cette fonction est appelée pour initialiser la suppression des warnings
};
