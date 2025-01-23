const container = document.getElementById("note-container");
const playbar = document.getElementById("playbar")


let firstNoteArea = null;
let firstNoteName = null;
let firstNoteNameWidth = null;
let clipboard = null;


let speed = bpmToSpeed(120); // Initial speed (120 BPM)


const customMenu = document.getElementById("context-menu")
const rows = 12; // Rows per octave
const cols = 2; // Columns per octave
const numofOctaves = 7; // Number of octaves

const pianoLayout = [
    "white", "black", "white", "black",
    "white", "black", "white", "white",
    "black", "white", "black", "white"
];

const notes = [
    "B", "A#", "A", "G#",
    "G", "F#", "F", "E",
    "D#", "D", "C#", "C"
];

function bpmToSpeed(bpm) { return (60000 / bpm)/20; }

const totalRows = rows * numofOctaves;

let allTiles = Array.from({ length: totalRows }, () => Array(cols).fill(null));
let allNoteSpaces = Array(totalRows).fill(null);


let tileValues = Array.from({ length: totalRows }, () => Array(cols).fill(false));

function loadPiano() {
    for (let i = 0; i < totalRows * cols; i++) {
        const gridItem = document.createElement("div");

        // Calculate row and column
        const row = Math.floor(i / cols);
        const col = i % cols;
        const noteIndex = row % rows;
        const octave = numofOctaves - 1 - Math.floor(row / rows);


        if (col == 0) {
          gridItem.classList.add("grid-item");
          bgColor(gridItem, noteIndex);
          gridItem.textContent = notes[noteIndex].concat(octave + 1);

          gridItem.addEventListener("click", () => {
            alert("sample sound is supposed to play")
          });

        } else {
          gridItem.classList.add("grid-noteArea");
          allNoteSpaces[row] = gridItem
        }
        allTiles[row][col] = gridItem;

        // Calculate note and octave for the current row

          

        container.appendChild(gridItem);
    }
    adjustPlaybarControllerSize();
}
let activeOscillators = []; // Array to keep track of active oscillators

function playSound(frequency, duration) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  activeOscillators.push({ oscillator, audioContext }); // Add to active oscillators

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
    activeOscillators = activeOscillators.filter(o => o.oscillator !== oscillator); // Remove from active oscillators
  }, duration);
}

function playMusic() {
  const musicQueue = {}; // Dictionary to store pitches and their left values
  const initialPlaybarPosition = parseInt(playbar.style.left || "80", 10); // Get the initial position of the playbar
  
  for (let i = 0; i < allNoteSpaces.length; i++) {
    if (allNoteSpaces[i]) {
      for (let c of allNoteSpaces[i].children) {
        const noteLeft = parseInt(c.style.left || "0", 10); // Get the left position of the note
        const noteWidth = parseInt(c.style.width || "50", 10); // Get the width of the note
        const pitch = calculatePitch(i); // Calculate the pitch based on row index
        
        if (pitch) {
          if (!musicQueue[pitch]) {
            musicQueue[pitch] = [];
          }
          musicQueue[pitch].push({ left: noteLeft, width: noteWidth });
        }
      }
    }
  }
  
  for (const [pitch, notes] of Object.entries(musicQueue)) {
    notes.forEach(note => {
      const noteEnd = note.left + note.width;
      const delay = (note.left - initialPlaybarPosition + firstNoteNameWidth) * speed;
      if (delay >= 0) {
        setTimeout(() => {
          playSound(noteToHertz(pitch), note.width * speed);
        }, delay);
      } else if (initialPlaybarPosition > note.left) {
        playSound(noteToHertz(pitch), (noteEnd-initialPlaybarPosition + firstNoteNameWidth) * speed);
      }
    });
  }
}

// Helper function to calculate the pitch based on the row index
function calculatePitch(row) {
  const noteIndex = row % rows; // Row index within an octave
  const octave = numofOctaves - 1 - Math.floor(row / rows); // Calculate octave number
  const noteName = notes[noteIndex]; // Get note name from notes array
  
  if (noteName) {
    return `${noteName}${octave + 1}`; // Combine note name and octave
  }
  return null;
}

