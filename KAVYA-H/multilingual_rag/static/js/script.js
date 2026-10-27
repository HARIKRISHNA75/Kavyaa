document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const uploadArea = document.getElementById("uploadArea");
    const fileList = document.getElementById("fileList");
    const uploadBtn = document.getElementById("uploadBtn");
    const uploadStatus = document.getElementById("uploadStatus");
    const questionEl = document.getElementById("question");
    const languageEl = document.getElementById("language");
    const runBtn = document.getElementById("runBtn");
    const queryStatus = document.getElementById("queryStatus");
    const answerSection = document.getElementById("answerSection");
    const answerBox = document.getElementById("answerBox");
    let indexReady = false;

    const tiltCards = document.querySelectorAll(".tilt-card");

    tiltCards.forEach(card => {
        const handleMove = (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const rotateY = (x - 0.5) * 12;
            const rotateX = (0.5 - y) * 12;
            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        };

        const reset = () => {
            card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)";
        };

        card.addEventListener("pointermove", handleMove);
        card.addEventListener("pointerleave", reset);
    });

    let selectedFiles = [];

    ["dragenter", "dragover"].forEach(evt => {
        uploadArea.addEventListener(evt, e => {
            e.preventDefault();
            uploadArea.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(evt => {
        uploadArea.addEventListener(evt, e => {
            e.preventDefault();
            uploadArea.classList.remove("dragover");
        });
    });

    uploadArea.addEventListener("drop", e => {
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    });

    fileInput.addEventListener("change", () => {
        addFiles(Array.from(fileInput.files));
    });

    function addFiles(files) {
        const allowed = [".pdf", ".docx", ".txt"];
        files.forEach(f => {
            const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
            if (allowed.includes(ext) && !selectedFiles.some(sf => sf.name === f.name && sf.size === f.size)) {
                selectedFiles.push(f);
            }
        });
        renderFileList();
        uploadBtn.disabled = selectedFiles.length === 0;
    }

    function renderFileList() {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = "";
            return;
        }

        fileList.innerHTML = selectedFiles.map((f, i) =>
            `<div class="file-item">
                <span>📄 ${f.name}</span>
                <button type="button" data-idx="${i}" class="remove-file" style="margin-left:auto;background:none;border:none;color:#f87171;cursor:pointer;">✕</button>
            </div>`
        ).join("");

        fileList.querySelectorAll(".remove-file").forEach(btn => {
            btn.addEventListener("click", () => {
                selectedFiles.splice(parseInt(btn.dataset.idx), 1);
                renderFileList();
                uploadBtn.disabled = selectedFiles.length === 0;
            });
        });
    }

    uploadBtn.addEventListener("click", async () => {
        if (selectedFiles.length === 0) return;

        const formData = new FormData();
        selectedFiles.forEach(f => formData.append("files", f));

        uploadBtn.disabled = true;
        uploadStatus.className = "status loading";
        uploadStatus.textContent = "Uploading and processing documents...";

        try {
            const res = await fetch("/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            uploadStatus.className = "status success";
            uploadStatus.textContent = `${data.message} (${data.chunks} chunks created)`;
            indexReady = true;
            runBtn.disabled = false;
            selectedFiles = [];
            renderFileList();
            fileInput.value = "";
        } catch (err) {
            uploadStatus.className = "status error";
            uploadStatus.textContent = err.message;
            uploadBtn.disabled = false;
        }
    });

    runBtn.addEventListener("click", async () => {
        const question = questionEl.value.trim();
        if (!question) {
            queryStatus.className = "status error";
            queryStatus.textContent = "Please enter a question.";
            return;
        }
        runBtn.disabled = true;
        queryStatus.className = "status loading";
        queryStatus.textContent = "Retrieving and generating answer...";
        answerSection.style.display = "none";

        try {
            const res = await fetch("/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: question,
                    language: languageEl.value
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Query failed");
            }

            answerBox.textContent = data.answer;
            answerSection.style.display = "block";
            queryStatus.className = "status";
            queryStatus.textContent = "";
        } catch (err) {
            queryStatus.className = "status error";
            queryStatus.textContent = err.message;
        } finally {
            runBtn.disabled = false;
        }
    });

    fetch("/status")
        .then(r => r.json())
        .then(data => {
            if (data.ready) {
                indexReady = true;
                runBtn.disabled = false;
                uploadStatus.className = "status success";
                uploadStatus.textContent = `Index ready (${data.num_chunks} chunks). You can ask questions.`;
            }
        })
        .catch(() => {});
});
