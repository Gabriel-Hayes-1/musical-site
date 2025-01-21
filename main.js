const container = document.getElementById("note-container");
const playbar = document.getElementById("playbar")


let firstNoteArea = null;


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

function bpmToSpeed(bpm) { return (60000 / bpm)/10; }

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
          musicQueue[pitch].push(noteLeft);
          musicQueue[pitch].push(noteWidth);
        }
      }
    }
  }
  for (const [pitch, table] of Object.entries(musicQueue)) {
      setTimeout(() => {
        playSound(noteToHertz(pitch), table[1] * speed);
      }, table[0] * speed);
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
    playbar.style.left = "80px"
    leftPosition = 80
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
playbar.style.left = "80px"
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
  playbar.style.left = "80px";

  // Stop all active oscillators
  activeOscillators.forEach(({ oscillator, audioContext }) => {
    oscillator.stop();
    audioContext.close();
  });
  activeOscillators = []; // Clear the array
});




document.getElementById("Clear").addEventListener("click", async () => {
  document.querySelectorAll('.note').forEach(note => {
    note.remove()
  })
});





let currentContainer = null
let lastClickedNote = null

document.getElementById("addNote").addEventListener("click", () =>{
  if (currentContainer) {
    const note = document.createElement('div');
    note.classList.add('note');
    currentContainer.appendChild(note);
    
    note.addEventListener('contextmenu', (e) => {
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
  lastClickedNote.remove()
});



document.addEventListener('click', () => {
  customMenu.style.display = 'none';
});






let isDragging = false;
let isResizing = false;
let startX;
let note;




document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  playbarDrag = false;
});


document.addEventListener('DOMContentLoaded', function() {
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


  for (const child of container.children) {
    if (child.classList.contains('grid-noteArea')) {
      firstNoteArea = child;
      break;
    }
  }


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