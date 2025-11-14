# Ask-me-live: Real-Time AI Classroom Q&A Platform

![Project Type](https://img.shields.io/badge/Project_Type-Hackathon%20%7C%20EdTech-blue)
![Status](https://img.shields.io/badge/Status-Completed%20(38h%20Hackathon)-success)
![Language](https://img.shields.io/badge/Language-HTML%20%7C%20CSS%20%7C%20JS-yellow)
![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss)
![Backend](https://img.shields.io/badge/Backend-n8n.io%20%7C%20Supabase-orange)
![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20AssemblyAI-purple)

## Overview

This project, built in 38 hours for the **Islander Hack 2025**, is a web-based application designed to increase student engagement and understanding during live lectures. It provides a "Host" panel for professors and a "Student" portal for attendees, bridging the gap between lecture content and student questions using real-time transcription and generative AI.

### The Problem

In a typical lecture, many students are hesitant to interrupt the professor to ask a question (due to shyness, fear of their question being "dumb," or timing). This leads to a disconnect where students leave class confused and professors are unaware of which concepts were poorly understood.

### Key Features

This platform solves that problem by:
* **Providing Anonymity:** A "Student Portal" allows students to join a session anonymously and ask questions.
* **Generating Contextual Questions:** A "Host Panel" transcribes the professor's lecture in real-time and uses AI to automatically generate insightful questions about the lecture.
* **Creating an AI Safety Net:** Students can ask their own questions and receive answers from a **Gemini-powered RAG chatbot** that uses the lecture transcript as its knowledge base.
* **Filtering Questions:** Custom questions are first filtered by an AI "moderator" to ensure they are polite and relevant before being sent to the professor.

---

## Project Contents

| File Name | Description |
| :--- | :--- |
| `index.html` | The **Host (Professor) Panel** UI. |
| `client.js` | The **Client-Side JavaScript** for the Host panel. |
| `student.html` | The **Student Portal** UI for joining sessions. |
| `student.js` | The **Client-Side JavaScript** for the Student portal. |
| `n8n_backend_trancribe.txt` | The `n8n` workflow (backend) for transcribing audio. |
| `n8n_students_question...txt` | The `n8n` workflow (backend) for handling student questions. |
| `Demo.mp4` | A video demonstration of the project. |

---

## Setup and Execution

This project is a "Jamstack" application and requires **no traditional backend server** to be installed, but it does require running n8n and a local web server for development.

### Prerequisites

* A modern **Web Browser** (e.g., Chrome, Firefox).
* **VS Code** with the **"Live Server"** extension (critical for avoiding CORS errors).
* An **n8n.io** instance (local or cloud).
* A **Supabase** account (for the database).
* API keys for **AssemblyAI** and **Google AI (Gemini)**.

### Dependencies & Setup

1.  **Supabase:**
    * Create a new project.
    * Create two tables: `transcripts` (to store lecture text) and `questions` (to store AI-generated and student questions).
    * Note your **Project URL** and `anon` **public key**.

2.  **n8n.io:**
    * Import the workflow(s) from `n8n_workflows.json`.
    * Create credentials for Supabase, AssemblyAI, and Gemini and connect them to the appropriate nodes.
    * **Activate** the workflows to get the **Production URLs** (do *not* use Test URLs).

3.  **Frontend Code:**
    * Update `client.js` with your Supabase URL, anon key, and all n8n Production Webhook URLs.

### Running the Application

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Basha-hub
    /Ask-me-live.git
    cd Ask-me-live
    ```

2.  **Run n8n with CORS Enabled:**
    * To allow requests from your local server, you *must* start n8n with the correct environment variable.
    ```bash
    # On Windows (cmd)
    set WEBHOOK_CORS_ALLOWED_ORIGINS=* && n8n
    
    # On macOS/Linux
    WEBHOOK_CORS_ALLOWED_ORIGINS='*' n8n
    ```

3.  **Run the Frontend:**
    * Open the project folder in VS Code.
    * Right-click `host.html` or `student.html` and select **"Open with Live Server"**.
    * This will launch the app (e.g., at `http://127.0.0.1:5500`), satisfying browser CORS policies.

> **Note:** Opening the `.html` files directly (via `file:///...`) **will not work**. All API requests will be blocked by browser security policies (CORS).

---

## System Architecture

The system is split into two applications (Host and Student) that communicate via serverless n8n.io webhooks, with Supabase acting as the central database.



### Host Application (Professor)
1.  **Create Session:** Host clicks "Create" to generate a unique `session_key`.
2.  **Start/Upload:** Host records audio or uploads a file.
3.  **Send to n8n:** The browser sends the audio file + `session_key` to an n8n webhook.
4.  **n8n Workflow:**
    * Transcribes audio via **AssemblyAI**.
    * Saves the transcript to **Supabase**.
    * Sends the transcript to **Gemini** to generate questions.
    * Saves the AI questions to **Supabase**.
5.  **Fetch Data:** Host clicks "Refresh" to pull all transcripts and questions for their session from Supabase.

### Student Application
1.  **Join Session:** Student enters the `session_key`.
2.  **Fetch Questions:** The app pulls all questions from Supabase matching that key.
3.  **Action Modal:** Clicking a question gives two options:
    * **"Ask Teacher":** Sends the question to an n8n workflow that saves it for the professor.
    * **"Ask AI":** Triggers a **RAG workflow**. n8n fetches the *entire* lecture transcript from Supabase, combines it with the question, and asks Gemini to answer it *only* using that context.
4.  **Custom Question:** A student's custom question is sent to a "filter" workflow, where Gemini classifies it as relevant or not before it is saved.

## Key Challenges & Debugging

A major part of this 38-hour hackathon was debugging real-world serverless and browser issues.

* **The `file:///` vs. `http://` Problem:**
    * **Symptom:** All `fetch` requests to n8n/Supabase were blocked by CORS.
    * **Solution:** The app *must* be served from a local server. We used the VS Code "Live Server" extension (`http://127.0.0.1:5500`).

* **n8n CORS Error:**
    * **Symptom:** Even on Live Server, requests to n8n were blocked.
    * **Solution:** Restarted the n8n server with the `WEBHOOK_CORS_ALLOWED_ORIGINS=*` flag.

* **n8n 404 Not Found Error:**
    * **Symptom:** The `client.js` file was getting a 404 error when sending audio.
    * **Solution:** We were using the n8n "Test URL" (`/webhook-test/...`), which is temporary. We had to switch to the permanent **"Production URL"** and activate the workflow.

* **n8n File + Text Uploads:**
    * **Symptom:** The n8n Webhook received the audio file, but the `sessionKey` was missing.
    * **Solution:** In the Webhook node's "Options," we had to set **"Binary Data" to `On`** (to get the file) and also set **"JSON Passthrough" to `On`** (to get the other text fields).

* **n8n Loop Logic (The "Only One Question" Problem):**
    * **Symptom:** The Gemini node produced 3 questions, but only 1 was saved to Supabase.
    * **Solution:** The "Supabase Insert" node (inside the loop) couldn't access the `session_key` from the node before the loop. We fixed this by modifying the node *before* the loop to copy the `session_key` onto *every individual question object* it sent to the loop.

## Future Plans

* **Student Upvoting:** Add an `upvotes` column to the `questions` table and an n8n workflow to increment the count, allowing the host to sort by "most popular."
* **Professor Dashboard:** Expand the host page to show a list of student-submitted questions with a "Mark as Answered" button that flips an `is_answered` boolean flag in Supabase.
* **Learning Reports:** A "Generate Summary" button for the host to trigger an n8n workflow that uses Gemini to summarize the entire transcript, identify key topics, and list unanswered questions.
* **Automated Exercises:** A workflow to generate multiple-choice quizzes or short-answer problems based on the lecture summary.

---

## 📧 Contact

**Vigneshwar Lokoji**
* [LinkedIn](www.linkedin.com/in/vigneshwar-lokoji/)
* [GitHub]((https://github.com/Basha-hub))
* *Feel free to connect or ask questions about the project or code.*
