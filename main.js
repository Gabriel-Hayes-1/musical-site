const container = document.getElementById("note-container");
const playbar = document.getElementById("playbar")


let firstNoteArea = null; //first note area
let firstNoteName = null; //first pitch marker
let firstNoteNameWidth = null; //width of note pitch marker
let clipboard = null;


let speed = bpmToSpeed(120); // Initial speed (120 BPM)
let snap = true; // Snap to grid by default
let snapValue = 50; // Snap value in pixels


let volume = 100; // Initial volume (100%)

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

function roundToMultiple(value, multiple) {
  return Math.round(value / multiple) * multiple;
}



function scrollToElement(element, down) {
  const bounding = element.getBoundingClientRect();
  const padding = 0; // Define padding value

  if (down) {
    if (bounding.bottom > window.innerHeight - padding) {
      element.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
        inline: 'nearest'
      });
    }
  } else {
    if (bounding.top < padding) {
      element.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
        inline: 'nearest'
      });
    }
  }
}


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
            gridItem.style.backgroundColor = "yellow";
            playSound(noteToHertz(notes[noteIndex].concat(octave + 1)), 500);
            setTimeout(() => {
              gridItem.style.backgroundColor = bgColor(gridItem, noteIndex);
            },500)
          });

        } else {
          gridItem.classList.add("grid-noteArea");
          allNoteSpaces[row] = gridItem
        }
        allTiles[row][col] = gridItem;

        // Calculate note and octave for the current row

          

        container.appendChild(gridItem);

    }
    adjustPlaybarController();
    addSnapMarkers();
    console.log(allNoteSpaces)
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
    if (audioContext.state === "running") {
    oscillator.stop();
    audioContext.close();
    activeOscillators = activeOscillators.filter(o => o.oscillator !== oscillator); // Remove from active oscillators
    }
  }, duration);
}

let scheduledTimeouts = []; // Array to keep track of scheduled timeouts

