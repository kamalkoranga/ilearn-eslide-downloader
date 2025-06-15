// Wait for CryptoJS to be loaded
if (typeof CryptoJS === 'undefined') {
  // Load from extension's local copy
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('crypto.min.js');
  script.onload = function() {
    initPasswordDecryption();
  };
  document.head.appendChild(script);
} else {
  initPasswordDecryption();
}

function extractPdfId() {
  const iframes = document.getElementsByTagName('iframe');
  let pdfId = null;

  for (let iframe of iframes) {
    const src = iframe.getAttribute('src');
    if (!src) continue;

    const match = src.match(/\/pdfs\/([a-f0-9]{24})\/get/);
    if (match && match[1]) {
      pdfId = match[1];
      break;
    }
  }

  return pdfId;
}

// Send the PDF ID to the background script when needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPdfId") {
    const pdfId = extractPdfId();
    sendResponse({ pdfId: pdfId });
  }
});

function initPasswordDecryption() {
  function findPDFPassword(a, b) {
    const c = "length substring parse Hex enc decrypt AES".split(" ");
    a = CryptoJS[c[6]][c[5]](
      a[c[1]](32, a[c[0]] - 32),
      CryptoJS[c[4]][c[3]][c[2]](a[c[1]](a[c[0]] - 32)),
      {
        iv: CryptoJS[c[4]][c[3]][c[2]](a[c[1]](0, 32))
      }
    );
    return b ? a.toString(CryptoJS[c[4]].Utf8) : a;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPdfPassword") {
      const password = findPDFPassword(request.encryptedPassword, request.decode);
      sendResponse({ password: password });
    }
  });
}
