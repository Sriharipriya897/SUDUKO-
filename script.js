document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const BOARD_SIZE = 9;
    const SUBGRID_SIZE = 3;
    const MAX_HINTS = 3;
    const EMPTY = 0;

    let solution = [];
    let initialPuzzle = [];
    let userBoard = [];

    let timerInterval = null;
    let secondsElapsed = 0;
    let score = 0;
    let hintsRemaining = MAX_HINTS;
    let isGameActive = false;

    // --- DOM Elements ---
    // Views
    const viewLanding = document.getElementById('landing-view');
    const viewGame = document.getElementById('game-view');
    const btnStartGame = document.getElementById('btn-start-game');

    // Game Elements
    const uiBoard = document.getElementById('sudoku-board');
    const uiTimer = document.getElementById('timer');
    const uiScore = document.getElementById('score');
    const uiHints = document.getElementById('hints');
    const btnNew = document.getElementById('btn-new-game');
    const btnHint = document.getElementById('btn-hint');
    const btnCheck = document.getElementById('btn-check');
    const btnSolve = document.getElementById('btn-solve');
    const btnHome = document.getElementById('btn-home');

    // --- View Navigation ---

    function showGame() {
        // Animation Handle
        viewLanding.style.opacity = '0';
        viewLanding.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            viewLanding.classList.add('hidden');
            viewGame.classList.remove('hidden');
            viewGame.classList.add('fade-in');

            // Only start if not already active or if needed
            // Actually, we should always start new game when entering? 
            // Or just resume if we had one? 
            // User request usually implies "Start Game" -> New Game.
            startNewGame();
        }, 300);
    }

    function showLanding() {
        if (isGameActive) {
            if (!confirm("Return to home? Your progress will be lost.")) return;
            clearInterval(timerInterval);
            isGameActive = false;
        }

        viewGame.classList.remove('fade-in');
        viewGame.classList.add('hidden');

        viewLanding.classList.remove('hidden');
        viewLanding.style.opacity = '0';

        // Reflow for animation
        void viewLanding.offsetWidth;

        viewLanding.style.opacity = '1';
    }

    // --- Helpers ---
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const updateStats = () => {
        uiScore.textContent = score;
        uiHints.textContent = `${hintsRemaining}/${MAX_HINTS}`;
        if (hintsRemaining <= 0) btnHint.disabled = true;
    };

    // --- Core Sudoku Logic ---

    function generateSolution() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(EMPTY));
        fillDiagonal(board);
        solveBacktrack(board);
        return board;
    }

    function fillDiagonal(board) {
        for (let i = 0; i < BOARD_SIZE; i += SUBGRID_SIZE) {
            fillBox(board, i, i);
        }
    }

    function fillBox(board, row, col) {
        let num;
        for (let i = 0; i < SUBGRID_SIZE; i++) {
            for (let j = 0; j < SUBGRID_SIZE; j++) {
                do {
                    num = Math.floor(Math.random() * 9) + 1;
                } while (!isSafeInBox(board, row, col, num));
                board[row + i][col + j] = num;
            }
        }
    }

    function isSafeInBox(board, startRow, startCol, num) {
        for (let i = 0; i < SUBGRID_SIZE; i++) {
            for (let j = 0; j < SUBGRID_SIZE; j++) {
                if (board[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    }

    function checkIfSafe(board, row, col, num) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[row][x] === num && x !== col) return false;
            if (board[x][col] === num && x !== row) return false;
        }
        const startRow = row - (row % SUBGRID_SIZE);
        const startCol = col - (col % SUBGRID_SIZE);
        return isSafeInBox(board, startRow, startCol, num);
    }

    function solveBacktrack(board) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === EMPTY) {
                    for (let num = 1; num <= 9; num++) {
                        if (checkIfSafe(board, row, col, num)) {
                            board[row][col] = num;
                            if (solveBacktrack(board)) return true;
                            board[row][col] = EMPTY;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function createPuzzle(fullBoard, missingCount = 40) {
        let puzzle = fullBoard.map(r => [...r]);
        let attempts = missingCount;
        while (attempts > 0) {
            let r = Math.floor(Math.random() * BOARD_SIZE);
            let c = Math.floor(Math.random() * BOARD_SIZE);
            if (puzzle[r][c] !== EMPTY) {
                puzzle[r][c] = EMPTY;
                attempts--;
            }
        }
        return puzzle;
    }

    // --- Game Logic ---

    function startNewGame() {
        isGameActive = true;
        secondsElapsed = 0;
        score = 0;
        hintsRemaining = MAX_HINTS;

        uiTimer.textContent = "00:00";
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            uiTimer.textContent = formatTime(secondsElapsed);
        }, 1000);

        btnHint.disabled = false;
        btnCheck.disabled = false;
        btnSolve.disabled = false;

        solution = generateSolution();
        initialPuzzle = createPuzzle(solution, 45);
        userBoard = initialPuzzle.map(r => [...r]);

        renderBoard();
        updateStats();
    }

    function renderBoard() {
        uiBoard.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';

                const val = userBoard[r][c];
                const isGiven = initialPuzzle[r][c] !== EMPTY;

                if (isGiven) {
                    cellDiv.classList.add('given');
                    cellDiv.textContent = val;
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.inputMode = 'numeric';
                    if (val !== EMPTY) input.value = val;

                    input.dataset.row = r;
                    input.dataset.col = c;

                    input.addEventListener('input', (e) => handleInput(e, r, c));
                    input.addEventListener('keydown', (e) => handleNavigation(e, r, c));

                    cellDiv.appendChild(input);
                }
                uiBoard.appendChild(cellDiv);
            }
        }
    }

    function handleInput(e, r, c) {
        const input = e.target;
        const val = input.value;
        const num = parseInt(val);

        input.parentElement.classList.remove('wrong', 'correct');

        if (!val) {
            userBoard[r][c] = EMPTY;
            return;
        }

        if (isNaN(num) || num < 1 || num > 9) {
            input.value = '';
            userBoard[r][c] = EMPTY;
            return;
        }

        userBoard[r][c] = num;
        checkWinCondition();
    }

    function checkWinCondition() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (userBoard[r][c] === EMPTY) return;
            }
        }

        let isCorrect = true;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (userBoard[r][c] !== solution[r][c]) {
                    isCorrect = false;
                    break;
                }
            }
        }

        if (isCorrect) {
            endGame(true);
        }
    }

    function checkBoard() {
        if (!isGameActive) return;
        const inputs = document.querySelectorAll('input');

        inputs.forEach(input => {
            const r = parseInt(input.dataset.row);
            const c = parseInt(input.dataset.col);
            const val = parseInt(input.value);

            if (!val) return;

            input.parentElement.classList.remove('correct', 'wrong');

            if (val === solution[r][c]) {
                input.parentElement.classList.add('correct');
            } else {
                input.parentElement.classList.add('wrong');
            }
        });
    }

    function giveHint() {
        if (!isGameActive || hintsRemaining <= 0) return;

        let empties = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (userBoard[r][c] === EMPTY) empties.push({ r, c });
            }
        }

        if (empties.length === 0) return;

        const { r, c } = empties[Math.floor(Math.random() * empties.length)];
        const correctVal = solution[r][c];

        userBoard[r][c] = correctVal;
        hintsRemaining--;
        score = Math.max(0, score - 50);
        updateStats();

        const input = document.querySelector(`input[data-row='${r}'][data-col='${c}']`);
        if (input) {
            input.value = correctVal;
            input.parentElement.classList.add('correct');
            input.disabled = true;
        }

        checkWinCondition();
    }

    function solveGame() {
        if (!isGameActive) return;
        if (!confirm("Reveal solution? The game will end.")) return;

        userBoard = solution.map(r => [...r]);
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            const r = parseInt(input.dataset.row);
            const c = parseInt(input.dataset.col);
            input.value = solution[r][c];
        });

        endGame(false);
    }

    function endGame(victory) {
        clearInterval(timerInterval);
        isGameActive = false;

        if (victory) {
            score += 1000;
            updateStats();
            document.querySelectorAll('.cell').forEach(c => c.classList.add('correct'));
            alert("Congratulations! Puzzle Solved!");
        }

        btnHint.disabled = true;
        btnCheck.disabled = true;
        btnSolve.disabled = true;
        document.querySelectorAll('input').forEach(i => i.disabled = true);
    }

    function handleNavigation(e, r, c) {
        const key = e.key;
        if (!key.startsWith('Arrow')) return;

        e.preventDefault();
        let dr = 0, dc = 0;
        if (key === 'ArrowUp') dr = -1;
        if (key === 'ArrowDown') dr = 1;
        if (key === 'ArrowLeft') dc = -1;
        if (key === 'ArrowRight') dc = 1;

        let nr = r + dr, nc = c + dc;

        if (nr < 0) nr = 0;
        if (nr > 8) nr = 8;
        if (nc < 0) nc = 0;
        if (nc > 8) nc = 8;

        const nextInput = document.querySelector(`input[data-row='${nr}'][data-col='${nc}']`);
        if (nextInput) {
            nextInput.focus();
        }
    }

    // --- Init Bindings ---
    // Landing
    btnStartGame.addEventListener('click', showGame);

    // Game
    btnHome.addEventListener('click', showLanding); // If user wants to go back

    btnNew.addEventListener('click', () => {
        if (isGameActive && !confirm("Abandon current game?")) return;
        startNewGame();
    });
    btnHint.addEventListener('click', giveHint);
    btnCheck.addEventListener('click', checkBoard);
    btnSolve.addEventListener('click', solveGame);

    // Initial state logic is handled by HTML hiding text
});
