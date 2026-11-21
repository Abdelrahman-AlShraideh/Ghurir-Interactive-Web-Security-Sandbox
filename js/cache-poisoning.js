/* ==========================================
   GHURIR - WEB CACHE POISONING SIMULATOR
   Safe browser-based educational simulation
========================================== */

const state = {
    mode: "vulnerable",
    selectedPayload: null,
    cache: new Map(),
    requestCount: 0
};

const elements = {
    vulnerableBtn: document.getElementById("vulnerableBtn"),
    fixedBtn: document.getElementById("fixedBtn"),
    attackBtn: document.getElementById("attackBtn"),
    victimBtn: document.getElementById("victimBtn"),
    clearCacheBtn: document.getElementById("clearCacheBtn"),
    modeStatus: document.getElementById("modeStatus"),
    cacheStatus: document.getElementById("cacheStatus"),
    simulationLog: document.getElementById("simulationLog"),
    payloadButtons: document.querySelectorAll(".payload-btn")
};

function log(message, type = "info") {
    const entry = document.createElement("p");
    entry.className = `log-${type}`;
    entry.textContent = message;

    elements.simulationLog.appendChild(entry);
    elements.simulationLog.scrollTop =
        elements.simulationLog.scrollHeight;
}

function updateStatus() {
    elements.modeStatus.textContent =
        state.mode === "vulnerable"
            ? "VULNERABLE MODE"
            : "FIXED MODE";

    elements.modeStatus.style.color =
        state.mode === "vulnerable" ? "#ffb84d" : "#00ff9c";

    elements.cacheStatus.textContent =
        `Cache: ${state.cache.size} entr${state.cache.size === 1 ? "y" : "ies"}`;
}

function selectMode(mode) {
    if (state.mode === mode) return;

    state.mode = mode;
    state.cache.clear();

    elements.vulnerableBtn.classList.toggle(
        "active",
        mode === "vulnerable"
    );

    elements.fixedBtn.classList.toggle(
        "active",
        mode === "fixed"
    );

    log(`Mode changed to ${mode.toUpperCase()}. Cache cleared.`, "info");

    updateStatus();
}

function selectPayload(button) {
    state.selectedPayload = button.dataset.payload;

    elements.payloadButtons.forEach(item => {
        item.classList.toggle("selected", item === button);
    });

    log(`Selected X-Forwarded-Host: ${state.selectedPayload}`, "info");
}

function buildResponse(request) {
    if (state.mode === "vulnerable") {
        return {
            page: "Welcome to GHURIR News",
            assetHost: request.headers["X-Forwarded-Host"] ||
                "trusted.example"
        };
    }

    return {
        page: "Welcome to GHURIR News",
        assetHost: "trusted.example"
    };
}

function handleRequest(request) {
    const cacheKey = request.url;

    if (state.cache.has(cacheKey)) {
        log(`CACHE HIT: ${request.url}`, "warning");
        return state.cache.get(cacheKey);
    }

    log(`CACHE MISS: ${request.url}`, "info");

    const response = buildResponse(request);

    state.cache.set(cacheKey, response);

    log("Response stored in cache.", "success");

    return response;
}

function sendAttackerRequest() {
    if (!state.selectedPayload) {
        log("Please select a payload first.", "error");
        return;
    }

    state.requestCount++;

    log("--- Attacker Request ---", "info");

    const request = {
        url: "/news",
        headers: {
            "X-Forwarded-Host": state.selectedPayload
        }
    };

    const response = handleRequest(request);

    if (state.mode === "vulnerable") {
        if (response.assetHost === state.selectedPayload) {
            log(
                `POISONING SUCCESS: Cache now serves ${response.assetHost}`,
                "success"
            );
        } else {
            log(
                "The cache already contains a different response. Clear it before testing another payload.",
                "warning"
            );
        }
    } else {
        log(
            `FIXED: Untrusted header ignored. Asset host: ${response.assetHost}`,
            "success"
        );
    }

    updateStatus();
}

