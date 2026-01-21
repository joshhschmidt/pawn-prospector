import { OpeningBucket, PlayerColor } from '@/types/chess';

/**
 * Comprehensive chess opening classifier
 * Analyzes the first 10-15 moves to identify the opening
 */

// Helper to check if a move sequence contains specific moves
const movesInclude = (moves: string[], ...targets: string[]): boolean => {
  return targets.every(target => moves.some(m => m === target || m === target + '+' || m === target + '#'));
};

const moveAt = (moves: string[], index: number): string => {
  return moves[index] || '';
};

// Get moves by color
const getWhiteMoves = (moves: string[]): string[] => moves.filter((_, i) => i % 2 === 0);
const getBlackMoves = (moves: string[]): string[] => moves.filter((_, i) => i % 2 === 1);

/**
 * Classify opening when player is White
 */
const classifyAsWhite = (moves: string[]): OpeningBucket => {
  if (moves.length < 2) return 'other_white';
  
  const whiteMoves = getWhiteMoves(moves);
  const blackMoves = getBlackMoves(moves);
  const first = moveAt(moves, 0); // White's first move
  const second = moveAt(moves, 1); // Black's response
  
  // 1.e4 openings
  if (first === 'e4') {
    // Check for specific openings based on Black's response
    if (second === 'e5') {
      // 1.e4 e5 responses
      const white2 = moveAt(moves, 2);
      
      if (white2 === 'Nf3') {
        const black2 = moveAt(moves, 3);
        if (black2 === 'Nc6') {
          const white3 = moveAt(moves, 4);
          if (white3 === 'Bb5' || white3 === 'Bb5+') return 'ruy_lopez';
          if (white3 === 'Bc4') return 'italian_game';
          if (white3 === 'd4') return 'scotch_game';
          if (white3 === 'Nc3') {
            const black3 = moveAt(moves, 5);
            if (black3 === 'Nf6') return 'four_knights';
          }
          return 'italian_game'; // Default for Nf3 Nc6
        }
        if (black2 === 'Nf6') return 'petrov_defense';
        if (black2 === 'd6') return 'philidor_defense';
      }
      
      if (white2 === 'Bc4') return 'bishops_opening';
      if (white2 === 'f4') return 'kings_gambit';
      if (white2 === 'Nc3') return 'vienna_game';
      if (white2 === 'd4') return 'center_game';
      if (white2 === 'c3') return 'ponziani';
      
      return 'italian_game'; // Default 1.e4 e5
    }
    
    // Against Sicilian (1...c5), classify as White opening
    if (second === 'c5') {
      const white2 = moveAt(moves, 2);
      if (white2 === 'c3') return 'sicilian_alapin';
      if (white2 === 'Nc3') {
        const black2 = moveAt(moves, 3);
        if (black2 === 'Nc6') return 'sicilian_closed';
      }
      return 'italian_game'; // Open Sicilian from White perspective
    }
    
    // Against French (1...e6)
    if (second === 'e6') return 'italian_game';
    
    // Against Caro-Kann (1...c6)
    if (second === 'c6') return 'italian_game';
    
    // Against Scandinavian (1...d5)
    if (second === 'd5') return 'center_game';
    
    return 'italian_game'; // Default 1.e4
  }
  
  // 1.d4 openings
  if (first === 'd4') {
    const white2 = moveAt(moves, 2);
    const white3 = moveAt(moves, 4);
    const white4 = moveAt(moves, 6);
    
    // Check for Queen's Gambit
    if (movesInclude(whiteMoves.slice(0, 4), 'c4')) {
      // Check for Catalan (g3 + Bg2)
      if (movesInclude(whiteMoves.slice(0, 6), 'g3', 'Bg2')) {
        return 'catalan';
      }
      return 'queens_gambit';
    }
    
    // London System: Bf4 without early c4
    if (movesInclude(whiteMoves.slice(0, 5), 'Bf4') && !movesInclude(whiteMoves.slice(0, 4), 'c4')) {
      return 'london_system';
    }
    
    // Trompowsky: 1.d4 Nf6 2.Bg5
    if (second === 'Nf6' && white2 === 'Bg5') {
      return 'trompowsky';
    }
    
    // Torre Attack: 1.d4 Nf6 2.Nf3 + Bg5
    if (movesInclude(whiteMoves.slice(0, 4), 'Nf3', 'Bg5')) {
      return 'torre_attack';
    }
    
    // Colle System: d4, Nf3, e3, Bd3
    if (movesInclude(whiteMoves.slice(0, 5), 'e3', 'Bd3', 'Nf3')) {
      return 'colle_system';
    }
    
    // Veresov: d4, Nc3, Bg5 (without c4)
    if (movesInclude(whiteMoves.slice(0, 4), 'Nc3', 'Bg5') && !movesInclude(whiteMoves.slice(0, 4), 'c4')) {
      return 'veresov';
    }
    
    // Blackmar-Diemer: 1.d4 d5 2.e4
    if (second === 'd5' && white2 === 'e4') {
      return 'blackmar_diemer';
    }
    
    return 'queens_gambit'; // Default 1.d4
  }
  
  // 1.c4 English Opening
  if (first === 'c4') {
    return 'english_opening';
  }
  
  // 1.Nf3 Réti Opening
  if (first === 'Nf3') {
    // Check for King's Indian Attack setup
    if (movesInclude(whiteMoves.slice(0, 6), 'g3', 'Bg2', 'd3')) {
      return 'kings_indian_attack';
    }
    return 'reti_opening';
  }
  
  // 1.f4 Bird's Opening
  if (first === 'f4') {
    return 'birds_opening';
  }
  
  // 1.b3 Larsen's Opening
  if (first === 'b3') {
    return 'larsen_opening';
  }
  
  // 1.g4 Grob Attack
  if (first === 'g4') {
    return 'grob_attack';
  }
  
  return 'other_white';
};

