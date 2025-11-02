// --- 1. CONFIGURE YOUR PROJECT ---
// !! Fill these in from your Supabase & n8n projects !!

const SUPABASE_URL = 'https://cpfzmihwsganukeqwbtw.supabase.co'; // <-- PASTE FROM HOST'S client.js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZnptaWh3c2dhbnVrZXF3YnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTc1MDcsImV4cCI6MjA3NzU5MzUwN30.7Rh15eEvbg5QFnxlMajMsco82Fr1K6Ju_D28t9Y1bMs'; // <-- PASTE FROM HOST'S client.js

// You will create these 2 new n8n workflows
const N8N_ASK_TEACHER_URL = 'http://localhost:5678/webhook-test/student';
const N8N_ASK_AI_URL = 'http://localhost:5678/webhook-test/student';

const N8N_CUSTOM_QUESTION_URL = 'http://localhost:5678/webhook-test/student'; // <-- NEW URL

// --- 2. GET HTML ELEMENTS ---
// Login View
const loginView = document.getElementById('login-view');
const sessionKeyInput = document.getElementById('session-key-input');
const joinBtn = document.getElementById('join-btn');
const loginError = document.getElementById('login-error');

// Questions View
const questionsView = document.getElementById('questions-view');
const sessionKeyDisplay = document.getElementById('session-key-display');
const fetchQuestionsBtn = document.getElementById('fetch-questions-btn');
const questionsList = document.getElementById('questions-list');
const customQuestionInput = document.getElementById('custom-question-input'); // <-- NEW
const submitCustomQuestionBtn = document.getElementById('submit-custom-question-btn'); // <-- NEW
const customQuestionStatus = document.getElementById('custom-question-status'); // <-- NEW

// Modal View
const actionModal = document.getElementById('action-modal');
const modalQuestionText = document.getElementById('modal-question-text');
const modalOptions = document.getElementById('modal-options');
const askTeacherBtn = document.getElementById('ask-teacher-btn');
const askAiBtn = document.getElementById('ask-ai-btn');
const modalResponseArea = document.getElementById('modal-response-area');
const modalResponseText = document.getElementById('modal-response-text');
const closeModalBtn = document.getElementById('close-modal-btn');

// --- 3. APP STATE ---
let currentSessionKey = null;
let supabaseClient = null;
let selectedQuestion = null; // Store the text of the selected question

// --- 4. CORE FUNCTIONS ---

/**
 * Tries to join a session.
 * It "validates" the key by initializing Supabase with it.
 */
async function joinSession() {
    const key = sessionKeyInput.value.trim().toUpperCase();
    if (!key) {
        loginError.textContent = 'Please enter a session key.';
        return;
    }

    try {
        // Initialize Supabase. If keys are wrong, this will fail.
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test the connection and key by trying to fetch one row
        const { error } = await supabaseClient
            .from('questions from AI') // <-- Make sure this table name is correct!
            .select('id')
            .eq('session_key', key)
            .limit(1);

        if (error) {
            console.error('Error joining session:', error);
            loginError.textContent = 'Invalid session key or database error.';
            return;
        }

        // Success!
        currentSessionKey = key;
        sessionKeyDisplay.textContent = currentSessionKey;

        // Hide login, show questions view
        loginView.classList.add('hidden');
        questionsView.classList.remove('hidden');
        
        // Automatically fetch questions on join
        fetchQuestionsOnClick();

    } catch (e) {
        console.error('Initialization error:', e);
        loginError.textContent = 'Error connecting to the service.';
    }
}

/**
 * Fetches all questions for the current session from Supabase
 */
async function fetchQuestionsOnClick() {
    if (!currentSessionKey || !supabaseClient) return;

    console.log('Fetching questions for session:', currentSessionKey);
    questionsList.innerHTML = '<li class="text-gray-500">Loading...</li>';

    const { data, error } = await supabaseClient
        .from('questions from AI') // <-- Make sure this table name is correct!
        .select('question') // <-- Make sure this column name is correct!
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

    questionsList.innerHTML = ''; // Clear the "Loading..." text

    data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.question; // <-- Make sure this column name is correct!
        li.className = 'bg-gray-700 p-3 rounded-md text-gray-200 cursor-pointer hover:bg-gray-600';
        
        // Add click listener to show the modal
        li.addEventListener('click', () => {
            showActionModal(item.question); // <-- Make sure this column name is correct!
        });
        
        questionsList.appendChild(li);
    });
}

