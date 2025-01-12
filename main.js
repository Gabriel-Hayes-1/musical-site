const container = document.getElementById("note-container");

const rows = 12;
const cols = 12;

const pianoLayout = [
    "white", "black", "white", "black",
    "white", "white", "black", "white",
    "black", "white", "black", "white"
]
const notes = [
    "C","C#","D","D#",
    "E","F","F#","G",
    "G#","A","A#","B"
]
document.querySelector("button")?.addEventListener("click", async () => {
	await Tone.start();
});

//2d array
const gridState = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (let i = 0; i < rows * cols; i++) {
      const gridItem = document.createElement("div");
      gridItem.classList.add("grid-item");

      // Calculate row and column
      const row = Math.floor(i / cols);
      const col = i % cols;
      gridItem.textContent = notes[row].concat("4")
      bgColor(gridItem,row)

      // Add event listener to toggle the boolean value and change color
      gridItem.addEventListener("click", () => {
        const synth = new Tone.Synth().toDestination();
        synth.triggerAttackRelease(notes[row].concat("4"), "8n");
        gridState[row][col] = !gridState[row][col]; // Toggle boolean value
        // Update color based on boolean value
        if (gridState[row][col]) {
          gridItem.style.backgroundColor = "yellow"; // True state
        } else {
            bgColor(gridItem,row)
        }

        console.log(`Cell at Row ${row + 1}, Col ${col + 1} is now ${gridState[row][col]}`);
      });
      document.getElementById("button").addEventListener("click", () => {
        if (gridState[row][col] == true){
            const synth = new Tone.Synth().toDestination();
            synth.triggerAttackRelease(notes[row].concat("4"), "1n");
        }
      });

  container.appendChild(gridItem);
}


function bgColor(element, row){
    element.style.backgroundColor = pianoLayout[row % pianoLayout.length]
}
async function playNotes(){
    
}
