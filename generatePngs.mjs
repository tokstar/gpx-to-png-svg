import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { createCanvas } from 'canvas';

const inputDir = './gpx-files'; // Directory containing GPX files
const outputDir = './output-images'; // Directory to save PNG images
const logFilePath = path.join(outputDir, 'log.txt'); // Log file path

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to parse a GPX file
const parseGpxFile = async (filePath) => {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const result = await parseStringPromise(xml);

    const trackSegments = result.gpx.trk[0]?.trkseg[0]?.trkpt || [];
    const points = trackSegments.map(point => ({
        lat: parseFloat(point.$.lat),
        lon: parseFloat(point.$.lon)
    }));

    const time = result.gpx.metadata?.[0]?.time?.[0];
    const name = result.gpx.metadata?.[0]?.name?.[0];

    if (!time || !name) {
        throw new Error(`Missing required metadata in GPX file: ${filePath}`);
    }

    return { points, time, name };
};

// Function to format time to desired filename format
const formatTimeForFilename = (time) => {
    return time.replace(/[:.-]/g, '_').replace('T', '_').replace('Z', '');
};

// Function to draw the line from GPX data and save as PNG
const drawLineAndSave = (points, outputFilePath) => {
    const canvasWidth = 800;
    const canvasHeight = 600;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Determine bounding box
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Scale and translate to fit canvas
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const scale = Math.min(canvasWidth / lonRange, canvasHeight / latRange);
    
    const xOffset = (canvasWidth - lonRange * scale) / 2;
    const yOffset = (canvasHeight - latRange * scale) / 2;
    
    const translateX = -minLon * scale + xOffset;
    const translateY = -minLat * scale + yOffset;

    // Set transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 4; // Increase line thickness

    ctx.beginPath();
    points.forEach((point, index) => {
        const x = point.lon * scale + translateX;
        const y = canvasHeight - (point.lat * scale + translateY); // Invert y-axis

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputFilePath, buffer);
};

// Function to write log entry
const writeLog = (filename, name) => {
    const logEntry = `${filename} - ${name}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf-8');
};

// Main function to process all GPX files
const processGpxFiles = async () => {
    // Clear log file at the start
    fs.writeFileSync(logFilePath, '', 'utf-8');

    const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.gpx'));

    for (const file of files) {
        const filePath = path.join(inputDir, file);
        try {
            const { points, time, name } = await parseGpxFile(filePath);
            const formattedTime = formatTimeForFilename(time);
            const outputFilePath = path.join(outputDir, `${formattedTime}.png`);
            drawLineAndSave(points, outputFilePath);
            writeLog(`${formattedTime}.png`, name);
            console.log(`Generated ${outputFilePath}`);
        } catch (error) {
            console.error(`Failed to process ${filePath}: ${error.message}`);
        }
    }
};

processGpxFiles().catch(err => console.error(err));