/**
 * NEW: Handles the submission of a user-written question
 */
async function handleSubmitCustomQuestion() {
    const questionText = customQuestionInput.value.trim();
    if (!questionText) {
        customQuestionStatus.textContent = 'Please type a question first.';
        customQuestionStatus.className = 'mt-3 text-sm text-center text-yellow-400';
        return;
    }

    customQuestionStatus.textContent = 'Submitting question for review...';
    customQuestionStatus.className = 'mt-3 text-sm text-center text-gray-400';
    submitCustomQuestionBtn.disabled = true;

    // Send to your new n8n workflow for filtering
    const response = await sendToN8N(N8N_CUSTOM_QUESTION_URL, {
        question: questionText,
        sessionKey: currentSessionKey,
        askTarget: "custom_AI_filter" // A new target for n8n
    });

    // n8n will respond with a message like "Question sent!" or "Please ask a relevant question."
    customQuestionStatus.textContent = response.message;
    if (response.message.includes('sent')) {
        customQuestionStatus.className = 'mt-3 text-sm text-center text-green-400';
        customQuestionInput.value = ''; // Clear the text box on success
    } else {
        customQuestionStatus.className = 'mt-3 text-sm text-center text-red-400';
    }

    submitCustomQuestionBtn.disabled = false;
}


/**
 * Shows the modal with options for the selected question
 */
function showActionModal(questionText) {
    selectedQuestion = questionText;
    modalQuestionText.textContent = selectedQuestion;
    
    // Reset modal state
    modalOptions.classList.remove('hidden');
    modalResponseArea.classList.add('hidden');
    modalResponseText.innerHTML = '';
    
    actionModal.classList.remove('hidden');
}

/**
 * Hides the modal
 */
function hideActionModal() {
    actionModal.classList.add('hidden');
    selectedQuestion = null;
}

/**
 * Handles the 'Ask Teacher' button click
 */
async function handleAskTeacher() {
    modalOptions.classList.add('hidden'); // Hide buttons
    modalResponseArea.classList.remove('hidden');
    modalResponseText.innerHTML = '<p class="text-yellow-400">Sending question to teacher...</p>';
    
    // You will build this n8n workflow
    const response = await sendToN8N(N8N_ASK_TEACHER_URL, {
        question: selectedQuestion,
        sessionKey: currentSessionKey,
        askTarget: "teacher"
    });

    modalResponseText.innerHTML = `<p class="text-green-400">${response.message}</p>`;
}

/**
 * Handles the 'Ask AI' button click
 */
async function handleAskAI() {
    modalOptions.classList.add('hidden'); // Hide buttons
    modalResponseArea.classList.remove('hidden');
    modalResponseText.innerHTML = '<p class="text-yellow-400">AI is thinking...</p>';

    // You will build this n8n workflow
    const response = await sendToN8N(N8N_ASK_AI_URL, {
        question: selectedQuestion,
        sessionKey: currentSessionKey,
        askTarget: "AI"
    });

    // The response.message will contain the AI's full answer
    modalResponseText.innerHTML = `<p>${response.message}</p>`;
}

/**
 * Generic function to send data to your n8n workflows
 */
async function sendToN8N(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('n8n workflow returned an error.');
        }
        return await response.json(); // Expect n8n to return { "message": "..." }

    } catch (error) {
        console.error('Error in n8n call:', error);
        return { message: 'There was an error processing your request. Please try again.' };
    }
}


// --- 5. ATTACH EVENT LISTENERS ---
joinBtn.addEventListener('click', joinSession);
fetchQuestionsBtn.addEventListener('click', fetchQuestionsOnClick);
closeModalBtn.addEventListener('click', hideActionModal);
askTeacherBtn.addEventListener('click', handleAskTeacher);
askAiBtn.addEventListener('click', handleAskAI);
submitCustomQuestionBtn.addEventListener('click', handleSubmitCustomQuestion); // <-- NEW

