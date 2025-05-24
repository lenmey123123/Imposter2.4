// contexts/GameContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { GameState, GameContextType, Player, GameSettings, GamePhase, PlayerRole } from '../types/game'; // Pfad anpassen
import { CATEGORIES, RANDOM_CATEGORY_NAME } from '../constants/Words'; // Pfad anpassen

const DefaultImposterCount = 1;
const DEFAULT_ROUND_TIME_SECONDS = 90;

const initialGameState: GameState = {
  gamePhase: 'setup_step1',
  settings: {
    playerCount: 3,
    categoryName: RANDOM_CATEGORY_NAME,
    roundTimeInSeconds: DEFAULT_ROUND_TIME_SECONDS,
    imposterCount: DefaultImposterCount,
    hintModeEnabled: false,
  },
  players: [],
  currentPlayerTurnForRoleReveal: 0,
  currentWord: '',
  currentCategory: RANDOM_CATEGORY_NAME,
  timerValue: DEFAULT_ROUND_TIME_SECONDS,
  isTimerRunning: false,
  isLoading: true,
  roundTimeInSeconds: DEFAULT_ROUND_TIME_SECONDS,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGameState(prev => ({ ...prev, isLoading: false }));
      console.log('[GameContext] Initial context load complete (isLoading: false)');
    }, 100);
    return () => {
      clearTimeout(timer);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // console.log('[GameContext] STATE UPDATE:', gameState.gamePhase, 'Timer:', gameState.timerValue, 'Running:', gameState.isTimerRunning);

  const getWordsForCategory = (categoryName?: string): string[] => {
    if (!categoryName || categoryName === RANDOM_CATEGORY_NAME) {
      return CATEGORIES.flatMap(cat => cat.words);
    }
    const selectedCategory = CATEGORIES.find(cat => cat.name === categoryName);
    return selectedCategory ? selectedCategory.words : CATEGORIES.flatMap(cat => cat.words);
  };

  const initializeGame = (playerCount: number, imposterCount: number, playerNamesInput?: string[], categoryName = RANDOM_CATEGORY_NAME, hintMode = false, roundTime = DEFAULT_ROUND_TIME_SECONDS) => {
    console.log(`[GameContext] initializeGame: playerCount=${playerCount}, category=${categoryName}, hintMode=${hintMode}, roundTime=${roundTime}`);
    setGameState(prev => ({ ...prev, isLoading: true }));
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); // Alten Timer stoppen

    const settings: GameSettings = {
      playerCount,
      categoryName,
      roundTimeInSeconds: roundTime,
      imposterCount: DefaultImposterCount,
      hintModeEnabled: hintMode,
    };

    const words = getWordsForCategory(categoryName);
    if (words.length === 0) {
        console.error("[GameContext] No words found for category:", categoryName);
        setGameState(prev => ({ ...prev, isLoading: false }));
        return;
    }
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const erzfeindIndex = Math.floor(Math.random() * playerCount);
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      const isErzfeind = i === erzfeindIndex;
      players.push({
        id: `player-${i + 1}`, name: `Spieler ${i + 1}`, role: isErzfeind ? 'Erzfeind' : 'Wortkenner',
        isImposter: isErzfeind, roleWord: isErzfeind ? undefined : randomWord, fellowArchEnemies: [],
      });
    }

    setGameState(prev => ({
      ...prev,
      gamePhase: 'RoleReveal',
      settings,
      players,
      currentWord: randomWord,
      currentCategory: categoryName,
      currentPlayerTurnForRoleReveal: 0,
      timerValue: roundTime,
      isTimerRunning: false,
      isLoading: false,
      roundTimeInSeconds: roundTime,
    }));
  };

  const proceedToNextRoleReveal = (caller?: string) => {
    console.log(`[GameContext] proceedToNextRoleReveal by ${caller}. Turn: ${gameState.currentPlayerTurnForRoleReveal}, Players: ${gameState.settings.playerCount}`);
    setGameState(prev => {
      const nextTurn = prev.currentPlayerTurnForRoleReveal + 1;
      if (nextTurn < prev.settings.playerCount) {
        return { ...prev, currentPlayerTurnForRoleReveal: nextTurn, gamePhase: 'RoleReveal' };
      } else {
        // Alle Rollen aufgedeckt, Timer zurücksetzen für den neuen GameScreen
        return { 
            ...prev, 
            gamePhase: 'WordPhase', // Phase, die der GameScreen erwartet
            currentPlayerTurnForRoleReveal: nextTurn, 
            timerValue: prev.settings.roundTimeInSeconds, // Timer zurücksetzen
            isTimerRunning: false // Timer ist initial nicht laufend
        };
      }
    });
  };

  const setGamePhase = (phase: GamePhase) => {
    console.log(`[GameContext] Setting gamePhase to: ${phase}`);
    setGameState(prev => ({ ...prev, gamePhase: phase }));
  };
  
  const startGameTimer = () => {
    console.log(`[GameContext] startGameTimer. Current value: ${gameState.timerValue}`);
    if (gameState.isTimerRunning || gameState.timerValue <= 0) {
      console.log(`[GameContext] Timer already running or value is 0. Current isTimerRunning: ${gameState.isTimerRunning}`);
      return;
    }
    setGameState(prev => ({ ...prev, isTimerRunning: true }));
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timerValue > 0 && prev.isTimerRunning) {
          return { ...prev, timerValue: prev.timerValue - 1 };
        } else {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          console.log('[GameContext] Timer tick: Timer reached 0 or was stopped.');
          // goToResolutionPhase wird vom GameScreen aufgerufen, wenn timerValue 0 erreicht und isTimerRunning true war.
          // Hier stellen wir sicher, dass isTimerRunning false ist.
          return { ...prev, isTimerRunning: false, gamePhase: prev.timerValue <=0 ? 'Resolution' : prev.gamePhase };
        }
      });
    }, 1000);
  };

  const stopGameTimer = () => {
    console.log('[GameContext] stopGameTimer.');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setGameState(prev => ({ ...prev, isTimerRunning: false }));
  };

  const setTimerValue = (value: number) => {
      setGameState(prev => ({...prev, timerValue: value}));
  };

  const goToResolutionPhase = (params?: { reasonKey?: string }) => {
    console.log(`[GameContext] goToResolutionPhase. Reason: ${params?.reasonKey}`);
    stopGameTimer();
    setGameState(prev => ({ ...prev, gamePhase: 'Resolution' }));
  };

  const changeSecretWord = (newWord: string) => {
    console.log(`[GameContext] changeSecretWord to: ${newWord}`);
    setGameState(prev => ({
      ...prev,
      currentWord: newWord,
      players: prev.players.map(p => p.role === 'Wortkenner' ? { ...p, roleWord: newWord } : p)
    }));
  };

  const getImposter = (): Player | undefined => {
    return gameState.players.find(p => p.role === 'Erzfeind');
  };

  const endGame = () => {
    console.log('[GameContext] endGame: Setting phase to GameOver.');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setGameState(prev => ({ ...prev, gamePhase: 'GameOver' }));
  };

  const resetGame = () => {
    console.log('[GameContext] resetGame: Resetting to initial state (setup_step1).');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setGameState({...initialGameState, gamePhase: 'setup_step1', isLoading: true});
  };

  return (
    <GameContext.Provider value={{
        gameState,
        initializeGame,
        proceedToNextRoleReveal,
        setGamePhase,
        startGameTimer,
        stopGameTimer,
        setTimerValue,
        goToResolutionPhase,
        changeSecretWord,
        getImposter,
        endGame,
        resetGame,
        getWordsForCategory,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};