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
        email: "victim@example.com",
        emailVerified: false,
        issuer: "https://identity.example",
        subject: "external-user-123",
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
            identity.emailVerified ? "Email verified" : "Unverified identity";

        $("claimEmail").textContent = identity.email;
        $("claimVerified").textContent =
            String(identity.emailVerified);

        $("externalEmail").textContent = identity.email;

        $("oauthResultStatus").textContent =
            state.linked ? "LINKED" : "WAITING";
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
        log("The external identity contains an unverified email.");
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
                title: "1. The attacker starts account linking",
                description: "The attacker begins linking an external identity. The identity belongs to the attacker, but it presents the victim's email address.",
                detail: "External subject: external-user-123",
                log: "Attacker starts an external account-linking request."
            },
            {
                title: "2. The identity provider returns claims",
                description: "The provider returns a signed identity response. Notice that the signature is valid, but the email_verified claim is false.",
                detail: "email = victim@example.com | email_verified = false",
                log: "Provider returned a validly signed identity with an unverified email."
            },
            {
                title: "3. The application searches by email",
                description: "The vulnerable application uses the email claim to find a local account. It finds the victim's existing account.",
                detail: "findUserByEmail(identity.email)",
                log: "Application finds the victim account using the email address."
            },
            {
                title: "4. The application skips ownership checks",
                description: "This is the security mistake: the application does not require proof that the person linking the identity controls the existing account.",
                detail: "Missing: verified email + existing-account authentication + owner approval",
                log: "Application skips email ownership and account-owner authorization checks."
            },
            {
                title: "5. The attacker's identity is linked",
                description: "The application associates the attacker's external subject with the victim's local account. The victim did not approve this action.",
                detail: "Victim account  ←  external-user-123",
                log: "VULNERABILITY: Attacker-controlled identity linked to victim account."
            },
            {
                title: "6. Potential security impact",
                description: "If future sign-ins trust this linked external identity, the attacker may be able to access the victim's account. The exact impact depends on the application's login design.",
                detail: "Potential impact: unauthorized account access",
                log: "Potential account compromise if future login trusts the linked identity."
            }
        ];

        const fixedSteps = [
            {
                title: "1. The attacker starts account linking",
                description: "An external identity tries to link to the victim's existing local account.",
                detail: "External subject: external-user-123",
                log: "Account-linking request received."
            },
            {
                title: "2. The provider returns identity claims",
                description: "The token signature is valid, but the email address is explicitly marked as unverified.",
                detail: "signature = VALID | email_verified = false",
                log: "Identity response received. Signature is valid; email is unverified."
            },
            {
                title: "3. The application validates the identity",
                description: "The fixed implementation checks the identity response. A valid signature proves the response's integrity, not ownership of the email address.",
                detail: "Signature and trusted issuer checks passed.",
                log: "Signature and issuer checks passed."
            },
            {
                title: "4. The application rejects the linking attempt",
                description: "The application refuses to use an unverified email to link an external identity to an existing account.",
                detail: "REJECTED: email_verified = false",
                log: "SECURE: Email ownership is not verified. Account linking rejected."
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
        log(current.log, state.mode === "fixed" && state.simulationStep === 4
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

        if (state.mode === "fixed" && state.simulationStep === 4) {
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
                description: "A legitimate user already has an active GHURIR account. No external identity is linked yet.",
                details: `EXISTING ACCOUNT
User: Victim
Email: victim@example.com
Status: Active
External identity: Not linked

The victim owns this local application account.`
            },
            {
                label: "STEP 2 - ATTACKER IDENTITY",
                title: "The Attacker Starts External Linking",
                description: "The attacker controls an external identity but presents the victim's email as an unverified claim.",
                details: `ATTACKER EXTERNAL IDENTITY
Subject: external-user-123
Email: victim@example.com
Email verified: false

The external subject belongs to the attacker.
The email claim does not prove ownership.`
            },
            {
                label: "STEP 3 - IDENTITY PROVIDER",
                title: "The Provider Returns Identity Claims",
                description: "The provider returns a valid signed identity response. However, the email ownership is not verified.",
                details: `IDENTITY RESPONSE
Issuer: https://identity.example
Subject: external-user-123
Email: victim@example.com
Email verified: false
Signature: VALID

A valid signature proves the response's integrity.
It does not prove ownership of the email.`
            },
            {
                label: "STEP 4 - ACCOUNT LOOKUP",
                title: "The Application Finds the Victim",
                description: "The vulnerable application searches for a local account using only the supplied email address.",
                details: `VULNERABLE APPLICATION
existingUser = findUserByEmail(identity.email)

Search result:
victim@example.com -> Victim account found

The application does not check:
- Whether the email is verified
- Whether the victim authenticated
- Whether the victim approved linking`
            },
            {
                label: "STEP 5 - UNSAFE LINKING",
                title: "The Wrong Identity Gets Linked",
                description: "The application associates the attacker's external subject with the victim's local account without the victim's permission.",
                details: `SIMULATED DATABASE UPDATE
Local user: Victim
Local email: victim@example.com
Provider: identity.example
Provider subject: external-user-123

The attacker's external identity is now
linked to the victim's account.`
            },
            {
                label: "STEP 6 - SECURITY IMPACT",
                title: "Potential Unauthorized Account Access",
                description: "If future sign-ins trust this linked identity, the attacker may gain access to the victim's account. The exact impact depends on the application's login design.",
                details: `SIMULATED IMPACT
External identity: Linked incorrectly
Victim account: Affected
Potential result: Account compromise

PREVENTION
1. Validate token signature, issuer, audience and expiry.
2. Identify external users by issuer + subject.
3. Verify email ownership when relying on email.
4. Require authentication to the existing account.
5. Require explicit owner approval.`
            }
        ];

        const fixedSteps = [
            {
                label: "STEP 1 - EXISTING ACCOUNT",
                title: "The Victim's Account Is Protected",
                description: "The victim already has an active local account. The application must not link another identity without authorization.",
                details: `EXISTING ACCOUNT
User: Victim
Email: victim@example.com
Status: Active
External identity: Not linked

The account owner must authorize any new link.`
            },
            {
                label: "STEP 2 - LINKING REQUEST",
                title: "An External Identity Requests Linking",
                description: "An attacker-controlled external identity attempts to link itself to the victim's account using the victim's email address.",
                details: `LINKING REQUEST
External subject: external-user-123
Claimed email: victim@example.com

The application treats this as an untrusted
linking request until validation is complete.`
            },
            {
                label: "STEP 3 - IDENTITY RESPONSE",
                title: "The Provider Returns Signed Claims",
                description: "The identity provider returns a valid signed response, but the email_verified claim is false.",
                details: `IDENTITY RESPONSE
Issuer: https://identity.example
Subject: external-user-123
Email: victim@example.com
Email verified: false
Signature: VALID

A valid signature does not prove email ownership.`
            },
            {
                label: "STEP 4 - IDENTITY VALIDATION",
                title: "The Application Validates the Identity",
                description: "The fixed implementation validates the token signature and trusted issuer, and checks the external identity using issuer and subject.",
                details: `SECURITY VALIDATION
Signature: VALID
Issuer: TRUSTED
Subject: PRESENT

These checks establish that the identity
response is authentic and identify its issuer
and subject. They do not verify email ownership.`
            },
            {
                label: "STEP 5 - OWNERSHIP CHECK",
                title: "The Application Rejects the Unverified Email",
                description: "The application refuses to use an unverified email to associate an external identity with an existing local account.",
                details: `ACCOUNT-LINKING CHECK
email_verified = false

RESULT: REJECTED

The application must also require:
- Authentication to the existing account
- Explicit approval from the account owner`
            },
            {
                label: "STEP 6 - SECURE OUTCOME",
                title: "The Victim's Account Remains Protected",
                description: "No external identity is linked. The attacker cannot use this unverified email claim to associate their identity with the victim's account.",
                details: `SECURE RESULT
External identity: NOT LINKED
Victim account: PROTECTED
Linking request: REJECTED

SECURE LINKING REQUIREMENTS
1. Validate signature, issuer, audience and expiry.
2. Identify external identities by issuer + subject.
3. Verify email ownership when relying on email.
4. Require authentication to the existing account.
5. Require explicit owner approval.`
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
                question: "What is the main weakness in the vulnerable implementation?",
                options: [
                    "It uses HTTPS.",
                    "It links accounts using an email without proving ownership.",
                    "It stores the user's display name."
                ],
                answer: 1,
                explanation: "Correct! An email address alone is not sufficient proof that an external identity belongs to an existing account."
            },
            {
                question: "What should be required before linking an external identity?",
                options: [
                    "Authentication to the existing account and explicit approval.",
                    "Only a matching email address.",
                    "A new browser tab."
                ],
                answer: 0,
                explanation: "Correct! The existing account owner should authenticate and approve the linking operation."
            },
            {
                question: "Which values are important for identifying an OIDC identity?",
                options: [
                    "Email and display name only.",
                    "Browser version and IP address.",
                    "Trusted issuer and subject."
                ],
                answer: 2,
                explanation: "Correct! The issuer and subject together identify the identity within its trusted provider."
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
            progressBar.style.width = "0%";

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
