console.log('app.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get DOM elements
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const captureBtn = document.getElementById('captureBtn');
        const result = document.getElementById('result');

        // Make canvas same size as video
        canvas.width = video.width;
        canvas.height = video.height;

        // Set canvas context with willReadFrequently
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Initialize face-api models
        await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
        console.log('Models loaded');

        // Start video
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            console.log('Video started');
        } catch (err) {
            console.error('Error starting video:', err);
        }

        // Capture button click handler
        captureBtn.addEventListener('click', async () => {
            console.log('Capture button clicked');

            try {
                // Ensure video is playing
                if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                    console.log('Waiting for video...');
                    return;
                }

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                console.log('Frame captured and drawn to canvas');

                // Make canvas visible
                canvas.style.display = 'block';

                // Show processing message
                drawText('Processing...', 20, 40, 'blue', '24px');

                // Detect face
                const detections = await faceapi.detectAllFaces(
                    canvas,
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceLandmarks();

                console.log('Detections:', detections);

                // Redraw video frame (to clear processing message)
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (detections && detections.length > 0) {
                    detections.forEach((detection, index) => {
                        // Draw face box
                        const box = detection.detection.box;
                        ctx.strokeStyle = 'green';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);

                        const landmarks = detection.landmarks;
                        const leftEye = landmarks.getLeftEye();
                        const rightEye = landmarks.getRightEye();

                        console.log('Eyes:', { leftEye, rightEye });

                        // Draw eye points
                        [leftEye, rightEye].forEach(eye => {
                            eye.forEach(point => {
                                ctx.beginPath();
                                ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                                ctx.fillStyle = 'red';
                                ctx.fill();
                            });
                        });

                        // Calculate eye aspect ratio
                        const leftEAR = getEyeAspectRatio(leftEye);
                        const rightEAR = getEyeAspectRatio(rightEye);
                        const avgEAR = (leftEAR + rightEAR) / 2;

                        console.log('EAR:', { leftEAR, rightEAR, avgEAR });

                        // Draw background for text
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        ctx.fillRect(10, 10, 250, 90);

                        // Draw eye status
                        const isOpen = avgEAR > 0.29;
                        drawText(
                            isOpen ? 'Eyes Open! 👀' : 'Eyes Closed 😴',
                            20, 40,
                            isOpen ? 'green' : 'red',
                            'bold 24px'
                        );

                        // Draw EAR value
                        drawText(
                            `EAR: ${avgEAR.toFixed(3)}`,
                            20, 70,
                            'blue',
                            '18px'
                        );
                    });
                } else {
                    // Draw no face message
                    drawText('No Face Detected! 🔍', 20, 40, 'red', 'bold 24px');
                }

            } catch (err) {
                console.error('Processing error:', err);
                drawText('Error! ⚠️', 20, 40, 'red', 'bold 24px');
            }
        });

    } catch (err) {
        console.error('Initialization error:', err);
    }
});

// Helper function to draw text with background
function drawText(text, x, y, color, font) {
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.font = `${font} Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// Function to calculate eye aspect ratio
function getEyeAspectRatio(eye) {
    try {
        const v1 = getDistance(eye[1], eye[5]);
        const v2 = getDistance(eye[2], eye[4]);
        const h = getDistance(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    } catch (err) {
        console.error('Error calculating EAR:', err);
        return 0;
    }
}

// Function to calculate distance between points
function getDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
}