# Ask-me-live
## Real-Time AI Classroom Q&A Platform

This project is a web-based application designed to increase student engagement and understanding during live lectures. It provides a "Host" panel for professors and a "Student" portal for attendees, bridging the gap between lecture content and student questions using real-time transcription and generative AI.

### Problem Statement

In a typical lecture, many students are hesitant to interrupt the professor to ask a question. They might be shy, afraid their question is "dumb," or simply unable to formulate their question in time. This leads to a disconnect where students leave class confused and professors are unaware of which concepts were poorly understood.

This platform solves that problem by:

**Providing Anonymity**: A "Student Portal" allows students to join a session anonymously (using a session key) and ask questions.

**Generating Contextual Questions**: A "Host Panel" transcribes the professor's lecture in real-time. It then uses AI to automatically generate insightful questions about the lecture, which students can see.

**Creating an AI Safety Net**: Students can ask their own questions (about the lecture or custom topics) and receive answers from an AI, which is trained to act as a helpful teaching assistant.

**Filtering Questions**: Custom questions are first filtered by an AI "moderator" to ensure they are polite and relevant before being sent to the professor, reducing noise and keeping the session productive.

### Technologies Used

This project is a modern "Jamstack" application that combines a static frontend with a serverless backend.

**Frontend**:

HTML5, CSS3, & JavaScript (ES6+): For the core structure, styling, and logic of the two web applications (Host and Student).

Tailwind CSS: For all styling, loaded via a CDN for rapid development.

**Backend (Serverless)**:

n8n.io: The "brain" of the operation. This low-code/pro-code platform acts as our entire backend, handling all API calls, logic, and data processing.

Supabase: The database for the application. It stores all transcripts, generated questions, and student-submitted questions.

Supabase Realtime: Used in our initial prototypes (and can be re-enabled) to push live data to the web clients without needing to refresh.

**AI & APIs**:

AssemblyAI: Used for its high-accuracy, real-time speech-to-text transcription API.

Gemini (Google AI): Used as the generative AI for all language tasks:

Generating insightful questions from transcript snippets.

Answering student questions as a RAG (Retrieval-Augmented Generation) chatbot.

Classifying and filtering custom-submitted student questions.

### How It Works

The system is split into two main applications (Host and Student) that communicate through n8n and Supabase.

**Host Application (Professor)**

Create Session: The Host clicks "Create" to generate a unique session_key (e.g., CLASS-ABC123).

Start/Upload: The Host can either:

"Transcribe Live": Records a 10-second audio chunk.

"Upload File": Selects a full, pre-recorded lecture file.

Send to n8n: The browser sends the audio file and the session_key to the appropriate n8n webhook.

n8n Workflow (Live or Upload):

Transcribes the audio using AssemblyAI.

Saves the transcript text to the Supabase transcripts table.

Sends the transcript text to Gemini with a prompt to generate questions.

Parses the AI's JSON response and saves each question as a new row in the Supabase questions table.

Fetch Data: The Host can click "See/Refresh Transcript" or "See/Refresh Questions" to pull all data for their session from Supabase.

**Student Application**

Join Session: The student enters the session_key (e.g., CLASS-ABC123). The app confirms the key is valid by checking the Supabase questions table.

Fetch Questions: The student clicks "See/Refresh Questions," which fetches all questions from Supabase matching that session_key.

Action Modal: Clicking a question gives two options:

"Ask Teacher": Sends the question to an n8n workflow that saves it for the professor.

"Ask AI": Sends the question to a RAG workflow. This workflow fetches the entire lecture transcript from Supabase, combines it with the question, and asks Gemini to answer it only using that context.

Custom Question: A student can type their own question. It's sent to an n8n "filter" workflow that uses Gemini to classify it as "good" or "irrelevant." "Good" questions are saved to the database; "irrelevant" ones are rejected with a message.

### Challenges Faced & Debugging

This project involved solving many complex, real-world development challenges.

