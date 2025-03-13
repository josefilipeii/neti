const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'heats_changed.csv');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    const lines = data.split('\n');
    const header = lines[0];
    const contentLines = lines.slice(1).filter(line => line.trim() !== '');

    const reversedLines = contentLines.reverse();
    const result = [header, ...reversedLines].join('\n');

    fs.writeFile(filePath, result, 'utf8', (err) => {
        if (err) {
            console.error('Error writing the file:', err);
            return;
        }
        console.log('File has been updated successfully.');
    });
});