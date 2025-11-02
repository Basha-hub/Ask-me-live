// --- 1. CONFIGURE YOUR PROJECT ---
// !! Fill these in from your n8n and Supabase projects !!
const N8N_LIVE_CHUNK_URL = 'http://localhost:5678/webhook-test/live';
const N8N_FULL_UPLOAD_URL = 'http://localhost:5678/webhook-test/live';
const SUPABASE_URL = 'https://cpfzmihwsganukeqwbtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZnptaWh3c2dhbnVrZXF3YnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTc1MDcsImV4cCI6MjA3NzU5MzUwN30.7Rh15eEvbg5QFnxlMajMsco82Fr1K6Ju_D28t9Y1bMs';

const RECORDING_DURATION_MS = 10000; // Record for 10 seconds

// --- 2. GET HTML ELEMENTS ---
const startButton = document.getElementById('start-btn');
const stopButton = document.getElementById('stop-btn');
const createSessionBtn = document.getElementById('create-session-btn');
const sessionKeyInput = document.getElementById('session-key');
const transcriptContainer = document.getElementById('transcript-container');
const questionsList = document.getElementById('questions-list');
const statusMessage = document.getElementById('status-message');
const fetchQuestionsBtn = document.getElementById('fetch-questions-btn');
const uploadBtn = document.getElementById('upload-btn'); 
const fileInput = document.getElementById('file-input'); 
const fetchTranscriptBtn = document.getElementById('fetch-transcript-btn');

// --- 3. INITIALIZE SUPABASE ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 4. APP STATE ---
let currentSessionKey = null;
let mediaRecorder;
let audioChunks = [];
let stream;
// let sessionInterval; // <-- No longer needed

// --- 5. CORE FUNCTIONS ---

/**
 * Creates a new session key, enables buttons
 */