function noteToHertz(note) {
  const noteRegex = /^([A-Ga-g])(#|b)?(\d+)$/;
  const noteFrequencies = {
      C: 16.35, D: 18.35, E: 20.60, F: 21.83, G: 24.50, A: 27.50, B: 30.87
  };

  const match = note.match(noteRegex);
  if (!match) {
      throw new Error("Invalid note format. Use something like A#4 or C7.");
  }

  let [_, baseNote, accidental, octave] = match;
  baseNote = baseNote.toUpperCase();
  octave = parseInt(octave);

  // Calculate the base frequency for the given note
  let frequency = noteFrequencies[baseNote];

  // Adjust for sharps (#) or flats (b)
  if (accidental === "#") {
      frequency *= Math.pow(2, 1 / 12); // Move up one semitone
  } else if (accidental === "b") {
      frequency /= Math.pow(2, 1 / 12); // Move down one semitone
  }

  // Adjust for the octave
  frequency *= Math.pow(2, octave);

  return parseFloat(frequency.toFixed(2)); // Round to 2 decimal places
}






function bgColor(element, row) {
    element.style.backgroundColor = pianoLayout[row % pianoLayout.length];
}



let animating = false
// Define the movePlaybar function
function movePlaybar() {
  let leftPosition = parseInt(playbar.style.left); // Starting position as a number

  
  const areaSize = firstNoteArea.getBoundingClientRect();
  const targetPosition = areaSize.right;

  if (leftPosition >= targetPosition) {
    playbar.style.left = `${firstNoteNameWidth}px`
    leftPosition = firstNoteNameWidth;
  }


  const animate = () => {
    animating = true
    if (leftPosition < targetPosition) {
      leftPosition += 1; // Increment position
      playbar.style.left = `${leftPosition}px`; // Update style
      window.animationTimeout = setTimeout(animate, speed); // Schedule next frame
    } else {
      animating = false
    }
  };

  animate(); // Start animation
}
playbar.style.left = `${firstNoteNameWidth}px`
document.getElementById("start").addEventListener("click", () => {
  // Clear any ongoing animation
  if (window.animationTimeout) {
    clearTimeout(window.animationTimeout);
  } 
  playMusic();
  movePlaybar();
});

const playbarController = document.getElementById("playbar-controller");

let playbarDrag = false;

playbarController.addEventListener("mousedown", (event) => {
  playbarDrag = true;
  movePlaybarTo(event.clientX);
});
document.addEventListener("mousemove", (event) => {
  if (playbarDrag) {
    movePlaybarTo(event.clientX);
  }
});
function movePlaybarTo(position) {
  if (position < firstNoteArea.getBoundingClientRect().right && position > firstNoteArea.getBoundingClientRect().left) {
    playbar.style.left = `${position}px`;
  }
  if (animating) {
    clearTimeout(window.animationTimeout);
    movePlaybar();
  }
}




function adjustPlaybarControllerSize() {
  const firstNoteArea = document.querySelector('.grid-noteArea');
  if (firstNoteArea) {
      const noteAreaWidth = firstNoteArea.getBoundingClientRect().width;
      playbarController.style.width = `${noteAreaWidth}px`;
  }
}


document.getElementById("stop").addEventListener("click", () => {
  animating = false;
  if (window.animationTimeout) {
    clearTimeout(window.animationTimeout);
  }
  playbar.style.left = `${firstNoteNameWidth}px`;

  // Stop all active oscillators
  activeOscillators.forEach(({ oscillator, audioContext }) => {
    oscillator.stop();
    audioContext.close();
  });
  activeOscillators = []; // Clear the array
});




document.getElementById("Clear").addEventListener("click", async () => {
  if (confirm("Are you sure you want to clear the notes?")) {
    document.querySelectorAll('.note').forEach(note => {
      note.remove()
    })
  }
});





let currentContainer = null
let lastClickedNote = null

document.getElementById("addNote").addEventListener("click", () =>{
  if (currentContainer) {
    const note = document.createElement('div');
    note.classList.add('note');
    currentContainer.appendChild(note);
    
    note.addEventListener('contextmenu', (e) => {
      currentContainer = note.parentElement
      lastClickedNote = note
      e.preventDefault()
      e.stopPropagation()

      Array.from(customMenu.children).forEach(child => {
        if (child.style.display == "none") {
          child.style.display = 'block'
        }
      });
      customMenu.style.top = `${e.clientY}px`;
      customMenu.style.left = `${e.clientX}px`;
      customMenu.style.display = 'flex';

    });
  }
});

document.getElementById("deleteNote").addEventListener("click", () => {
  undoStack.push({ action: 'remove', note: lastClickedNote });
    lastClickedNote.remove();
    lastClickedNote = null;
});



document.addEventListener('click', () => {
  customMenu.style.display = 'none';
});


//KEYPRESSES --------------------------------------------------
//#############################################################
//-------------------------------------------------------------
let undoStack = [];
let redoStack = [];

document.addEventListener('keydown', (event) => {
  if (event.key === 'Backspace' && selectedNote) {
    undoStack.push({ action: 'remove', note: selectedNote });
    selectedNote.remove();
    selectedNote = null;
    customMenu.style.display = 'none';
  } else if (event.key === 'x' && event.ctrlKey && selectedNote) {
    cut();
  } else if (event.key === 'c' && event.ctrlKey && selectedNote) {
    copy();
  } else if (event.key === 'v' && event.ctrlKey && clipboard) {
    paste();
  } else if (event.key === 'z' && event.ctrlKey) {
    undo();
  } else if (event.key === 'y' && event.ctrlKey) {
    redo();
  }
});

function copy() {
  clipboard = selectedNote;
}

function cut() {
  undoStack.push({ action: 'remove', note: selectedNote });
  clipboard = selectedNote;
  selectedNote.remove();
  selectedNote = null;
}

function paste() {
  const newNote = clipboard.cloneNode(true);
  newNote.style.outline = "";
  addNoteEventListeners(newNote);
  currentContainer.appendChild(newNote);
  undoStack.push({ action: 'add', note: newNote });
}

function undo() {
  const lastAction = undoStack.pop();
  if (lastAction) {
    redoStack.push({
      action: lastAction.action,
      note: lastAction.note,
      previousState: {
        left: lastAction.note.style.left,
        width: lastAction.note.style.width
      }
    });
    if (lastAction.action === 'remove') {
      currentContainer.appendChild(lastAction.note);
    } else if (lastAction.action === 'add') {
      lastAction.note.remove();
    } else if (lastAction.action === 'move') {
      lastAction.note.style.left = lastAction.move;
    } else if (lastAction.action === 'resize') {
      lastAction.note.style.width = lastAction.resize;
    }
  }
}

function redo() {
  const lastAction = redoStack.pop();
  if (lastAction) {
    undoStack.push({
      action: lastAction.action,
      note: lastAction.note,
      move: lastAction.note.style.left,
      resize: lastAction.note.style.width
    });
    if (lastAction.action === 'remove') {
      lastAction.note.remove();
    } else if (lastAction.action === 'add') {
      currentContainer.appendChild(lastAction.note);
    } else if (lastAction.action === 'move') {
      lastAction.note.style.left = lastAction.previousState.left;
    } else if (lastAction.action === 'resize') {
      lastAction.note.style.width = lastAction.previousState.width;
    }
  }
}

function addNoteEventListeners(note) {
  note.addEventListener('contextmenu', (e) => {
    currentContainer = note.parentElement;
    lastClickedNote = note;
    e.preventDefault();
    e.stopPropagation();

    Array.from(customMenu.children).forEach(child => {
      if (child.style.display == "none") {
        child.style.display = 'block';
      }
    });
    customMenu.style.top = `${e.clientY}px`;
    customMenu.style.left = `${e.clientX}px`;
    customMenu.style.display = 'flex';
  });
}




let isDragging = false;
let isResizing = false;
let startX;
let note;
let selectedNote = null;
let lastResize = null;
let lastDrag = null;

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  playbarDrag = false;

  if (note) {
    if (note.style.left !== lastDrag) {
      undoStack.push({ action: 'move',move: lastDrag, note: note});
    } else if (note.style.width !== lastResize) {
      undoStack.push({ action: 'resize',resize: lastResize, note: note});
    }
  }
});