/**
 * Classify opening when player is Black
 */
const classifyAsBlack = (moves: string[]): OpeningBucket => {
  if (moves.length < 2) return 'other_black';
  
  const whiteMoves = getWhiteMoves(moves);
  const blackMoves = getBlackMoves(moves);
  const first = moveAt(moves, 0); // White's first move
  const second = moveAt(moves, 1); // Black's first move
  
  // Against 1.e4
  if (first === 'e4') {
    // Sicilian Defense
    if (second === 'c5') {
      // Detailed Sicilian classification
      const white2 = moveAt(moves, 2);
      
      // Alapin (2.c3)
      if (white2 === 'c3') return 'sicilian_alapin';
      
      // Closed Sicilian (2.Nc3 followed by g3)
      if (white2 === 'Nc3') {
        if (movesInclude(whiteMoves.slice(0, 5), 'g3')) {
          return 'sicilian_closed';
        }
      }
      
      // Open Sicilian variations
      if (white2 === 'Nf3') {
        const black2 = moveAt(moves, 3);
        
        // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4
        if (black2 === 'd6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Najdorf: ...a6
          if (movesInclude(laterBlack, 'a6')) {
            if (movesInclude(laterBlack, 'e5')) return 'sicilian_najdorf';
            return 'sicilian_najdorf';
          }
          // Dragon: ...g6 + ...Bg7
          if (movesInclude(laterBlack, 'g6', 'Bg7')) return 'sicilian_dragon';
          // Scheveningen: ...e6
          if (movesInclude(laterBlack, 'e6') && !movesInclude(laterBlack, 'a6')) {
            return 'sicilian_scheveningen';
          }
          // Classical: ...Nc6 + ...Nf6
          if (movesInclude(laterBlack, 'Nc6', 'Nf6')) return 'sicilian_classical';
        }
        
        // 1.e4 c5 2.Nf3 Nc6
        if (black2 === 'Nc6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Sveshnikov: ...e5
          if (movesInclude(laterBlack, 'e5')) return 'sicilian_sveshnikov';
          // Accelerated Dragon: ...g6 (without d6 first)
          if (movesInclude(laterBlack, 'g6')) return 'sicilian_accelerated_dragon';
        }
        
        // 1.e4 c5 2.Nf3 e6 (Taimanov/Kan)
        if (black2 === 'e6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Taimanov: ...Nc6
          if (movesInclude(laterBlack, 'Nc6')) return 'sicilian_taimanov';
          // Kan: ...a6
          if (movesInclude(laterBlack, 'a6')) return 'sicilian_kan';
        }
        
        // 1.e4 c5 2.Nf3 g6 (Accelerated Dragon / Hyper-Accelerated)
        if (black2 === 'g6') return 'sicilian_accelerated_dragon';
      }
      
      return 'sicilian_other';
    }
    
    // French Defense
    if (second === 'e6') {
      const black2 = moveAt(moves, 3);
      if (black2 === 'd5') return 'french_defense';
      return 'french_defense';
    }
    
    // Caro-Kann Defense
    if (second === 'c6') {
      return 'caro_kann';
    }
    
    // Scandinavian Defense
    if (second === 'd5') {
      return 'scandinavian';
    }
    
    // Alekhine's Defense
    if (second === 'Nf6') {
      return 'alekhine_defense';
    }
    
    // Pirc Defense: 1.e4 d6 followed by Nf6 and g6
    if (second === 'd6') {
      if (movesInclude(blackMoves.slice(0, 5), 'Nf6', 'g6')) {
        return 'pirc_defense';
      }
      if (movesInclude(blackMoves.slice(0, 5), 'g6')) {
        return 'modern_defense';
      }
      return 'philidor_defense';
    }
    
    // Modern Defense: 1.e4 g6
    if (second === 'g6') {
      return 'modern_defense';
    }
    
    // Owen's Defense: 1.e4 b6
    if (second === 'b6') {
      return 'owen_defense';
    }
    
    // 1.e4 e5 - considered from Black perspective
    if (second === 'e5') {
      return 'kings_pawn_other';
    }
    
    return 'kings_pawn_other';
  }
  
  // Against 1.d4
  if (first === 'd4') {
    // 1.d4 Nf6
    if (second === 'Nf6') {
      const white2 = moveAt(moves, 2);
      const black2 = moveAt(moves, 3);
      
      // Check for Indian defenses
      if (white2 === 'c4') {
        // 1.d4 Nf6 2.c4 g6 - King's Indian or Grünfeld
        if (black2 === 'g6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Grünfeld: ...d5
          if (movesInclude(laterBlack, 'd5')) return 'grunfeld';
          // King's Indian: ...Bg7 + ...d6
          if (movesInclude(laterBlack, 'Bg7', 'd6')) return 'kings_indian';
          return 'kings_indian';
        }
        
        // 1.d4 Nf6 2.c4 e6
        if (black2 === 'e6') {
          const white3 = moveAt(moves, 4);
          const black3 = moveAt(moves, 5);
          
          // Nimzo-Indian: 2...e6 3.Nc3 Bb4
          if (white3 === 'Nc3' && black3 === 'Bb4') return 'nimzo_indian';
          
          // Queen's Indian: 2...e6 3.Nf3 b6
          if (white3 === 'Nf3') {
            if (black3 === 'b6') return 'queens_indian';
            if (black3 === 'Bb4+' || black3 === 'Bb4') return 'bogo_indian';
          }
          
          // Bogo-Indian after 3.Nc3 Bb4+ or 3.Nf3 Bb4+
          if (movesInclude(blackMoves.slice(0, 5), 'Bb4', 'Bb4+')) {
            if (white3 === 'Nf3') return 'bogo_indian';
            if (white3 === 'Nc3') return 'nimzo_indian';
          }
          
          return 'queens_gambit_declined';
        }
        
        // 1.d4 Nf6 2.c4 c5 - Benoni
        if (black2 === 'c5') return 'benoni';
        
        // 1.d4 Nf6 2.c4 e5 - Budapest Gambit
        if (black2 === 'e5') return 'budapest_gambit';
      }
      
      return 'd4_other';
    }
    
    // 1.d4 d5 - Queen's Gambit structures
    if (second === 'd5') {
      const white2 = moveAt(moves, 2);
      
      if (white2 === 'c4') {
        const black2 = moveAt(moves, 3);
        
        // Queen's Gambit Accepted
        if (black2 === 'dxc4') return 'queens_gambit_accepted';
        
        // Slav Defense: ...c6
        if (black2 === 'c6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Semi-Slav: ...e6
          if (movesInclude(laterBlack, 'e6')) return 'semi_slav';
          return 'slav_defense';
        }
        
        // Queen's Gambit Declined: ...e6
        if (black2 === 'e6') {
          const laterBlack = blackMoves.slice(0, 8);
          // Tarrasch: ...c5
          if (movesInclude(laterBlack, 'c5')) return 'tarrasch_defense';
          return 'queens_gambit_declined';
        }
        
        // Chigorin Defense: ...Nc6
        if (black2 === 'Nc6') return 'chigorin_defense';
      }
      
      return 'queens_gambit_declined';
    }
    
    // 1.d4 f5 - Dutch Defense
    if (second === 'f5') {
      return 'dutch_defense';
    }
    
    // 1.d4 e6
    if (second === 'e6') {
      const black2 = moveAt(moves, 3);
      if (black2 === 'f5') return 'dutch_defense';
      return 'queens_gambit_declined';
    }
    
    // 1.d4 c5 - Benoni structures
    if (second === 'c5') {
      return 'benoni';
    }
    
    // 1.d4 g6 - Modern/King's Indian
    if (second === 'g6') {
      const laterBlack = blackMoves.slice(0, 6);
      if (movesInclude(laterBlack, 'd6', 'Nf6')) return 'kings_indian';
      return 'modern_defense';
    }
    
    return 'd4_other';
  }
  
  // Against 1.c4 (English)
  if (first === 'c4') {
    // Symmetrical: 1...c5
    if (second === 'c5') return 'english_symmetrical';
    // Anglo-Indian: 1...Nf6
    if (second === 'Nf6' || second === 'e6') return 'anglo_indian';
    return 'other_black';
  }
  
  // Against 1.Nf3
  if (first === 'Nf3') {
    if (second === 'Nf6' || second === 'd5' || second === 'c5') {
      return 'anglo_indian';
    }
    return 'other_black';
  }
  
  return 'other_black';
};

/**
 * Main classification function
 */
export const classifyOpening = (moves: string[], playerColor: PlayerColor): OpeningBucket | null => {
  if (moves.length < 2) return null;
  
  // Get first 20 plies (10 moves each)
  const openingMoves = moves.slice(0, 20);
  
  if (playerColor === 'white') {
    return classifyAsWhite(openingMoves);
  } else {
    return classifyAsBlack(openingMoves);
  }
};

// Re-export for backward compatibility
export default classifyOpening;
