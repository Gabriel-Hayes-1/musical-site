const container = document.getElementById("note-container");

const customMenu = document.getElementById("context-menu")
const rows = 12; // Rows per octave
const cols = 2; // Columns per octave
const numofOctaves = 7; // Number of octaves

const pianoLayout = [
    "white", "black", "white", "black",
    "white", "black", "white", "white",
    "black", "white", "black", "white"
];
//const synth = new Tone.Synth().toDestination();
//synth.triggerAttackRelease(notes[noteIndex].concat(octave + 1), "8n");

const notes = [
    "B", "A#", "A", "G#",
    "G", "F#", "F", "E",
    "D#", "D", "C#", "C"
];

document.querySelector("button")?.addEventListener("click", async () => {
    await Tone.start();
});

const totalRows = rows * numofOctaves;

let allTiles = Array.from({ length: totalRows }, () => Array(cols).fill(null));
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
        }
        allTiles[row][col] = gridItem;

        // Calculate note and octave for the current row

          

        container.appendChild(gridItem);
    }
}
function playSound(frequency, duration) {
  // Create an audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create an oscillator node
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine"; // You can use "sine", "square", "sawtooth", "triangle", or "custom"
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Set pitch (in Hz)

  // Create a gain node to control volume
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Set volume (0 to 1)

  // Connect the oscillator to the gain node and the gain node to the audio context
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Start the oscillator
  oscillator.start();

  // Stop the oscillator after the specified duration
  setTimeout(() => {
      oscillator.stop();
      audioContext.close();
  }, duration);
}





function bgColor(element, row) {
    element.style.backgroundColor = pianoLayout[row % pianoLayout.length];
}

document.getElementById("button").addEventListener("click", async () => {
  playSound(440, 500);
});


document.getElementById("Clear").addEventListener("click", async () => {
  document.querySelectorAll('.note').forEach(note => {
    note.remove()
  })
});




let currentContainer = null
document.getElementById("addNote").addEventListener("click", () =>{
  if (currentContainer) {
    const note = document.createElement('div');
    note.classList.add('note');
    currentContainer.appendChild(note);
  }
});


document.addEventListener('click', () => {
  customMenu.style.display = 'none';
});



loadPiano();

let isDragging = false;
let isResizing = false;
let startX;
let note;

document.querySelectorAll('.grid-noteArea').forEach(container => {
  container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      currentContainer = container; // Save the reference to the right-clicked container
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

    if (noteRect.right+dx > containerRect.right) { //plus dx to ensure the element is not stuck at edge
      alert("You are trying to move the note outside of the container!");
    } else {
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

    if (noteRect.right + dx > containerRect.right) {
      alert("You are trying to resize the note outside of the container!");
    } else {
      note.style.width = newWidth + "px";
    }
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
});

