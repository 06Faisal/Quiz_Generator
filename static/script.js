/**
 * AI Quiz Generator — Frontend Logic
 * Handles form submission, API calls, and dynamic quiz rendering.
 */

// --- Slider live preview ---
const slider = document.getElementById("num-questions");
const sliderValue = document.getElementById("slider-value");

slider.addEventListener("input", () => {
    sliderValue.textContent = slider.value;
});

// --- Error handling ---
let errorTimer;

function showError(message) {
    const toast = document.getElementById("error-toast");
    document.getElementById("error-message").textContent = message;
    toast.classList.remove("is-hidden");

    clearTimeout(errorTimer);
    errorTimer = setTimeout(hideError, 8000);
}

function hideError() {
    document.getElementById("error-toast").classList.add("is-hidden");
}

// --- Toggle loading state ---
function setLoading(loading) {
    const btn = document.getElementById("generate-btn");
    const btnText = btn.querySelector(".btn-text");
    const btnLoader = btn.querySelector(".btn-loader");

    btn.disabled = loading;
    btnText.classList.toggle("is-hidden", loading);
    btnLoader.classList.toggle("is-hidden", !loading);
}

// --- Generate Quiz ---
async function generateQuiz() {
    const topic = document.getElementById("topic").value.trim();
    const numQuestions = parseInt(document.getElementById("num-questions").value);
    const difficulty = document.getElementById("difficulty").value;

    hideError();

    if (!topic) {
        showError("Please enter a topic to generate questions.");
        document.getElementById("topic").focus();
        return;
    }

    setLoading(true);
    document.getElementById("results").innerHTML = "";

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: topic,
                num_questions: numQuestions,
                difficulty: difficulty,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "Something went wrong. Please try again.");
            setLoading(false);
            return;
        }

        renderQuiz(data.questions, topic, difficulty);
    } catch (err) {
        showError("Network error. Please check your connection and try again.");
        console.error("Fetch error:", err);
    } finally {
        setLoading(false);
    }
}

// --- Render Quiz ---
function renderQuiz(questions, topic, difficulty) {
    const results = document.getElementById("results");

    document.getElementById("docket-sheet").textContent = topic;

    // Header
    const header = document.createElement("div");
    header.className = "results-header";
    header.innerHTML = `
        <h2>Generated Quiz</h2>
        <div class="results-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            ${questions.length} Questions • ${difficulty}
        </div>
    `;
    results.appendChild(header);

    // Question cards
    questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "question-card";
        card.style.animationDelay = `${index * 0.1}s`;

        const correctLetter = q.answer?.toUpperCase() || "";

        let optionsHtml = "";
        const optionKeys = ["A", "B", "C", "D"];
        optionKeys.forEach((key) => {
            const optionText = q.options?.[key] || "";
            const isCorrect = key === correctLetter;
            optionsHtml += `
                <div class="option ${isCorrect ? "correct" : ""}">
                    <span class="option-letter">${key}</span>
                    <span class="option-text">${escapeHtml(optionText)}</span>
                    ${isCorrect ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:auto;color:var(--success)"><path d="M5 13l4 4L19 7"/></svg>` : ""}
                </div>
            `;
        });

        const explanationHtml = q.explanation
            ? `<div class="explanation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    <p>${escapeHtml(q.explanation)}</p>
               </div>`
            : "";

        card.innerHTML = `
            <div class="question-number">${index + 1}</div>
            <p class="question-text">${escapeHtml(q.question)}</p>
            <div class="options-list">${optionsHtml}</div>
            ${explanationHtml}
        `;

        results.appendChild(card);
    });

    // Smooth scroll to results
    results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Utility: escape HTML ---
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

// --- Wiring ---
document.getElementById("generate-btn").addEventListener("click", generateQuiz);

document.getElementById("topic").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        generateQuiz();
    }
});
