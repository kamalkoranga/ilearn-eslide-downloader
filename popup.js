document.getElementById("downloadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "Processing...";
  
  try {
    // Get current tab URL
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const currentUrl = tabs[0].url;
    
    // Get Course ID from URL
    const courseIdMatch = currentUrl.match(/\/courses\/([a-f0-9]{24})\//);
    const courseId = courseIdMatch ? courseIdMatch[1] : null;

    // Get PDF ID from iframe
    const response = await browser.tabs.sendMessage(tabs[0].id, {
      action: "getPdfId"
    });
    if (!response || !response.pdfId) {
      status.textContent = "No PDF ID found in iframe src";
    }
    const pdfId = response.pdfId;

    // // Fetch preview info from iLearn (requires user's cookie)
    const previewRes = await fetch(`https://ilearn.gehu.ac.in/s/courses/${courseId}/pdfs/${pdfId}/preview/url`, {
      credentials: "include"
    });

    if (!previewRes.ok) {
      status.textContent = "Failed to fetch preview URL.";
      return;
    }

    const { url: pdfUrl, p } = await previewRes.json();

    const response2 = await browser.tabs.sendMessage(tabs[0].id, {
      action: "getPdfPassword",
      encryptedPassword: p,
      decode: true
    });

    if (!response2 || !response2.password) {
      status.textContent = "Failed to decrypt password.";
      return;
    }

    const password = response2.password;
    
    // Send to your backend to decrypt and unlock
    const unlockRes = await fetch("https://ilearn-eslide-downloader-backend.vercel.app/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pdfUrl, password: password })
    });

    if (!unlockRes.ok) {
      status.textContent = "Failed to unlock PDF.";
      return;
    }

    const blob = await unlockRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "eslide.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    status.textContent = "Download started successfully!";
  } catch (err) {
    console.error(err);
    status.textContent = err;
  }
});