function sendVictimRequest() {
    log("--- Victim Request ---", "info");

    const request = {
        url: "/news",
        headers: {}
    };

    const response = handleRequest(request);

    log(`Victim received page: ${response.page}`, "info");
    log(`Victim received asset host: ${response.assetHost}`, "warning");

    if (
        state.mode === "vulnerable" &&
        response.assetHost !== "trusted.example"
    ) {
        log(
            "ATTACK CONFIRMED: Victim received the poisoned cached response!",
            "error"
        );
    } else {
        log(
            "SAFE: Victim received the trusted response.",
            "success"
        );
    }

    updateStatus();
}

function clearCache() {
    state.cache.clear();

    log("Cache cleared successfully.", "success");

    updateStatus();
}

elements.vulnerableBtn.addEventListener("click", () => {
    selectMode("vulnerable");
});

elements.fixedBtn.addEventListener("click", () => {
    selectMode("fixed");
});

elements.attackBtn.addEventListener("click", sendAttackerRequest);
elements.victimBtn.addEventListener("click", sendVictimRequest);
elements.clearCacheBtn.addEventListener("click", clearCache);

elements.payloadButtons.forEach(button => {
    button.addEventListener("click", () => selectPayload(button));
});

updateStatus();

log("Web Cache Poisoning simulator initialized.", "success");
log("Select a payload, then send an attacker request.", "info");

/* ==========================================
   ATTACK WALKTHROUGH ENGINE - VULNERABLE / FIXED
========================================== */

const walkthroughScenarios = {
    vulnerable: [
        {
            label: "STEP 1 - LEGITIMATE REQUEST",
            title: "A User Requests the Page",
            description: "A visitor requests /news. The cache has no stored response, so the request is forwarded to the origin server.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\n\nCache: MISS\nAction: Forward request to Origin Server",
            active: ["cacheNode", "originNode"],
            connections: ["connection2"],
            cache: "Empty"
        },
        {
            label: "STEP 2 - ATTACKER REQUEST",
            title: "The Attacker Manipulates a Header",
            description: "The attacker sends the same URL with an X-Forwarded-Host header. The vulnerable application uses this untrusted value to build its response.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\nX-Forwarded-Host: attacker.example\n\nCache Key: /news",
            active: ["attackerNode", "cacheNode"],
            connections: ["connection1"],
            cache: "Request received"
        },
        {
            label: "STEP 3 - CACHE POISONING",
            title: "The Cache Stores the Modified Response",
            description: "The origin server generates a response containing attacker.example. The cache stores it under /news, although the response also depended on a header absent from the cache key.",
            http: "HTTP/1.1 200 OK\n\nPage: GHURIR News\nAsset Host: attacker.example\n\nStored Cache Key: /news",
            active: ["originNode", "cacheNode"],
            connections: ["connection2"],
            cache: "POISONED"
        },
        {
            label: "STEP 4 - VICTIM REQUEST",
            title: "The Victim Receives a Cache Hit",
            description: "The victim requests /news without the attacker's header. The cache finds the existing entry and serves the poisoned response.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\n\nCache: HIT\nServed Asset Host: attacker.example",
            active: ["victimNode", "cacheNode"],
            connections: ["connection3"],
            cache: "POISONED"
        },
        {
            label: "STEP 5 - ATTACK CONFIRMED",
            title: "The Victim Receives the Poisoned Response",
            description: "The victim receives a response containing attacker.example. The shared cache has distributed attacker-influenced content to another visitor.",
            http: "VICTIM RESPONSE\n\nHTTP/1.1 200 OK\nAsset Host: attacker.example\n\nRESULT: CACHE POISONING SUCCESSFUL",
            active: ["victimNode"],
            connections: ["connection3"],
            cache: "POISONED"
        }
    ],

    fixed: [
        {
            label: "STEP 1 - LEGITIMATE REQUEST",
            title: "A User Requests the Page",
            description: "A visitor requests /news. The cache has no stored response, so the request is forwarded to the origin server.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\n\nCache: MISS\nAction: Forward request to Origin Server",
            active: ["cacheNode", "originNode"],
            connections: ["connection2"],
            cache: "Empty"
        },
        {
            label: "STEP 2 - ATTACKER REQUEST",
            title: "The Attacker Sends an Untrusted Header",
            description: "The attacker sends X-Forwarded-Host: attacker.example. The fixed application does not trust this header when constructing the cached response.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\nX-Forwarded-Host: attacker.example\n\nApplication: Ignore untrusted header",
            active: ["attackerNode", "cacheNode"],
            connections: ["connection1"],
            cache: "Request received"
        },
        {
            label: "STEP 3 - SAFE RESPONSE STORED",
            title: "The Application Uses the Trusted Host",
            description: "The application generates the response using trusted.example. The cache stores a response that was not influenced by the attacker's header.",
            http: "HTTP/1.1 200 OK\n\nPage: GHURIR News\nAsset Host: trusted.example\n\nStored Cache Key: /news",
            active: ["originNode", "cacheNode"],
            connections: ["connection2"],
            cache: "SAFE ENTRY"
        },
        {
            label: "STEP 4 - VICTIM REQUEST",
            title: "The Victim Requests the Same Page",
            description: "The victim requests /news. The cache returns the stored response, which contains the trusted host.",
            http: "GET /news HTTP/1.1\nHost: trusted.example\n\nCache: HIT\nServed Asset Host: trusted.example",
            active: ["victimNode", "cacheNode"],
            connections: ["connection3"],
            cache: "SAFE ENTRY"
        },
        {
            label: "STEP 5 - ATTACK BLOCKED",
            title: "The Victim Receives a Safe Response",
            description: "The victim receives trusted.example. The attacker's header did not influence the cached response, so this simulated attack was prevented.",
            http: "VICTIM RESPONSE\n\nHTTP/1.1 200 OK\nAsset Host: trusted.example\n\nRESULT: ATTACK BLOCKED",
            active: ["victimNode"],
            connections: ["connection3"],
            cache: "SAFE"
        }
    ]
};

