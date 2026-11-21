document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. FILE UPLOAD SIMULATOR
    // ==========================================

    const payloads = {
        profile: {
            name: "profile.jpg",
            extension: "jpg",
            mime: "image/jpeg",
            signatureValid: true,
            sizeKB: 240,
            description: "A normal JPEG image with a valid file signature.",
            malicious: false
        },
        script: {
            name: "shell.php",
            extension: "php",
            mime: "application/x-php",
            signatureValid: true,
            sizeKB: 12,
            description: "A PHP executable file disguised as an ordinary upload.",
            malicious: true
        },
        double: {
            name: "test.php.jpg",
            extension: "jpg",
            mime: "image/jpeg",
            signatureValid: false,
            sizeKB: 90,
            description: "A PHP file disguised with a final .jpg extension. The weak validator checks only the last extension.",
            malicious: true
        }
    };

    let uploadMode = "vulnerable";
    let selectedPayload = null;

    const uploadVulnerableBtn = document.getElementById("uploadVulnerableBtn");
    const uploadFixedBtn = document.getElementById("uploadFixedBtn");
    const uploadModeStatus = document.getElementById("uploadModeStatus");
    const uploadFileName = document.getElementById("uploadFileName");
    const uploadFileInfo = document.getElementById("uploadFileInfo");
    const uploadRunBtn = document.getElementById("uploadRunBtn");
    const uploadResetBtn = document.getElementById("uploadResetBtn");

    const uploadResult = document.getElementById("uploadResult");
    const uploadResultStatus = document.getElementById("uploadResultStatus");
    const uploadResultTitle = document.getElementById("uploadResultTitle");
    const uploadResultMessage = document.getElementById("uploadResultMessage");

    const uploadLogStatus = document.getElementById("uploadLogStatus");
    const uploadLog = document.getElementById("uploadLog");

    const payloadButtons = document.querySelectorAll(".upload-payload-btn");

    function addUploadLog(message, type = "info") {
        if (!uploadLog) return;

        const entry = document.createElement("p");
        entry.className = `upload-log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        uploadLog.appendChild(entry);
        uploadLog.scrollTop = uploadLog.scrollHeight;
    }

    function setUploadMode(mode) {
        uploadMode = mode;

        uploadVulnerableBtn?.classList.toggle("active", mode === "vulnerable");
        uploadFixedBtn?.classList.toggle("active", mode === "fixed");
        uploadModeStatus?.classList.toggle("fixed", mode === "fixed");

        if (uploadModeStatus) {
            uploadModeStatus.textContent =
                mode === "vulnerable"
                    ? "Vulnerable Mode: Weak validation is enabled."
                    : "Fixed Mode: Secure validation is enabled.";
        }

        if (uploadLogStatus) {
            uploadLogStatus.textContent =
                mode === "vulnerable" ? "VULNERABLE" : "PROTECTED";
        }

        clearUploadResult();

        addUploadLog(
            `Application switched to ${mode.toUpperCase()} mode.`,
            "info"
        );
    }

    function clearUploadResult() {
        if (uploadResult) {
            uploadResult.classList.remove("success", "blocked");
        }

        if (uploadResultStatus) uploadResultStatus.textContent = "WAITING";
        if (uploadResultTitle) uploadResultTitle.textContent = "No upload tested yet";
        if (uploadResultMessage) {
            uploadResultMessage.textContent =
                "Select a simulated file and run the upload test.";
        }
    }

    function selectPayload(payloadKey) {
        const payload = payloads[payloadKey];
        if (!payload) return;

        selectedPayload = payload;

        if (uploadRunBtn) {
            uploadRunBtn.disabled = false;
        }

        payloadButtons.forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.payload === payloadKey
            );
        });

        if (uploadFileName) {
            uploadFileName.textContent = payload.name;
        }

        if (uploadFileInfo) {
            uploadFileInfo.textContent =
                `Type: ${payload.mime} | Size: ${payload.sizeKB} KB`;
        }

        clearUploadResult();

        addUploadLog(`Selected file: ${payload.name}`, "info");
    }

    function validateUpload(payload) {
        // Vulnerable validation:
        // Checks only the LAST filename extension.
        // It does not inspect the real file content or inner extensions.
        if (uploadMode === "vulnerable") {
            const parts = payload.name.toLowerCase().split(".");
            const extension = parts[parts.length - 1];
            const allowedExtensions = ["jpg", "jpeg", "png"];

            const accepted = allowedExtensions.includes(extension);

            return {
                accepted,
                reason: accepted
                    ? "The application checked only the last extension and accepted it as an image. It did not inspect the actual file content or suspicious inner extensions."
                    : "Rejected: the file extension is not on the allowed image list."
            };
        }

        // Simulated fixed validation:
        // Check extension, MIME type, signature, and suspicious filename patterns.
        const allowedExtensions = ["jpg", "jpeg", "png"];
        const allowedMimeTypes = ["image/jpeg", "image/png"];

        const parts = payload.name.toLowerCase().split(".");
        const extension = parts[parts.length - 1];

        const hasAllowedExtension = allowedExtensions.includes(extension);
        const hasAllowedMime = allowedMimeTypes.includes(payload.mime);
        const signatureMatches = payload.signatureValid;

        const hasSuspiciousInnerExtension =
            parts.length > 2 &&
            parts.slice(1, -1).some(part =>
                ["php", "phtml", "phar", "exe", "sh", "js"].includes(part)
            );

        if (!hasAllowedExtension) {
            return {
                accepted: false,
                reason: "Rejected: the file extension is not on the allowed list."
            };
        }

        if (!hasAllowedMime) {
            return {
                accepted: false,
                reason: "Rejected: the declared MIME type is not allowed."
            };
        }

        if (!signatureMatches) {
            return {
                accepted: false,
                reason: "Rejected: the file content signature does not match the expected image format."
            };
        }

        if (hasSuspiciousInnerExtension) {
            return {
                accepted: false,
                reason: "Rejected: the filename contains a suspicious inner extension."
            };
        }

        return {
            accepted: true,
            reason: "The file passed the simulated extension, MIME type, and signature checks."
        };
    }

    function runUploadTest() {
        if (!selectedPayload) {
            addUploadLog("Please select a file before testing.", "warning");

            if (uploadResultTitle) {
                uploadResultTitle.textContent = "No file selected";
            }

            if (uploadResultMessage) {
                uploadResultMessage.textContent =
                    "Choose one of the simulated files first.";
            }

            return;
        }

        const result = validateUpload(selectedPayload);

        if (uploadResult) {
            uploadResult.classList.remove("success", "blocked");
        }

        if (result.accepted) {
            if (uploadResult) {
                if (uploadMode === "vulnerable" && selectedPayload.malicious) {
                    uploadResult.classList.add("success");
                }
            }

            if (uploadResultStatus) {
                uploadResultStatus.textContent = "ACCEPTED";
            }

            if (uploadResultTitle) {
                uploadResultTitle.textContent = "Upload Accepted";
            }

            if (uploadResultMessage) {
                uploadResultMessage.textContent =
                    uploadMode === "vulnerable" && selectedPayload.malicious
                        ? `Security issue: ${result.reason} The simulated application accepted a potentially dangerous file.`
                        : result.reason;
            }

            addUploadLog(
                `${selectedPayload.name} was accepted. ${result.reason}`,
                selectedPayload.malicious ? "danger" : "success"
            );
        } else {
            if (uploadResult) {
                uploadResult.classList.add("blocked");
            }

            if (uploadResultStatus) {
                uploadResultStatus.textContent = "BLOCKED";
            }

            if (uploadResultTitle) {
                uploadResultTitle.textContent = "Upload Rejected";
            }

            if (uploadResultMessage) {
                uploadResultMessage.textContent = result.reason;
            }

            addUploadLog(
                `${selectedPayload.name} was rejected. ${result.reason}`,
                "success"
            );
        }
    }

    function resetUploadSimulator() {
        selectedPayload = null;

        if (uploadRunBtn) {
            uploadRunBtn.disabled = true;
        }

        payloadButtons.forEach(button => {
            button.classList.remove("selected");
        });

        if (uploadFileName) uploadFileName.textContent = "No file selected";
        if (uploadFileInfo) {
            uploadFileInfo.textContent = "Choose a simulated file to begin.";
        }

        if (uploadLog) uploadLog.innerHTML = "";

        clearUploadResult();

        if (uploadLogStatus) {
            uploadLogStatus.textContent =
                uploadMode === "vulnerable" ? "VULNERABLE" : "PROTECTED";
        }

        addUploadLog("Simulator has been reset.", "info");
    }

    uploadVulnerableBtn?.addEventListener("click", () => {
        setUploadMode("vulnerable");
    });

    uploadFixedBtn?.addEventListener("click", () => {
        setUploadMode("fixed");
    });

    payloadButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectPayload(button.dataset.payload);
        });
    });

    uploadRunBtn?.addEventListener("click", runUploadTest);
    uploadResetBtn?.addEventListener("click", resetUploadSimulator);


    // ==========================================
    // 2. ATTACK WALKTHROUGH
    // ==========================================

    const walkthroughSteps = [
        {
            title: "Step 1: Attacker Prepares a Disguised File",
            description:
                "The attacker prepares a file named test.php.jpg whose content is PHP rather than a genuine image.",
            details:
                "The application is intended to accept images only. A direct filename such as shell.php should be rejected, so the attacker uses a double extension to try to bypass weak validation."
        },
        {
            title: "Step 2: File Is Submitted",
            description:
                "The attacker submits test.php.jpg through the application's image upload feature.",
            details:
                "The application receives the filename and file content. Client-provided filenames and MIME types must not be trusted as proof that a file is a genuine image."
        },
        {
            title: "Step 3: Weak Extension Validation",
            description:
                "The vulnerable application checks only the final extension of the filename.",
            details:
                "The final extension is jpg, so the weak check treats test.php.jpg as an allowed image. It ignores the inner php extension and does not inspect the actual file signature."
        },
        {
            title: "Step 4: Unsafe File Storage",
            description:
                "The vulnerable application accepts the file and stores it using the original filename.",
            details:
                "If uploaded files are stored in a publicly accessible location without safe handling or execution restrictions, the risk can increase. A double extension does not automatically make the server execute PHP."
        },
        {
            title: "Step 5: Potential Security Impact",
            description:
                "An unsafe upload can expose the application to security risks.",
            details:
                "Depending on server configuration and file handling, consequences may include stored malicious content, unauthorized file access, or code execution. Uploading a file alone does not guarantee execution."
        }
    ];

    let currentWalkStep = 0;

    const uploadWalkProgress = document.getElementById("uploadWalkProgress");
    const uploadWalkTitle = document.getElementById("uploadWalkTitle");
    const uploadWalkDescription = document.getElementById("uploadWalkDescription");
    const uploadWalkDetails = document.getElementById("uploadWalkDetails");

    const uploadWalkPrevious = document.getElementById("uploadWalkPrevious");
    const uploadWalkNext = document.getElementById("uploadWalkNext");
    const uploadWalkReset = document.getElementById("uploadWalkReset");

    const walkNodes = [
        document.getElementById("uploadNodeAttacker"),
        document.getElementById("uploadNodeSubmission"),
        document.getElementById("uploadNodeValidation"),
        document.getElementById("uploadNodeStorage"),
        document.getElementById("uploadNodeImpact")
    ];

    function renderWalkthrough() {
        const step = walkthroughSteps[currentWalkStep];

        if (uploadWalkProgress) {
            uploadWalkProgress.textContent =
                `STEP ${currentWalkStep + 1} / ${walkthroughSteps.length}`;
        }

        if (uploadWalkTitle) uploadWalkTitle.textContent = step.title;
        if (uploadWalkDescription) {
            uploadWalkDescription.textContent = step.description;
        }
        if (uploadWalkDetails) {
            uploadWalkDetails.textContent = step.details;
        }

        if (uploadWalkPrevious) {
            uploadWalkPrevious.disabled = currentWalkStep === 0;
        }

        if (uploadWalkNext) {
            uploadWalkNext.disabled =
                currentWalkStep === walkthroughSteps.length - 1;
        }

        walkNodes.forEach((node, index) => {
            if (!node) return;

            node.classList.toggle("active", currentWalkStep === index);
            node.classList.toggle("completed", currentWalkStep > index);
        });
    }

    uploadWalkPrevious?.addEventListener("click", () => {
        if (currentWalkStep > 0) {
            currentWalkStep--;
            renderWalkthrough();
        }
    });

    uploadWalkNext?.addEventListener("click", () => {
        if (currentWalkStep < walkthroughSteps.length - 1) {
            currentWalkStep++;
            renderWalkthrough();
        }
    });

    uploadWalkReset?.addEventListener("click", () => {
        currentWalkStep = 0;
        renderWalkthrough();
    });


    // ==========================================
    // 3. CODE COMPARISON EXPLANATIONS
    // ==========================================

    const uploadCodeExplanationTitle =
        document.getElementById("uploadCodeExplanationTitle");

    const uploadCodeExplanationText =
        document.getElementById("uploadCodeExplanationText");

    const codeLines = document.querySelectorAll(
        ".comparison-code .code-line[data-explanation], .code-comparison-grid .code-line[data-explanation]"
    );

    codeLines.forEach(line => {
        line.addEventListener("click", () => {
            const explanation = line.dataset.explanation;
            if (!explanation) return;

            codeLines.forEach(item => {
                item.classList.remove("selected");
            });

            line.classList.add("selected");

            const isFix = line.classList.contains("fix-line");

            if (uploadCodeExplanationTitle) {
                uploadCodeExplanationTitle.textContent =
                    isFix ? "Security Fix" : "Vulnerable Code";
            }

            if (uploadCodeExplanationText) {
                uploadCodeExplanationText.textContent = explanation;
            }
        });
    });


    // ==========================================
    // 4. KNOWLEDGE CHECK
    // ==========================================

    const quizQuestions = [
        {
            question:
                "Why is checking only the file extension insufficient?",
            options: [
                "Because filenames can be misleading and do not prove the actual file content.",
                "Because every image file is dangerous.",
                "Because browsers cannot upload files."
            ],
            correct: 0,
            explanation:
                "Correct. An extension can be misleading. Applications should validate the file type and content using multiple server-side checks."
        },
        {
            question:
                "Which of the following is a safer file upload practice?",
            options: [
                "Trust the MIME type sent by the browser.",
                "Store every uploaded file in a public executable directory.",
                "Validate the extension, MIME type, and file signature, then use a generated filename."
            ],
            correct: 2,
            explanation:
                "Correct. Multiple validation layers and generated filenames reduce the risk of dangerous uploads."
        },
        {
            question:
                "Does a file named avatar.php.jpg automatically execute as PHP?",
            options: [
                "Yes, every server executes PHP inside any filename.",
                "No. Execution depends on server configuration and how the file is handled.",
                "Yes, because the filename contains the word PHP."
            ],
            correct: 1,
            explanation:
                "Correct. A double extension does not automatically cause execution. The server's handler configuration and storage behavior matter."
        }
    ];

    let quizIndex = 0;
    let quizScore = 0;
    let quizAnswered = false;

    const uploadQuizProgress = document.getElementById("uploadQuizProgress");
    const uploadQuizScore = document.getElementById("uploadQuizScore");
    const uploadQuizProgressBar = document.getElementById("uploadQuizProgressBar");

    const uploadQuizQuestionArea =
        document.getElementById("uploadQuizQuestionArea");

    const uploadQuizQuestion = document.getElementById("uploadQuizQuestion");
    const uploadQuizOptions = document.getElementById("uploadQuizOptions");
    const uploadQuizFeedback = document.getElementById("uploadQuizFeedback");

    const uploadQuizNextBtn = document.getElementById("uploadQuizNextBtn");
    const uploadQuizRestartBtn = document.getElementById("uploadQuizRestartBtn");
    const uploadQuizResult = document.getElementById("uploadQuizResult");

    function renderQuiz() {
        const question = quizQuestions[quizIndex];

        quizAnswered = false;

        if (uploadQuizProgress) {
            uploadQuizProgress.textContent =
                `QUESTION ${quizIndex + 1} / ${quizQuestions.length}`;
        }

        if (uploadQuizScore) {
            uploadQuizScore.textContent = `Score: ${quizScore}`;
        }

        if (uploadQuizProgressBar) {
            uploadQuizProgressBar.style.width =
                `${(quizIndex / quizQuestions.length) * 100}%`;
        }

        if (uploadQuizQuestion) {
            uploadQuizQuestion.textContent = question.question;
        }

        if (uploadQuizOptions) {
            uploadQuizOptions.innerHTML = "";

            question.options.forEach((option, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "quiz-option";
                button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;

                button.addEventListener("click", () => {
                    answerQuiz(index);
                });

                uploadQuizOptions.appendChild(button);
            });
        }

        if (uploadQuizFeedback) {
            uploadQuizFeedback.textContent = "";
            uploadQuizFeedback.className = "";
            uploadQuizFeedback.removeAttribute("style");
        }

        if (uploadQuizNextBtn) {
            uploadQuizNextBtn.disabled = true;
            uploadQuizNextBtn.textContent =
                quizIndex === quizQuestions.length - 1
                    ? "View Results"
                    : "Next Question";
        }

        if (uploadQuizResult) {
            uploadQuizResult.hidden = true;
        }
    }

    function answerQuiz(selectedAnswer) {
        if (quizAnswered) return;

        quizAnswered = true;

        const question = quizQuestions[quizIndex];
        const isCorrect = selectedAnswer === question.correct;

        if (isCorrect) quizScore++;

        const optionButtons = uploadQuizOptions?.querySelectorAll("button");

        optionButtons?.forEach((button, index) => {
            button.disabled = true;

            if (index === question.correct) {
                button.classList.add("correct");
            } else if (index === selectedAnswer) {
                button.classList.add("incorrect");
            }
        });

        if (uploadQuizFeedback) {
            uploadQuizFeedback.textContent =
                `${isCorrect ? "Correct!" : "Not quite."} ${question.explanation}`;

            uploadQuizFeedback.className = "visible";
            uploadQuizFeedback.style.border =
                isCorrect
                    ? "1px solid #00ff9c"
                    : "1px solid #ff647c";
            uploadQuizFeedback.style.color =
                isCorrect ? "#67ffc1" : "#ff8a9b";
        }

        if (uploadQuizScore) {
            uploadQuizScore.textContent = `Score: ${quizScore}`;
        }

        if (uploadQuizProgressBar) {
            uploadQuizProgressBar.style.width =
                `${((quizIndex + 1) / quizQuestions.length) * 100}%`;
        }

        if (uploadQuizNextBtn) {
            uploadQuizNextBtn.disabled = false;
        }
    }

    function showQuizResults() {
        if (uploadQuizQuestionArea) {
            uploadQuizQuestionArea.hidden = true;
        }

        if (uploadQuizResult) {
            uploadQuizResult.hidden = false;
            uploadQuizResult.innerHTML = `
                <h3>${quizScore} / ${quizQuestions.length}</h3>
                <p>
                    ${quizScore === quizQuestions.length
                        ? "Excellent work! You understand File Upload Vulnerabilities."
                        : "Review the explanations and try again to improve your score."}
                </p>
            `;
        }

        if (uploadQuizProgress) {
            uploadQuizProgress.textContent = "QUIZ COMPLETED";
        }

        if (uploadQuizNextBtn) {
            uploadQuizNextBtn.hidden = true;
        }

        if (uploadQuizRestartBtn) {
            uploadQuizRestartBtn.hidden = false;
        }
    }

    uploadQuizNextBtn?.addEventListener("click", () => {
        if (!quizAnswered) return;

        if (quizIndex < quizQuestions.length - 1) {
            quizIndex++;
            renderQuiz();
        } else {
            showQuizResults();
        }
    });

    uploadQuizRestartBtn?.addEventListener("click", () => {
        quizIndex = 0;
        quizScore = 0;
        quizAnswered = false;

        if (uploadQuizQuestionArea) {
            uploadQuizQuestionArea.hidden = false;
        }

        if (uploadQuizNextBtn) {
            uploadQuizNextBtn.hidden = false;
        }

        if (uploadQuizRestartBtn) {
            uploadQuizRestartBtn.hidden = true;
        }

        renderQuiz();
    });


    // ==========================================
    // 5. INITIALIZE LAB
    // ==========================================

    setUploadMode("vulnerable");
    resetUploadSimulator();
    renderWalkthrough();
    renderQuiz();

    if (uploadQuizRestartBtn) {
        uploadQuizRestartBtn.hidden = true;
    }

    addUploadLog("File Upload Security Lab initialized.", "info");
});