function createSession() {
    currentSessionKey = `CLASS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    console.log(`Session key set to: ${currentSessionKey}`);
    sessionKeyInput.value = currentSessionKey;
    
    // Clear old data
    transcriptContainer.innerHTML = '<p class="text-gray-500">Click the button to load transcript...</p>';
    questionsList.innerHTML = '<li class="text-gray-500">Click the button to load questions...</li>';
    
    // Enable all buttons
    startButton.disabled = false;
    fetchQuestionsBtn.disabled = false;
    uploadBtn.disabled = false;
    fetchTranscriptBtn.disabled = false;
}

// --- LIVE TRANSCRIPTION LOGIC ---

/**
 * Starts the microphone for a single 10-second recording
 */
async function startRecording() {
    if (!currentSessionKey) {
        alert('Please create a session key first!');
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        // This function now only runs once when stopRecording() is called
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            uploadChunk(audioBlob); // Upload the single clip
            audioChunks = []; 
        };

        mediaRecorder.start();
        statusMessage.textContent = `Recording for ${RECORDING_DURATION_MS / 1000} seconds...`;
        
        // --- THIS IS THE NEW LOGIC ---
        // Automatically call stopRecording() after 10 seconds
        setTimeout(() => {
            // Check if recorder is still active (user may have clicked Stop manually)
            if (mediaRecorder && mediaRecorder.state === "recording") {
                stopRecording();
            }
        }, RECORDING_DURATION_MS); // Use the 10-second variable

        startButton.disabled = true;
        stopButton.disabled = false;
        uploadBtn.disabled = true; // Disable file upload while live

    } catch (error) {
        console.error('Error starting microphone:', error);
        alert('Could not start microphone. Please check permissions.');
    }
}

/**
 * Stops the live microphone recording
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // This triggers the 'onstop' handler
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    // No more interval to clear
    
    statusMessage.textContent = 'Recording stopped. Uploading...';
    startButton.disabled = false; // Re-enable Start button
    stopButton.disabled = true;
    uploadBtn.disabled = false; 
}

/**
 * Uploads a single audio chunk to the LIVE n8n workflow
 */
async function uploadChunk(audioBlob) {
    console.log(`Uploading ${audioBlob.size} byte chunk...`);
    statusMessage.textContent = 'Uploading 10-second clip...';
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio_chunk.webm');
    formData.append('sessionKey', currentSessionKey);

    try {
        const response = await fetch(N8N_LIVE_CHUNK_URL, { 
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            console.error('Error from n8n live workflow', await response.text());
            statusMessage.textContent = 'Error sending chunk. Check n8n.';
        } else {
             statusMessage.textContent = '10-second clip sent for processing!';
        }
    } catch (error) {
        console.error('Error uploading chunk:', error);
        statusMessage.textContent = 'Upload error. Check console.';
    }
}


// --- FILE UPLOAD LOGIC ---

/**
 * Uploads a single FULL file to the UPLOAD n8n workflow
 */
async function uploadFullFile() {
    if (!currentSessionKey) {
        alert('Please create a session key first!');
        return;
    }
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload first.');
        return;
    }

    console.log(`Uploading full file: ${file.name}`);
    statusMessage.textContent = `Uploading ${file.name}...`;
    uploadBtn.disabled = true;
    startButton.disabled = true; 

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('sessionKey', currentSessionKey);

    try {
        const response = await fetch(N8N_FULL_UPLOAD_URL, { 
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
             console.error('Error from n8n upload workflow', await response.text());
             statusMessage.textContent = 'Error processing file. Check n8n.';
        } else {
            statusMessage.textContent = 'File upload complete! Processing...';
            fetchQuestionsOnClick();
        }

    } catch (error) {
        console.error('Error uploading full file:', error);
        statusMessage.textContent = 'Full file upload error. Check console.';
    }
    uploadBtn.disabled = false;
    startButton.disabled = false;
}


// --- DATA FETCHING LOGIC ---

/**
 * Fetches all transcripts for the session when the button is clicked
 */
async function fetchTranscriptsOnClick() {
    if (!currentSessionKey) {
        alert('Please create a session key first.');
        return;
    }

    console.log('Fetching transcripts for session:', currentSessionKey);
    transcriptContainer.innerHTML = '<p class="text-gray-500">Loading...</p>';

    // Fix: Ensure table name matches Supabase (e.g., 'transcripts')
    const { data, error } = await supabaseClient
        .from('Transcripts') // <-- Make sure this is lowercase (or matches your table)
        .select('text') 
        .eq('session_key', currentSessionKey)
        .order('created_at', { ascending: true }); 

    if (error) {
        console.error('Error fetching transcripts:', error);
        transcriptContainer.innerHTML = '<p class="text-red-500">Error loading transcripts.</p>';
        return;
    }

    if (!data || data.length === 0) {
        transcriptContainer.innerHTML = '<p class="text-gray-500">No transcript found yet.</p>';
        return;
    }

    const fullTranscript = data.map(chunk => chunk.text).join(' '); 
    transcriptContainer.textContent = fullTranscript;
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

/**
 * Fetches all questions for the session when the button is clicked
 */
async function fetchQuestionsOnClick() {
    if (!currentSessionKey) {
        alert('Please create a session key first.');
        return;
    }

    console.log('Fetching questions for session:', currentSessionKey);
    questionsList.innerHTML = '<li class="text-gray-500">Loading...</li>';

    // Fix: Ensure table name matches Supabase (e.g., 'questions')
    const { data, error } = await supabaseClient
        .from('questions') // <-- Make sure this is lowercase (or matches your table)
        .select('question_text')
        .eq('session_key', currentSessionKey);

    if (error) {
        console.error('Error fetching questions:', error);
        questionsList.innerHTML = '<li class="text-red-500">Error loading questions.</li>';
        return;
    }

    if (!data || data.length === 0) {
        questionsList.innerHTML = '<li class="text-gray-500">No questions found yet.</li>';
        return;
    }

    questionsList.innerHTML = ''; 

    data.forEach(question => {
        const li = document.createElement('li');
        li.textContent = question.question_text;
        li.className = 'bg-gray-700 p-3 rounded-md text-gray-200';
        questionsList.appendChild(li);
    });
}


// --- 6. ATTACH EVENT LISTENERS ---
createSessionBtn.addEventListener('click', createSession);
startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
fetchQuestionsBtn.addEventListener('click', fetchQuestionsOnClick);
uploadBtn.addEventListener('click', uploadFullFile);
fetchTranscriptBtn.addEventListener('click', fetchTranscriptsOnClick);