function playMusic() {
  // Stop all active oscillators
  activeOscillators.forEach(({ oscillator, audioContext }) => {
    oscillator.stop();
    audioContext.close();
  });
  activeOscillators = []; // Clear the array

  // Clear all scheduled timeouts
  scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
  scheduledTimeouts = []; // Clear the array

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
        const timeout = setTimeout(() => {
          playSound(noteToHertz(pitch), note.width * speed);
        }, delay);
        scheduledTimeouts.push(timeout);
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
  let leftPosition = parseInt(playbar.style.left || firstNoteNameWidth); // Starting position as a number
  
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
// Event listener to handle dragging and resizing of notes
document.addEventListener("mousemove", (event) => {
  if (playbarDrag) {
    const containerRect = playbarController.getBoundingClientRect();
    if (event.clientX < containerRect.left+1) {
      movePlaybarTo(containerRect.left+1);
    } else if (event.clientX > containerRect.right-1) {
      movePlaybarTo(containerRect.right - 1);
    } else {
      movePlaybarTo(event.clientX);
    }
  }
});
function movePlaybarTo(position) {
  if (position < firstNoteArea.getBoundingClientRect().right && position > firstNoteArea.getBoundingClientRect().left) {
    playbar.style.left = `${position}px`;
  } else {
    console.log("Invalid position");
  }
  if (animating) {
    clearTimeout(window.animationTimeout);
    movePlaybar();
  }
}



function adjustPlaybarController() {
  const firstNoteArea = document.querySelector('.grid-noteArea');
  if (firstNoteArea) {
      const noteAreaSize = firstNoteArea.getBoundingClientRect();


      playbarController.style.left = `${noteAreaSize.left}px`;
      playbarController.style.width = `${noteAreaSize.width}px`;
  }
}

function addSnapMarkers() {
  const firstNoteArea = document.querySelector('.grid-noteArea');
  const noteAreaWidth = firstNoteArea.getBoundingClientRect().width;

  //get how many times snap-value fits in the noteAreaWidth
  const numSnapMarkers = Math.floor(noteAreaWidth / snapValue);
  for (let i = 0; i < numSnapMarkers; i++) {
    const snapMarker = document.createElement('div');
    snapMarker.classList.add('snap-marker');
    snapMarker.style.left = `${snapValue * i}px`;
    document.body.appendChild(snapMarker);
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

  // Clear all scheduled timeouts
  scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
  scheduledTimeouts = []; // Clear the array
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

document.getElementById("addNote").addEventListener("click", (event) =>{
  if (currentContainer) {
    const note = document.createElement('div');
    note.style.left = `${event.clientX-firstNoteNameWidth}px`;
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






//KEYPRESSES --------------------------------------------------
//#############################################################
//-------------------------------------------------------------
let undoStack = [];
let redoStack = [];

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Backspace' || event.key === 'Delete') && selectedNote) {
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
  } else if (event.key === 'Escape') {
    customMenu.style.display = 'none';
    if (selectedNote) {
      selectedNote.style.outline = "";
      selectedNote = null;
    }
  } else if (event.key === 'ArrowDown' && selectedNote) {
    event.preventDefault();
    scrollToElement(selectedNote,true);
    const currentContainer = selectedNote.parentElement;
    const nextContainer = currentContainer.nextElementSibling.nextElementSibling;
    if (nextContainer && nextContainer.classList.contains('grid-noteArea')) {
      nextContainer.appendChild(selectedNote);
    }
  } else if (event.key === 'ArrowUp' && selectedNote) {
    event.preventDefault();
    scrollToElement(selectedNote,false);
    const currentContainer = selectedNote.parentElement;
    const prevContainer = currentContainer.previousElementSibling.previousElementSibling;
    if (prevContainer && prevContainer.classList.contains('grid-noteArea')) {
      prevContainer.appendChild(selectedNote);
    }
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

function setupControls(numInput, increaseButton, decreaseButton) {
  let speed;
  let increaseInterval;
  let decreaseInterval;
  const increaseSpeed = 50; // milliseconds per increase when held

  let defaultValue = numInput.value; // Store the default value

  numInput.addEventListener('input', function() {
    speed = bpmToSpeed(parseInt(numInput.value));
    defaultValue = numInput.value;
  });

  numInput.addEventListener('focus', function(event) {
    event.preventDefault();
    numInput.value = '';
  });

  numInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      numInput.blur();
    }
  });

  numInput.addEventListener('blur', function() {
    if (numInput.value === '') {
      numInput.value = defaultValue;
    }
  });

  increaseButton.addEventListener('mousedown', function() {
    increaseInterval = setInterval(function() {
      numInput.value = parseInt(numInput.value) + 1;
      speed = bpmToSpeed(parseInt(numInput.value));
      defaultValue = numInput.value;
    }, increaseSpeed);
  });

  increaseButton.addEventListener('mouseup', function() {
    clearInterval(increaseInterval);
  });

  increaseButton.addEventListener('mouseleave', function() {
    clearInterval(increaseInterval);
  });

  decreaseButton.addEventListener('mousedown', function() {
    decreaseInterval = setInterval(function() {
      numInput.value = parseInt(numInput.value) - 1;
      speed = bpmToSpeed(parseInt(numInput.value));
      defaultValue = numInput.value;
    }, increaseSpeed);
  });

  decreaseButton.addEventListener('mouseup', function() {
    clearInterval(decreaseInterval);
  });

  decreaseButton.addEventListener('mouseleave', function() {
    clearInterval(decreaseInterval);
  });
}



let isDragging = false;
let isResizing = false;
let startX;
let startY;
let note;
let selectedNote = null;
let lastResize = null;
let lastDrag = null;
let mouseOffset = null;
let rightMouseOffset = null;

document.addEventListener("mouseup", (event) => {
  
  
  const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
  if (elementUnderMouse && elementUnderMouse.classList.contains('grid-noteArea')) {
    if (isDragging) {
      elementUnderMouse.appendChild(selectedNote);
    }
  }


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
  customMenu.style.display = 'none';

  if (selectedNote && !event.target.classList.contains('note')) {
    selectedNote.style.outline = ""; // Remove outline from previously selected note
    selectedNote = null; // Reset selected note
  }
});

document.addEventListener('DOMContentLoaded', function() {
  loadPiano();


  firstNoteArea = document.querySelector('.grid-noteArea')
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
        mouseOffset = offsetX;
        rightMouseOffset = rect.width - offsetX;

        startX = event.clientX;
        event.preventDefault();

        // Handle note selection
        if (selectedNote) {
          selectedNote.style.outline = ""; // Remove outline from previously selected note
        }
        selectedNote = note;
        currentContainer = container; 
        selectedNote.style.zIndex = 700;
        selectedNote.style.outline = "2px solid blue"; // Add outline to selected note
      }
    });
    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        const parent = note.parentElement;

        const parentLeft = parent.getBoundingClientRect().left;
        const parentRight = parent.getBoundingClientRect().right;
        const parentWidth = parent.getBoundingClientRect().width;

        const noteWidth = note.getBoundingClientRect().width;
    
        if (roundToMultiple(event.clientX+rightMouseOffset,snapValue) < parentRight) { 
          if (event.clientX-mouseOffset > parentLeft) {
            note.style.left = roundToMultiple(event.clientX-parentLeft - mouseOffset, snapValue) + "px";
          } else {
            note.style.left = "0px";
          }
        } else {
          note.style.left = parentWidth-noteWidth + "px";
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
  const increaseButton = tempoValue.parentElement.querySelector('#increase');
  const decreaseButton = tempoValue.parentElement.querySelector('#decrease');

  const volumeValue = document.getElementById('volume-value');
  const volumeIncrease = volumeValue.parentElement.querySelector('#increase');
  const volumeDecrease = volumeValue.parentElement.querySelector('#decrease');

  setupControls(tempoValue, increaseButton, decreaseButton);

  setupControls(volumeValue, volumeIncrease, volumeDecrease);
});