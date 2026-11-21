/* ==========================================
   GHURIR - OAUTH ACCOUNT LINKING LAB
   Safe educational simulation only.
========================================== */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const state = {
        mode: "vulnerable",
        linked: false,
        authenticated: false,
        confirmed: false,
        simulationStep: 0,
        simulationFinished: false,
        walkMode: "vulnerable",
        step: 0
    };

    const identity = {
        provider: "Google",
        issuer: "https://accounts.google.com",
        subject: "attacker-google-123",
        owner: "Attacker",
        authorizationCode: "attacker-auth-code",
        state: "attacker-state",
        sessionOwner: "Attacker",
        stateValid: true,
        sessionBound: false,
        signatureValid: true,
        issuerTrusted: true
    };

    const logs = [];

    function log(message, type = "info") {
        logs.push({ message, type });

        const output = $("oauthLog");
        if (!output) return;

        const colors = {
            info: "#94a3b8",
            success: "#00ff9c",
            warning: "#ffb547",
            error: "#ff647c"
        };

        const line = document.createElement("p");
        line.textContent = `[${type.toUpperCase()}] ${message}`;
        line.style.color = colors[type] || colors.info;

        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    function renderStatus() {
        const fixed = state.mode === "fixed";

        $("oauthModeStatus").textContent =
            fixed ? "FIXED MODE" : "VULNERABLE MODE";

        $("oauthModeStatus").classList.toggle("fixed", fixed);

        $("oauthVulnerableBtn").classList.toggle(
            "active", !fixed
        );

        $("oauthFixedBtn").classList.toggle(
            "active", fixed
        );

        $("victimAccountStatus").textContent =
            state.linked ? "External identity linked" : "Account not linked";

        $("externalIdentityStatus").textContent =
            `Owned by ${identity.owner}`;

        $("claimEmail").textContent = identity.subject;
        $("claimVerified").textContent =
            identity.sessionBound ? "BOUND TO VICTIM SESSION" : "NOT BOUND TO VICTIM SESSION";

        $("externalEmail").textContent =
            `${identity.provider} identity: ${identity.owner}`;

        const resultStatus = $("oauthResultStatus");

        resultStatus.textContent = state.linked
            ? "COMPROMISED"
            : state.mode === "fixed" && state.simulationFinished
                ? "PROTECTED"
                : "WAITING";

        resultStatus.style.color = state.linked
            ? "#ff647c"
            : state.mode === "fixed" && state.simulationFinished
                ? "#00ff9c"
                : "";
    }

    function clearLogs() {
        logs.length = 0;
        $("oauthLog").replaceChildren();
    }

    function resetSimulation() {
        state.linked = false;
        state.authenticated = false;
        state.confirmed = false;
        state.simulationStep = 0;
        state.simulationFinished = false;

        $("oauthAttackBtn").textContent = "Start Attack";
        renderAttackStep(
            "Understand the account-linking flaw",
            "Start the simulation to follow the attack one step at a time.",
            "Who controls the external identity?",
            "READY"
        );
        $("victimAccountStatus").style.color = "";
        $("oauthResultStatus").style.color = "";

        clearLogs();
        renderStatus();

        log("OAuth Account Linking simulator initialized.");
        log("The attacker controls an external Google identity.");
        log("Select a mode and simulate the linking attempt.");
    }

    function setMode(mode) {
        state.mode = mode;
        resetSimulation();

        log(
            mode === "vulnerable"
                ? "Vulnerable implementation selected."
                : "Fixed implementation selected."
        );
    }

    function renderAttackStep(title, description, detail, progress) {
        $("oauthAttackTitle").textContent = title;
        $("oauthAttackDescription").textContent = description;
        $("oauthAttackDetail").querySelector("code").textContent = detail;
        $("oauthAttackProgress").textContent = progress;
    }

    function simulateLinking() {
        if (state.simulationFinished) {
            log("Simulation finished. Reset it to try again.", "warning");
            return;
        }

        const vulnerableSteps = [
            {
                title: "1. The attacker starts OAuth linking",
                description: "The attacker signs in to their own GHURIR account and starts linking their personal Google identity.",
                detail: "Google subject: attacker-google-123",
                log: "Attacker initiates Google account linking from their own account."
            },
            {
                title: "2. Google returns an authorization code",
                description: "Google authenticates the attacker and returns an authorization code associated with the attacker's Google identity.",
                detail: "code = attacker-auth-code",
                log: "Google returns an authorization code for the attacker's identity."
            },
            {
                title: "3. The victim has an active session",
                description: "The victim is signed in to GHURIR. The attacker causes the victim's browser to submit the attacker's linking callback while the victim's session is active.",
                detail: "Current application session: Victim",
                log: "Victim has an active GHURIR session."
            },
            {
                title: "4. The application fails to validate state",
                description: "The callback contains the attacker's authorization response, but the application does not verify that its state belongs to a linking transaction initiated by the victim's session.",
                detail: "Expected: victim-session-bound state | Received: attacker-state",
                log: "VULNERABILITY: OAuth state is not bound to the initiating user session."
            },
            {
                title: "5. The attacker's identity is linked to the victim",
                description: "The application redeems the code and associates the returned Google identity with the currently signed-in victim account instead of the account that initiated the linking transaction.",
                detail: "Victim account ← attacker-google-123",
                log: "VULNERABILITY: Attacker-controlled Google identity linked to victim account."
            },
            {
                title: "6. Potential account takeover",
                description: "The attacker may later sign in using their own Google identity and reach the victim's GHURIR account if the application trusts the linked identity.",
                detail: "Potential impact: unauthorized victim account access",
                log: "Potential account compromise through the incorrectly linked external identity."
            }
        ];

        const fixedSteps = [
            {
                title: "1. The attacker starts OAuth linking",
                description: "The attacker initiates a Google linking transaction from their own GHURIR account.",
                detail: "Initiating account: Attacker",
                log: "Attacker initiates an OAuth linking transaction."
            },
            {
                title: "2. The application creates a secure state",
                description: "The application generates a random, single-use state value and stores it with the initiating session and pending linking transaction.",
                detail: "state = random + single-use + session-bound",
                log: "Application stores a session-bound state value for the linking transaction."
            },
            {
                title: "3. The victim has a different active session",
                description: "The victim is signed in to GHURIR, but did not initiate the attacker's OAuth linking transaction.",
                detail: "Current session: Victim | Initiating session: Attacker",
                log: "Victim session does not own the pending OAuth transaction."
            },
            {
                title: "4. The attacker callback is submitted",
                description: "The attacker attempts to make the victim's browser submit the authorization response from the attacker's linking transaction.",
                detail: "Callback state does not match victim session",
                log: "Application receives an OAuth callback in the victim's session."
            },
            {
                title: "5. The application rejects the callback",
                description: "The application checks the returned state against the pending transaction stored for the current session. The validation fails, so the code is not accepted for linking.",
                detail: "REJECTED: state/session binding mismatch",
                log: "SECURE: OAuth state does not belong to the victim's session. Linking rejected."
            },
            {
                title: "6. The victim's account remains protected",
                description: "No external identity is linked to the victim's account. The attacker must complete a new linking transaction within their own authenticated session.",
                detail: "Victim account: PROTECTED | External identity: NOT LINKED",
                log: "No account association was created. The victim's account remains protected."
            }
        ];

        const steps = state.mode === "vulnerable"
            ? vulnerableSteps
            : fixedSteps;

        const current = steps[state.simulationStep];

        if (!current) {
            state.simulationFinished = true;
            return;
        }

        state.simulationStep++;
        log(current.log, state.mode === "fixed" && state.simulationStep === 5
            ? "success"
            : "info");

        renderAttackStep(
            current.title,
            current.description,
            current.detail,
            `STEP ${state.simulationStep} / ${steps.length}`
        );

        if (state.mode === "vulnerable" && state.simulationStep === 5) {
            state.linked = true;
            $("victimAccountStatus").textContent = "Attacker identity linked!";
            $("victimAccountStatus").style.color = "#ff647c";
            $("oauthResultStatus").textContent = "COMPROMISED";
            $("oauthResultStatus").style.color = "#ff647c";
            log("The victim's account is now linked to the attacker's external identity.", "error");
        }

        if (state.mode === "vulnerable" && state.simulationStep === 6) {
            state.simulationFinished = true;
        }

        if (state.mode === "fixed" && state.simulationStep === 5) {
            state.simulationFinished = true;
            log("No external identity was linked. The victim's account remains protected.", "success");
        }

        if (state.simulationFinished) {
            $("oauthAttackBtn").textContent = "Simulation Complete";
            $("oauthAttackProgress").textContent = "COMPLETE";
        } else {
            $("oauthAttackBtn").textContent = "Next Step";
        }

        renderStatus();

        if (state.linked) {
            $("victimAccountStatus").textContent = "Attacker identity linked!";
            $("victimAccountStatus").style.color = "#ff647c";
            $("oauthResultStatus").textContent = "COMPROMISED";
            $("oauthResultStatus").style.color = "#ff647c";
        }
    }

    function renderWalkthrough() {
        const vulnerableSteps = [
            {
                label: "STEP 1 - VICTIM ACCOUNT",
                title: "The Victim Has an Existing Account",
                description: "The victim has an active GHURIR account and is currently signed in. No external Google identity is linked to this account.",
                details: `EXISTING ACCOUNT
User: Victim
Session: Active
Provider: None linked

The victim owns this local application account.`
            },
            {
                label: "STEP 2 - ATTACKER IDENTITY",
                title: "The Attacker Owns a Google Identity",
                description: "The attacker controls their own Google identity and starts an account-linking transaction from their GHURIR account.",
                details: `ATTACKER IDENTITY
Provider: Google
Issuer: https://accounts.google.com
Subject: attacker-google-123

The external identity belongs to the attacker.`
            },
            {
                label: "STEP 3 - AUTHORIZATION RESPONSE",
                title: "Google Returns an Authorization Code",
                description: "After authenticating the attacker, Google returns an authorization code associated with the attacker's linking transaction.",
                details: `OAUTH RESPONSE
Authorization code: attacker-auth-code
OAuth state: attacker-state
Identity owner: Attacker

The response belongs to the attacker's transaction.`
            },
            {
                label: "STEP 4 - SESSION CONFUSION",
                title: "The Victim's Browser Submits the Callback",
                description: "The attacker causes the victim's browser to submit the attacker's OAuth callback while the victim is signed in. The application fails to verify that the returned state belongs to the victim's session.",
                details: `CURRENT APPLICATION SESSION
User: Victim

CALLBACK TRANSACTION
Initiated by: Attacker
Returned state: attacker-state

Missing check:
Does this state belong to the victim's session?`
            },
            {
                label: "STEP 5 - UNAUTHORIZED LINKING",
                title: "The Attacker's Identity Is Linked to the Victim",
                description: "The application accepts the callback and associates the attacker's Google identity with whichever local account is currently signed in: the victim's account.",
                details: `SIMULATED DATABASE UPDATE
Local account: Victim
Provider: Google
Provider subject: attacker-google-123

The attacker's external identity is now
linked to the victim's account.`
            },
            {
                label: "STEP 6 - SECURITY IMPACT",
                title: "Potential Account Takeover",
                description: "The attacker may later authenticate using their own Google identity and access the victim's account if the application trusts the incorrectly linked identity.",
                details: `SIMULATED IMPACT
External identity: Linked to Victim
Identity owner: Attacker
Victim account: Compromised

PREVENTION
1. Generate a random, single-use OAuth state.
2. Bind state to the initiating browser session.
3. Validate state before accepting the callback.
4. Verify the pending linking transaction.
5. Require account-owner authorization.`
            }
        ];

        const fixedSteps = [
            {
                label: "STEP 1 - VICTIM ACCOUNT",
                title: "The Victim Has an Existing Account",
                description: "The victim is signed in to GHURIR. The application keeps the victim's account separate from any external linking transaction that another user initiated.",
                details: `EXISTING ACCOUNT
User: Victim
Session: Active
External identity: Not linked

The victim's session is independent.`
            },
            {
                label: "STEP 2 - ATTACKER IDENTITY",
                title: "The Attacker Starts Google Linking",
                description: "The attacker initiates a Google account-linking transaction from their own GHURIR account.",
                details: `LINKING TRANSACTION
Initiating user: Attacker
Provider: Google
Subject: attacker-google-123

The transaction belongs to the attacker's session.`
            },
            {
                label: "STEP 3 - SESSION-BOUND STATE",
                title: "The Application Creates a Secure State",
                description: "The application generates a random, single-use state value and stores it with the initiating user's session and pending linking transaction.",
                details: `SECURE OAUTH STATE
Random: YES
Single-use: YES
Bound session: Attacker
Pending transaction: Stored

The state is associated with the session
that initiated the linking process.`
            },
            {
                label: "STEP 4 - CALLBACK VALIDATION",
                title: "The Victim's Session Cannot Reuse the Callback",
                description: "The attacker attempts to submit their callback through the victim's active browser session. The application checks the returned state against the transaction stored for the current session.",
                details: `CURRENT SESSION: Victim
CALLBACK TRANSACTION: Attacker

State/session match: FAILED

The victim does not own this pending
OAuth linking transaction.`
            },
            {
                label: "STEP 5 - LINKING REJECTED",
                title: "The Application Rejects the Callback",
                description: "Because the state does not match the pending transaction for the victim's session, the application rejects the callback and does not associate the external identity.",
                details: `VALIDATION RESULT
State: INVALID FOR THIS SESSION
Authorization code: NOT ACCEPTED FOR LINKING
Account update: BLOCKED

No external identity is linked.`
            },
            {
                label: "STEP 6 - SECURE OUTCOME",
                title: "The Victim's Account Remains Protected",
                description: "The victim's account remains unchanged. The attacker can only complete the linking process within the attacker's own authenticated session and valid OAuth transaction.",
                details: `SECURE RESULT
Victim account: PROTECTED
Attacker identity: NOT LINKED TO VICTIM
Unauthorized callback: REJECTED

PREVENTION
1. Generate a random, single-use OAuth state.
2. Bind state to the initiating browser session.
3. Validate state before accepting the callback.
4. Verify the pending linking transaction.
5. Require account-owner authorization.`
            }
        ];

        const steps = state.walkMode === "fixed"
            ? fixedSteps
            : vulnerableSteps;

        const step = Math.min(state.step, steps.length - 1);
        const current = steps[step];
        const fixed = state.walkMode === "fixed";

        $("oauthWalkProgress").textContent =
            `STEP ${step + 1} / ${steps.length}`;

        $("oauthWalkLabel").textContent = current.label;
        $("oauthWalkTitle").textContent = current.title;
        $("oauthWalkDescription").textContent = current.description;
        $("oauthWalkDetails").textContent = current.details;

        $("oauthWalkPrevious").disabled = step === 0;
        $("oauthWalkNext").textContent =
            step === steps.length - 1 ? "Restart Simulation" : "Next Step";

        $("oauthWalkVulnerableBtn").classList.toggle("active", !fixed);
        $("oauthWalkFixedBtn").classList.toggle("active", fixed);

        const nodes = [
            "oauthAttackerNode",
            "oauthAppNode",
            "oauthProviderNode",
            "oauthVictimNode"
        ];

        nodes.forEach(id => {
            $(id).classList.remove("active", "compromised", "protected");
        });

        const vulnerableNodes = {
            0: [3],
            1: [0],
            2: [2],
            3: [1],
            4: [1, 3],
            5: [0, 3]
        };

        const fixedNodes = {
            0: [3],
            1: [0, 1],
            2: [2],
            3: [1],
            4: [1, 3],
            5: [1, 3]
        };

        const activeNodes = fixed ? fixedNodes : vulnerableNodes;

        activeNodes[step].forEach(index => {
            $(nodes[index]).classList.add("active");
        });

        if (!fixed && step >= 4) {
            $("oauthVictimNode").classList.add("compromised");
        }

        if (fixed && step >= 4) {
            $("oauthVictimNode").classList.add("protected");
        }

        ["oauthLine1", "oauthLine2", "oauthLine3"].forEach(
            (id, index) => {
                $(id).classList.toggle("active", index < step);
            }
        );
    }

    function setWalkMode(mode) {
        state.walkMode = mode;
        state.step = 0;
        renderWalkthrough();
    }

    function nextWalkStep() {
        if (state.step === 5) {
            state.step = 0;
        } else {
            state.step++;
        }

        renderWalkthrough();
    }

    function previousWalkStep() {
        if (state.step > 0) {
            state.step--;
            renderWalkthrough();
        }
    }

    function resetWalkthrough() {
        state.step = 0;
        renderWalkthrough();
    }

    function setupQuiz() {
        const questions = [
            {
                question: "What is the main purpose of the OAuth state parameter?",
                options: [
                    "To identify the user's email address.",
                    "To protect the OAuth flow against forged or unrelated callbacks.",
                    "To store the user's Google password."
                ],
                answer: 1,
                explanation: "Correct! The state parameter helps the application verify that the callback belongs to an OAuth transaction initiated by the user."
            },
            {
                question: "Why must OAuth state be bound to the initiating session?",
                options: [
                    "To ensure the callback belongs to the same session that started the linking process.",
                    "To allow any user to complete the linking process.",
                    "To avoid validating the authorization response."
                ],
                answer: 0,
                explanation: "Correct! Session binding prevents an attacker from using their own OAuth callback to link an identity to another user's account."
            },
            {
                question: "What should the application do when the callback state does not match the current session?",
                options: [
                    "Accept the callback anyway.",
                    "Link the identity to the currently logged-in user.",
                    "Reject the linking attempt."
                ],
                answer: 2,
                explanation: "Correct! A state or session mismatch means the callback does not belong to the current linking transaction, so the application must reject it."
            }
        ];

        const container = $("oauthQuiz");

        container.innerHTML = `
            <div class="quiz-header">
                <span id="quizProgress">QUESTION 1 / 3</span>
                <span id="quizScore">SCORE: 0</span>
            </div>

            <div class="quiz-progress-track">
                <div id="quizProgressBar"></div>
            </div>

            <div id="quizQuestionArea">
                <h3 id="quizQuestion"></h3>
                <div id="quizOptions"></div>
                <div id="quizFeedback" aria-live="polite"></div>
            </div>

            <div class="quiz-controls">
                <button type="button" id="quizNextBtn" disabled>
                    Next Question
                </button>
                <button type="button" id="quizRestartBtn" hidden>
                    Try Again
                </button>
            </div>

            <div id="quizResult" hidden aria-live="polite"></div>
        `;

        const progress = $("quizProgress");
        const scoreDisplay = $("quizScore");
        const progressBar = $("quizProgressBar");
        const questionTitle = $("quizQuestion");
        const optionsContainer = $("quizOptions");
        const feedback = $("quizFeedback");
        const nextButton = $("quizNextBtn");
        const restartButton = $("quizRestartBtn");
        const area = $("quizQuestionArea");
        const result = $("quizResult");

        let currentQuestion = 0;
        let score = 0;
        let answered = false;

        function renderQuestion() {
            const item = questions[currentQuestion];
            answered = false;

            progress.textContent =
                `QUESTION ${currentQuestion + 1} / ${questions.length}`;
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
                button.textContent =
                    `${String.fromCharCode(65 + index)}. ${option}`;

                button.addEventListener("click", () =>
                    selectAnswer(index)
                );

                optionsContainer.appendChild(button);
            });

            nextButton.disabled = true;
            nextButton.hidden = false;
            nextButton.textContent =
                currentQuestion === questions.length - 1
                    ? "View Results"
                    : "Next Question";

            restartButton.hidden = true;
            result.hidden = true;
            area.hidden = false;
        }

        function selectAnswer(selectedIndex) {
            if (answered) return;
            answered = true;

            const item = questions[currentQuestion];
            const buttons = [
                ...optionsContainer.querySelectorAll(".quiz-option")
            ];

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
                : `Not quite. The correct answer is ${
                    String.fromCharCode(65 + item.answer)
                }. ${item.explanation}`;

            feedback.classList.add("visible");
            scoreDisplay.textContent = `SCORE: ${score}`;
            progressBar.style.width =
                `${((currentQuestion + 1) / questions.length) * 100}%`;
            nextButton.disabled = false;
        }

        function showResults() {
            area.hidden = true;
            result.hidden = false;
            restartButton.hidden = false;
            nextButton.hidden = true;

            const percentage = Math.round(
                (score / questions.length) * 100
            );

            let message;

            if (score === questions.length) {
                message = "Excellent! You understand the key concepts of OAuth Account Linking.";
            } else if (score >= 2) {
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
            renderQuestion();
        });

        renderQuestion();
    }

    function setupCodeComparison() {
        document.querySelectorAll(
            "#oauthCodeComparison .code-line.critical-line, " +
            "#oauthCodeComparison .code-line.fix-line"
        ).forEach(line => {
            line.setAttribute("tabindex", "0");
            line.setAttribute("role", "button");
            line.setAttribute("aria-label", "Explain this code line");

            function explainLine() {
                document.querySelectorAll(
                    "#oauthCodeComparison .code-line.selected"
                ).forEach(item => item.classList.remove("selected"));

                line.classList.add("selected");

                const isVulnerable = line.classList.contains("critical-line");

                $("codeExplanationTitle").textContent = isVulnerable
                    ? "Why is this line vulnerable?"
                    : "How does this line fix the issue?";

                $("codeExplanationText").textContent =
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
    }

    function initialize() {
        $("oauthVulnerableBtn").addEventListener(
            "click", () => setMode("vulnerable")
        );

        $("oauthFixedBtn").addEventListener(
            "click", () => setMode("fixed")
        );

        $("oauthAttackBtn").addEventListener(
            "click", simulateLinking
        );

        $("oauthResetBtn").addEventListener(
            "click", resetSimulation
        );

        $("oauthWalkVulnerableBtn").addEventListener(
            "click", () => setWalkMode("vulnerable")
        );

        $("oauthWalkFixedBtn").addEventListener(
            "click", () => setWalkMode("fixed")
        );

        $("oauthWalkNext").addEventListener(
            "click", nextWalkStep
        );

        $("oauthWalkPrevious").addEventListener(
            "click", previousWalkStep
        );

        $("oauthWalkReset").addEventListener(
            "click", resetWalkthrough
        );

        renderStatus();
        resetSimulation();
        renderWalkthrough();
        setupCodeComparison();
        setupQuiz();
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