let walkthroughMode = "vulnerable";
let walkthroughIndex = -1;

const walkthroughElements = {
    progress: document.getElementById("walkthroughProgress"),
    label: document.getElementById("walkthroughStepLabel"),
    title: document.getElementById("walkthroughTitle"),
    description: document.getElementById("walkthroughDescription"),
    http: document.getElementById("walkthroughHttp"),
    previous: document.getElementById("previousStepBtn"),
    next: document.getElementById("nextStepBtn"),
    reset: document.getElementById("resetWalkthroughBtn"),
    cache: document.getElementById("cacheNodeStatus"),
    vulnerable: document.getElementById("walkthroughVulnerableBtn"),
    fixed: document.getElementById("walkthroughFixedBtn")
};

function renderWalkthrough() {
    const step = walkthroughScenarios[walkthroughMode][walkthroughIndex];

    document.querySelectorAll(".attack-node").forEach(node => {
        node.classList.remove("active", "compromised");
    });

    document.querySelectorAll(".attack-connection").forEach(connection => {
        connection.classList.remove("active");
    });

    walkthroughElements.progress.textContent =
        `STEP ${walkthroughIndex + 1} / 5`;

    walkthroughElements.label.textContent = step.label;
    walkthroughElements.title.textContent = step.title;
    walkthroughElements.description.textContent = step.description;
    walkthroughElements.http.textContent = step.http;
    walkthroughElements.cache.textContent = step.cache;

    step.active.forEach(id => {
        document.getElementById(id).classList.add("active");
    });

    step.connections.forEach(id => {
        document.getElementById(id).classList.add("active");
    });

    const isPoisoned =
        walkthroughMode === "vulnerable" &&
        step.cache === "POISONED";

    document.getElementById("cacheNode").classList.toggle(
        "compromised", isPoisoned
    );

    walkthroughElements.previous.disabled = walkthroughIndex === 0;
    walkthroughElements.next.textContent =
        walkthroughIndex === 4 ? "Restart Simulation" : "Next Step";
}

