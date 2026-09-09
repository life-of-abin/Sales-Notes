import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'my_dukaan_calculator_state';

const DEFAULT_STATE = {
  mode: 'standard', // 'standard' | 'business'
  display: '0',
  expression: '',
  lastOp: null,
  prevValue: null,
  newNumber: true,
  buyPrice: '',
  sellPrice: '',
  qty: '1',
  history: [],
  isMinimized: false,
  isFloatingOpen: false,
};

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.error('Error loading calculator state:', e);
    return DEFAULT_STATE;
  }
}

export const CalculatorContext = createContext(null);

export function CalculatorProvider({ children }) {
  const [calcState, setCalcState] = useState(loadStoredState);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calcState));
    } catch (e) {
      console.error('Error saving calculator state:', e);
    }
  }, [calcState]);

  const setMode = useCallback((mode) => {
    setCalcState((prev) => ({ ...prev, mode }));
  }, []);

  const setBuyPrice = useCallback((buyPrice) => {
    setCalcState((prev) => ({ ...prev, buyPrice }));
  }, []);

  const setSellPrice = useCallback((sellPrice) => {
    setCalcState((prev) => ({ ...prev, sellPrice }));
  }, []);

  const setQty = useCallback((qty) => {
    setCalcState((prev) => ({ ...prev, qty }));
  }, []);

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      case '%': return a * (b / 100);
      default: return b;
    }
  };

  const handleNumber = useCallback((num) => {
    setCalcState((prev) => {
      let newDisplay;
      if (prev.newNumber) {
        newDisplay = String(num);
      } else {
        newDisplay = prev.display === '0' ? String(num) : prev.display + num;
      }
      return {
        ...prev,
        display: newDisplay,
        newNumber: false,
      };
    });
  }, []);

  const handleDecimal = useCallback(() => {
    setCalcState((prev) => {
      if (prev.newNumber) {
        return { ...prev, display: '0.', newNumber: false };
      }
      if (!prev.display.includes('.')) {
        return { ...prev, display: prev.display + '.' };
      }
      return prev;
    });
  }, []);

  const handleOperator = useCallback((op) => {
    setCalcState((prev) => {
      const current = parseFloat(prev.display) || 0;
      if (prev.prevValue !== null && !prev.newNumber && prev.lastOp) {
        const res = calculate(prev.prevValue, current, prev.lastOp);
        return {
          ...prev,
          display: String(res),
          prevValue: res,
          expression: `${res} ${op}`,
          lastOp: op,
          newNumber: true,
        };
      }
      return {
        ...prev,
        prevValue: current,
        expression: `${current} ${op}`,
        lastOp: op,
        newNumber: true,
      };
    });
  }, []);

  const handleEquals = useCallback(() => {
    setCalcState((prev) => {
      if (prev.prevValue === null || prev.lastOp === null) return prev;
      const current = parseFloat(prev.display) || 0;
      const result = calculate(prev.prevValue, current, prev.lastOp);
      const rounded = Math.round(result * 1000) / 1000;
      const formula = `${prev.prevValue} ${prev.lastOp} ${current}`;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newHistoryItem = {
        id: Date.now() + Math.random().toString(),
        expression: formula,
        result: String(rounded),
        time: nowStr,
      };

      const updatedHistory = [newHistoryItem, ...(prev.history || [])].slice(0, 30);

      return {
        ...prev,
        expression: `${formula} =`,
        display: String(rounded),
        prevValue: null,
        lastOp: null,
        newNumber: true,
        history: updatedHistory,
      };
    });
  }, []);

  const handleClear = useCallback(() => {
    setCalcState((prev) => ({
      ...prev,
      display: '0',
      expression: '',
      prevValue: null,
      lastOp: null,
      newNumber: true,
    }));
  }, []);

  const handleBackspace = useCallback(() => {
    setCalcState((prev) => {
      if (prev.display.length <= 1 || prev.newNumber) {
        return { ...prev, display: '0', newNumber: true };
      }
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setCalcState((prev) => ({ ...prev, history: [] }));
  }, []);

  const restoreHistoryItem = useCallback((item) => {
    setCalcState((prev) => ({
      ...prev,
      display: item.result,
      expression: `${item.expression} =`,
      prevValue: null,
      lastOp: null,
      newNumber: true,
    }));
  }, []);

  const minimizeCalculator = useCallback(() => {
    setCalcState((prev) => ({ ...prev, isMinimized: true, isFloatingOpen: false }));
  }, []);

  const maximizeCalculator = useCallback(() => {
    setCalcState((prev) => ({ ...prev, isFloatingOpen: false }));
  }, []);

  const toggleFloatingCalc = useCallback(() => {
    setCalcState((prev) => ({ ...prev, isFloatingOpen: !prev.isFloatingOpen }));
  }, []);

  const closeFloatingCalc = useCallback(() => {
    setCalcState((prev) => ({ ...prev, isFloatingOpen: false }));
  }, []);

  const dismissFloatingBubble = useCallback(() => {
    setCalcState((prev) => ({ ...prev, isMinimized: false, isFloatingOpen: false }));
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        ...calcState,
        setMode,
        setBuyPrice,
        setSellPrice,
        setQty,
        handleNumber,
        handleDecimal,
        handleOperator,
        handleEquals,
        handleClear,
        handleBackspace,
        clearHistory,
        restoreHistoryItem,
        minimizeCalculator,
        maximizeCalculator,
        toggleFloatingCalc,
        closeFloatingCalc,
        dismissFloatingBubble,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
}