document.addEventListener('click', (event) => {
  if (selectedNote && !event.target.classList.contains('note')) {
    selectedNote.style.outline = ""; // Remove outline from previously selected note
    selectedNote = null; // Reset selected note
  }
});

document.addEventListener('DOMContentLoaded', function() {
  for (const child of container.children) {
    if (child.classList.contains('grid-noteArea')) {
      firstNoteArea = child;
      break;
    }
  }
  for (const child of container.children) {
    if (child.classList.contains('grid-item')) {
      firstNoteName = child;

      const parentComputedStyle = window.getComputedStyle(container);
      const gap = parseFloat(parentComputedStyle.rowGap);
      const paddingLeft = parseFloat(parentComputedStyle.paddingLeft);

      firstNoteNameWidth = firstNoteName.getBoundingClientRect().width +gap+paddingLeft;

      break;
    }
  }


  loadPiano();

  document.querySelectorAll('.grid-noteArea').forEach(container => {
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentContainer = container; // Save the reference to the right-clicked container
  
        customMenu.querySelectorAll('.click-note').forEach(child => {
            child.style.display = 'none';
        });
        customMenu.style.top = `${e.clientY}px`;
        customMenu.style.left = `${e.clientX}px`;
        customMenu.style.display = 'flex';
    });
    container.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("note")) {
  
        note = event.target;
        
        lastDrag = note.style.left
        lastResize = note.style.width


        // Check if the user is clicking near the right edge to resize
        const rect = note.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
    
        if (offsetX > rect.width - 10) {
          isResizing = true;
        } else {
          isDragging = true;
        }
    
        startX = event.clientX;
        event.preventDefault();

        // Handle note selection
        if (selectedNote) {
          selectedNote.style.outline = ""; // Remove outline from previously selected note
        }
        selectedNote = note;
        selectedNote.style.outline = "2px solid blue"; // Add outline to selected note
      }
    });
    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        const dx = event.clientX - startX; //x axis distance mouse has traveled since last event fire
        startX = event.clientX; //update variable for next event fire
    
        const left = parseInt(note.style.left || "0", 10); //current left value of note
        const newLeft = Math.max(0, left + dx); //new left value of note (where we're moving it to)
    
        // container and note boundaries (we're only using left and right)
        const containerRect = container.getBoundingClientRect();
        const noteRect = note.getBoundingClientRect();
    
        //noterect.right = total distance from left side of screen to right side of note
        if (!(noteRect.right+dx > containerRect.right)) { //plus dx to ensure the element is not stuck at edge
          note.style.left = newLeft + "px";
        }
      } else if (isResizing) {
        const dx = event.clientX - startX;
        startX = event.clientX;
    
        // Resize the note
        const width = parseInt(note.style.width || "50", 10);
        const newWidth = Math.max(10, width + dx);
    
        // Get container and note boundaries
        const containerRect = container.getBoundingClientRect();
        const noteRect = note.getBoundingClientRect();
    
        if (!(noteRect.right + dx > containerRect.right)) {
          note.style.width = newWidth + "px";
        }
      }



    });
  });

  

  const tempoValue = document.getElementById('tempo-value');
  const increaseButton = document.getElementById('increase');
  const decreaseButton = document.getElementById('decrease');

  tempoValue.addEventListener('input', function() {
    speed = bpmToSpeed(parseInt(tempoValue.value));
  });

  increaseButton.addEventListener('click', function() {
      tempoValue.value = parseInt(tempoValue.value) + 1;
      speed = bpmToSpeed(parseInt(tempoValue.value));
  });

  decreaseButton.addEventListener('click', function() {
      tempoValue.value = parseInt(tempoValue.value) - 1;
      speed = bpmToSpeed(parseInt(tempoValue.value));
  });
});