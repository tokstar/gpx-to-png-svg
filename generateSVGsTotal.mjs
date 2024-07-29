import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { createSVGWindow } from 'svgdom';
import { SVG, registerWindow } from '@svgdotjs/svg.js';
import { differenceInSeconds } from 'date-fns';

const inputDir = './gpx-files'; // Directory containing GPX files
const outputDir = './output-images'; // Directory to save SVG images
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
        lon: parseFloat(point.$.lon),
        time: point.time ? new Date(point.time[0]) : null
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

// Function to calculate the distance between two points (Haversine formula)
const haversineDistance = (point1, point2) => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (value) => (value * Math.PI) / 180;

    const lat1 = toRad(point1.lat);
    const lat2 = toRad(point2.lat);
    const deltaLat = toRad(point2.lat - point1.lat);
    const deltaLon = toRad(point2.lon - point1.lon);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// Function to draw the line from GPX data and save as SVG
const drawLineAndSave = (points, outputFilePath) => {
    const window = createSVGWindow();
    const document = window.document;
    registerWindow(window, document);

    const canvasWidth = 800;
    const canvasHeight = 600;
    const draw = SVG(document.documentElement).size(canvasWidth, canvasHeight);

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

    const pathData = points.map((point, index) => {
        const x = point.lon * scale + translateX;
        const y = canvasHeight - (point.lat * scale + translateY); // Invert y-axis
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    draw.path(pathData).fill('none').stroke({ color: 'blue', width: 4 });

    fs.writeFileSync(outputFilePath, draw.svg());
};

// Function to calculate total time and distance
const calculateTimeAndDistance = (points) => {
    let totalTime = 0;
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currPoint = points[i];

        if (prevPoint.time && currPoint.time) {
            totalTime += differenceInSeconds(currPoint.time, prevPoint.time);
        }

        totalDistance += haversineDistance(prevPoint, currPoint);
    }

    return { totalTime, totalDistance };
};

// Function to write log entry
const writeLog = (filename, name, totalTime, totalDistance) => {
    const logEntry = `${filename} - ${name} - Total Time: ${totalTime}s - Total Distance: ${totalDistance.toFixed(2)}m\n`;
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
            const { totalTime, totalDistance } = calculateTimeAndDistance(points);
            const formattedTime = formatTimeForFilename(time);
            const outputFilePath = path.join(outputDir, `${formattedTime}.svg`);
            drawLineAndSave(points, outputFilePath);
            writeLog(`${formattedTime}.svg`, name, totalTime, totalDistance);
            console.log(`Generated ${outputFilePath}`);
        } catch (error) {
            console.error(`Failed to process ${filePath}: ${error.message}`);
        }
    }
};

processGpxFiles().catch(err => console.error(err));
