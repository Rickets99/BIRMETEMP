const log = (message) => {
    const logFrame = document.getElementById('logFrame');
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logFrame.appendChild(logEntry);
    logFrame.scrollTop = logFrame.scrollHeight;
};

const displayImage = (imagePath) => {
    const imageDisplayFrame = document.getElementById('imageDisplayFrame');
    const img = document.createElement('img');
    img.src = `file://${imagePath}`; // Use file protocol to access the local file
    img.alt = 'Resized Image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    imageDisplayFrame.innerHTML = '';
    imageDisplayFrame.appendChild(img);
};

document.getElementById('resizeForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    log('Form submitted, starting resize process...');

    const formData = new FormData(this);

    const response = await fetch('/resize', {
        method: 'POST',
        body: formData
    });

    if (response.ok) {
        const result = await response.json();
        const output = document.getElementById('output');
        output.innerHTML = 'Resized images saved to: ' + result.resizedImages.join(', ');
        log('Resize process completed.');

        const openFolder = document.getElementById('openFolderCheckbox').checked;
        if (openFolder) {
            log('Opening output folder...');
            await window.electron.openFolder(result.outputDir);
        }

        const completionSound = document.getElementById('completionSound');
        completionSound.play();
        log('Completion sound played.');

        result.resizedImages.forEach((image) => {
            displayImage(image);
            log(`Image displayed: ${image}`);
        });
    } else {
        log('Error resizing images.');
        alert('Error resizing images');
    }
});

document.getElementById('selectOutputDirButton').addEventListener('click', async function() {
    const outputDir = await window.electron.selectOutputDirectory();
    document.getElementById('outputDirInput').value = outputDir;
    log('Output directory selected: ' + outputDir);
});