Environment Hell: The file:/// vs. http:// Problem

Symptom: Buttons were "dead." We found that opening index.html directly from the file system (file:///...) worked for UI, but all network requests (fetch) to n8n or Supabase were blocked by the browser's CORS policy.

Solution: The app must be served from a local server. We used the VS Code "Live Server" extension, which serves the page over http://127.0.0.1:5500, satisfying browser security rules.

The Infinite Refresh Loop

Symptom: As soon as we used Live Server, the page was stuck in a non-stop refresh loop, making it impossible to click anything.

Solution: The project was in a "dirty" folder (like the main User profile). Live Server was trying to "watch" thousands of system files (node_modules, NTUSER.DAT). We fixed this by moving the index.html and client.js files to a new, clean, dedicated project folder. This is the single most important setup step.

n8n CORS Error

Symptom: Even on Live Server, requests to n8n were blocked by CORS.

Solution: We had to restart the n8n server with a special flag to allow requests from our frontend's origin: set WEBHOOK_CORS_ALLOWED_ORIGINS=* && n8n.

n8n API Key & 401 Errors (AssemblyAI)

Symptom: Our server-side calls were failing with 401 Unauthorized.

Solution: This was a three-part problem:

We were trying to use the new AssemblyAI v3 API key with the old v2 token endpoint.

The v3 SDK expected expires_in_seconds, but we were sending expires_in.

The free tier limit for tokens was 600 seconds, not 3600.

n8n 404 Not Found Error

Symptom: The client.js file was getting a 404 error when sending audio.

Solution: We were using the n8n "Test URL" (/webhook-test/...) in our code. This URL is temporary and dies after 120 seconds. We had to switch to the permanent "Production URL" and activate the workflow.

Supabase Case-Sensitivity

Symptom: The app was getting a 404 error: Column 'questions.question' does not exist.

Solution: We had created a table named questions from AI in Supabase, but our code was looking for questions. We also had a column named question but the code looked for question_text. We had to make the code's from() and select() statements exactly match the database schema.

n8n File + Text Uploads

Symptom: The n8n Webhook received the audio file, but the sessionKey was missing.

Solution: In the Webhook node's "Options," we had to set "Binary Data" to On (to get the file) and also set "JSON Passthrough" to On (to get all the other text fields).

n8n Loop Logic (The "Only One Question" Problem)

Symptom: The Gemini node produced 3 questions, but only 1 was saved to Supabase.

Solution: The "Supabase Insert" node (inside the loop) couldn't reach back to the "Set" node to get the session_key on every run. We fixed this by modifying the "Code" node to copy the session_key onto every question object it sent to the loop.

n8n Response Errors (Invalid JSON)

Symptom: The "Ask AI" modal in the browser was failing. The n8n "Respond to Webhook" node showed an Invalid JSON error.

Solution: The AI's text response contained line breaks and quotes, which breaks JSON. We fixed this by changing the "Respond to Webhook" node's "Respond With" setting from JSON to Expression and using { "message": $json.text }. This lets n8n safely format the string.

### Future Plans

This project has a strong foundation for many powerful features:

**Student Upvoting**: Add an upvotes (integer) column to the questions table. Students can click an "upvote" button, which calls an n8n workflow to increment the count for that question's row. The host can then sort questions by "most popular."

**Professor Dashboard**: The host page can be expanded to show a list of student-submitted questions. The host can click a button to "Mark as Answered," which flips an is_answered (boolean) flag in the database, changing its color on the student's screen.

**Learning Reports**: At the end of a session, the host could click a "Generate Summary" button. This would trigger an n8n workflow to:

Fetch the entire transcript from Supabase.

**Send it to Gemini with a prompt like**: "Summarize this lecture, identify the 3 key topics, and list all unanswered questions."

This summary could be saved and shown to students.

**Automated Exercises**: A similar workflow could generate multiple-choice quizzes or short-answer problems based on the lecture summary and AI-generated questions, providing students with a "study guide" after class.