function nextWalkthroughStep() {
    if (walkthroughIndex === 4) {
        resetWalkthrough();
        return;
    }

    walkthroughIndex++;
    renderWalkthrough();
}

function previousWalkthroughStep() {
    if (walkthroughIndex <= 0) return;

    walkthroughIndex--;
    renderWalkthrough();
}

function resetWalkthrough() {
    walkthroughIndex = -1;

    document.querySelectorAll(".attack-node").forEach(node => {
        node.classList.remove("active", "compromised");
    });

    document.querySelectorAll(".attack-connection").forEach(connection => {
        connection.classList.remove("active");
    });

    walkthroughElements.progress.textContent = "STEP 0 / 5";
    walkthroughElements.label.textContent = "READY TO BEGIN";
    walkthroughElements.title.textContent =
        walkthroughMode === "vulnerable"
            ? "Understand the Attack"
            : "Understand the Protection";

    walkthroughElements.description.textContent =
        walkthroughMode === "vulnerable"
            ? "Start the simulation to follow how an attacker poisons a web cache."
            : "Start the simulation to see how the fixed application prevents cache poisoning.";

    walkthroughElements.http.textContent = "Waiting for simulation...";
    walkthroughElements.cache.textContent = "Empty";
    walkthroughElements.previous.disabled = true;
    walkthroughElements.next.textContent = "Start Simulation";
}

function selectWalkthroughMode(mode) {
    walkthroughMode = mode;

    walkthroughElements.vulnerable.classList.toggle(
        "active", mode === "vulnerable"
    );

    walkthroughElements.fixed.classList.toggle(
        "active", mode === "fixed"
    );

    resetWalkthrough();
}

walkthroughElements.next.addEventListener("click", nextWalkthroughStep);
walkthroughElements.previous.addEventListener("click", previousWalkthroughStep);
walkthroughElements.reset.addEventListener("click", resetWalkthrough);

walkthroughElements.vulnerable.addEventListener("click", () => {
    selectWalkthroughMode("vulnerable");
});

walkthroughElements.fixed.addEventListener("click", () => {
    selectWalkthroughMode("fixed");
});

resetWalkthrough();



/* INTERACTIVE CODE LINE EXPLANATIONS */

document.querySelectorAll(".code-line[data-explanation]").forEach(line => {
    line.setAttribute("tabindex", "0");
    line.setAttribute("role", "button");
    line.setAttribute("aria-label", "Explain this code line");

    function explainLine() {
        document.querySelectorAll(".code-line.selected").forEach(item => {
            item.classList.remove("selected");
        });

        line.classList.add("selected");

        const isVulnerable = line.classList.contains("critical-line");
        document.getElementById("codeExplanationTitle").textContent =
            isVulnerable ? "Why is this line vulnerable?" : "How does this line fix the issue?";

        document.getElementById("codeExplanationText").textContent =
            line.dataset.explanation;
    }

    line.addEventListener("click", explainLine);

    line.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            explainLine();
        }
    });
});


/* ==========================================
   KNOWLEDGE CHECK - WEB CACHE POISONING
========================================== */

(() => {
    const questions = [
        {
            question: "What is the main cause of Web Cache Poisoning?",
            options: [
                "The cache stores responses influenced by input missing from the cache key.",
                "The server uses HTTPS instead of HTTP.",
                "The browser has an outdated cache.",
                "The website contains too many images."
            ],
            answer: 0,
            explanation: "Correct! Cache poisoning can happen when an input changes the response but is not considered when the cache identifies that response."
        },
        {
            question: "What is an Unkeyed Input?",
            options: [
                "An input that is always encrypted.",
                "An input that affects the response but is not included in the cache key.",
                "A password stored in the database.",
                "A request that does not reach the server."
            ],
            answer: 1,
            explanation: "Correct! An Unkeyed Input can influence the generated response without being represented in the cache key. This can cause different requests to receive the same cached response."
        },
        {
            question: "Which approach helps prevent the demonstrated attack?",
            options: [
                "Trust every X-Forwarded-Host header.",
                "Disable all browser cookies.",
                "Use a trusted, server-controlled hostname instead of an untrusted header.",
                "Store every response under the same cache key."
            ],
            answer: 2,
            explanation: "Correct! The application should not allow an untrusted forwarding header to control the cached response. Real systems must also review all response-affecting inputs and cache-key design."
        }
    ];

    const area = document.getElementById("quizQuestionArea");
    if (!area) return;

    const progress = document.getElementById("quizProgress");
    const scoreDisplay = document.getElementById("quizScore");
    const progressBar = document.getElementById("quizProgressBar");
    const questionTitle = document.getElementById("quizQuestion");
    const optionsContainer = document.getElementById("quizOptions");
    const feedback = document.getElementById("quizFeedback");
    const nextButton = document.getElementById("quizNextBtn");
    const restartButton = document.getElementById("quizRestartBtn");
    const result = document.getElementById("quizResult");

    let currentQuestion = 0;
    let score = 0;
    let answered = false;

    function renderQuestion() {
        const item = questions[currentQuestion];
        answered = false;

        progress.textContent = `QUESTION ${currentQuestion + 1} / ${questions.length}`;
        scoreDisplay.textContent = `SCORE: ${score}`;
        progressBar.style.width = `${(currentQuestion / questions.length) * 100}%`;

        questionTitle.textContent = item.question;
        optionsContainer.replaceChildren();
        feedback.textContent = "";
        feedback.classList.remove("visible");

        item.options.forEach((option, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "quiz-option";
            button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;

            button.addEventListener("click", () => selectAnswer(index, button));
            optionsContainer.appendChild(button);
        });

        nextButton.disabled = true;
        nextButton.textContent =
            currentQuestion === questions.length - 1
                ? "View Results"
                : "Next Question";

        result.hidden = true;
        restartButton.hidden = true;
        area.hidden = false;
    }

    function selectAnswer(selectedIndex, selectedButton) {
        if (answered) return;
        answered = true;

        const item = questions[currentQuestion];
        const buttons = [...optionsContainer.querySelectorAll(".quiz-option")];
        const correct = selectedIndex === item.answer;

        if (correct) score++;

        buttons.forEach((button, index) => {
            button.disabled = true;

            if (index === item.answer) {
                button.classList.add("correct");
            } else if (index === selectedIndex) {
                button.classList.add("incorrect");
            }
        });

        feedback.textContent = correct
            ? item.explanation
            : `Not quite. The correct answer is ${String.fromCharCode(65 + item.answer)}. ${item.explanation}`;

        feedback.classList.add("visible");
        scoreDisplay.textContent = `SCORE: ${score}`;
        progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
        nextButton.disabled = false;
    }

    function showResults() {
        area.hidden = true;
        result.hidden = false;
        restartButton.hidden = false;
        nextButton.hidden = true;

        const percentage = Math.round((score / questions.length) * 100);

        let message;
        if (score === 3) {
            message = "Excellent! You understand the key concepts of Web Cache Poisoning.";
        } else if (score === 2) {
            message = "Good work! Review the explanations to strengthen your understanding.";
        } else {
            message = "Keep learning! Review the lab sections and try again.";
        }

        result.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = `${score} / ${questions.length}`;

        const details = document.createElement("p");
        details.textContent = `${percentage}% — ${message}`;

        result.append(heading, details);
        progress.textContent = "QUIZ COMPLETED";
        progressBar.style.width = "100%";
    }

    nextButton.addEventListener("click", () => {
        if (!answered) return;

        if (currentQuestion === questions.length - 1) {
            showResults();
            return;
        }

        currentQuestion++;
        renderQuestion();
    });

    restartButton.addEventListener("click", () => {
        currentQuestion = 0;
        score = 0;
        nextButton.hidden = false;
        renderQuestion();
    });

    renderQuestion();
})();
