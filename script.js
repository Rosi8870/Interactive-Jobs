const jobList = document.getElementById("jobList");
const search = document.getElementById("search");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("mTitle");
const mBody = document.getElementById("mBody");
const mTags = document.getElementById("mTags");
const mApply = document.getElementById("mApply");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

// Chat elements
const chatModal = document.getElementById("chatModal");
const chatTitle = document.getElementById("chatTitle");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

let currentView = 'home';
let currentChatJobId = null;
let chatUnsubscribe = null;

// Safely load jobs
function loadJobs() {
  try {
    const stored = JSON.parse(localStorage.getItem("jobs") || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.map(j => ({
      id: j.id || '',
      title: j.title || 'Untitled Job',
      raw: j.raw || '',
      apply: j.apply || '',
      views: j.views || 0,
      applies: j.applies || 0,
      createdAt: j.createdAt || 0,
      tags: extractTags(j.raw || '')
    }));
  } catch (e) {
    console.error("Failed to load jobs:", e);
    return [];
  }
}

// Extract tags
function extractTags(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const lower = raw.toLowerCase();
  const known = ['it', 'finance', 'hr', 'sales', 'marketing', 'walk-in', 'remote', 'fresher', 'full-time', 'internship'];
  return known.filter(tag => lower.includes(tag));
}

// Increment View & Apply
function incrementView(jobId) {
  if (!jobId || !window.firebaseEnabled) return;
  firebase.firestore().collection('jobs').doc(jobId).update({
    views: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});
}

function incrementApply(jobId) {
  if (!jobId || !window.firebaseEnabled) return;
  firebase.firestore().collection('jobs').doc(jobId).update({
    applies: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});
}

// Google for Jobs - JSON-LD Structured Data
function updateGoogleJobsSchema() {
  const jobs = loadJobs();
  const itemListElement = jobs.map((job, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "JobPosting",
      "title": job.title || "Job Opportunity",
      "description": job.raw.replace(/\n/g, '<br>') || "Job details available",
      "datePosted": job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      "validThrough": "2026-12-31",
      "employmentType": "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": "Various Companies",
        "sameAs": location.href
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "India",
          "addressCountry": "IN"
        }
      },
      "applicantLocationRequirements": {
        "@type": "Country",
        "name": "IN"
      },
      "directApply": true,
      "apply": job.apply || location.href
    }
  }));

  const schemaScript = document.getElementById('google-jobs-schema');
  if (schemaScript) {
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": itemListElement
    }, null, 2);
  }
}

// Render jobs
function render(list = loadJobs()) {
  jobList.innerHTML = "";
  const q = search.value.toLowerCase().trim();
  let filtered = list;

  if (q) {
    filtered = filtered.filter(j =>
      (j.title || '').toLowerCase().includes(q) ||
      (j.raw || '').toLowerCase().includes(q)
    );
  }

  if (currentView === 'favorites') {
    const favIds = JSON.parse(localStorage.getItem("favorites") || "[]");
    filtered = filtered.filter(j => favIds.includes(j.id));
  }

  if (filtered.length === 0) {
    jobList.innerHTML = '<p style="text-align:center;opacity:0.6;padding:60px 20px">No jobs found</p>';
    return;
  }

  filtered.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";
    const lines = (job.raw || '').split('\n').filter(Boolean);
    const excerpt = lines.slice(0, 3).join(' ') + (lines.length > 3 ? '...' : '');

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <h3>${job.title}</h3>
          <p>${excerpt || 'No description'}</p>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${(job.tags || []).map(t => `<span style="padding:4px 10px;border-radius:10px;background:#0a84ff33;color:#0a84ff;font-size:0.85rem">${t.toUpperCase()}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <button onclick="event.stopPropagation(); toggleFavorite('${job.id}')" style="background:none;border:none;font-size:28px;cursor:pointer">${isFavorite(job.id) ? '❤️' : '🤍'}</button>
          <button onclick="event.stopPropagation(); shareJobById('${job.id}')" style="background:none;border:none;font-size:28px;cursor:pointer">📤</button>
        </div>
      </div>
    `;
    card.onclick = () => openModal(job);
    jobList.appendChild(card);
  });

  // Update Google for Jobs schema
  updateGoogleJobsSchema();
}

// Favorites
function toggleFavorite(id) {
  if (!id) return;
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  localStorage.setItem("favorites", JSON.stringify(favs));
  render();
}

function isFavorite(id) {
  if (!id) return false;
  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  return favs.includes(id);
}

// Share
function shareJobById(jobId) {
  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) {
    showToast("Job not found for sharing");
    return;
  }

  const url = location.href.split('?')[0];
  const title = job.title || "Job Opportunity";
  const text = job.raw 
    ? job.raw.split('\n').filter(l => l.trim() && !l.toLowerCase().includes('apply link')).slice(0, 2).join(' | ')
    : "Check out this job on Interactive Jobs!";

  const shareData = { title, text, url };

  if (navigator.share) {
    navigator.share(shareData)
      .then(() => showToast("Shared successfully! 🚀"))
      .catch(err => {
        if (err.name !== 'AbortError') {
          copyFallback(url);
        }
      });
  } else {
    copyFallback(url);
  }
}

function copyFallback(url) {
  navigator.clipboard.writeText(url)
    .then(() => showToast("Job link copied to clipboard! 📋"))
    .catch(() => {
      prompt("Copy this link manually:", url);
    });
}

// Search
search.oninput = () => render();

// Modal (with view count)
function openModal(job) {
  if (!job) return;
  mTitle.innerText = job.title || 'Untitled Job';
  mBody.innerText = job.raw || 'No description available';
  mTags.innerHTML = (job.tags || []).map(t => `<span style="padding:6px 12px;border-radius:12px;background:#0a84ff33;color:#0a84ff;margin:4px">${t.toUpperCase()}</span>`).join('');
  mApply.href = job.apply || '#';
  mApply.style.display = job.apply ? 'block' : 'none';
  modal.dataset.jobId = job.id || '';

  // Increment view count
  incrementView(job.id);

  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

// Toast
function showToast(text, duration = 5000) {
  toastText.innerText = text || '';
  toast.classList.add('show');
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(hideToast, duration);
}

function hideToast() {
  toast.classList.remove("show");
}

// Views
function showView(view) {
  currentView = view;
  render();
}

// WhatsApp & Telegram
function openWhatsApp() {
  const link = "https://chat.whatsapp.com/HYRvmpKpwQlHURWUFoFBev"; // Replace with your link
  window.open(link, "_blank");
  showToast("Opening WhatsApp...");
}

function openTelegram() {
  const link = "https://t.me/INTERACTIVE_JOBS"; // Replace with your link
  window.open(link, "_blank");
  showToast("Opening Telegram...");
}

// Show Announcement on Alert click
function showAnnouncement() {
  const ann = localStorage.getItem('announcement');
  if (ann) {
    showToast(ann, 15000);
  } else {
    showToast("No current announcement", 4000);
  }
}

// Chat Logic
function openChat(jobId) {
  if (!jobId) {
    showToast("Cannot open chat for this job");
    return;
  }
  currentChatJobId = jobId;
  chatTitle.innerText = document.getElementById('mTitle').innerText || 'Job Chat';
  closeModal();
  chatModal.classList.add("show");
  loadChatMessages();
}

function closeChat() {
  chatModal.classList.remove("show");
  chatMessages.innerHTML = '';
  if (chatUnsubscribe) chatUnsubscribe();
  currentChatJobId = null;
  chatInput.value = '';
}

function loadChatMessages() {
  chatMessages.innerHTML = '<p style="text-align:center;opacity:0.6">Loading chat...</p>';

  const chatsRef = firebase.firestore().collection('jobs').doc(currentChatJobId).collection('chats');

  chatUnsubscribe = chatsRef.orderBy('timestamp', 'asc').onSnapshot(snap => {
    chatMessages.innerHTML = '';
    if (snap.empty) {
      chatMessages.innerHTML = '<p style="text-align:center;opacity:0.6">No messages yet. Start the conversation!</p>';
      return;
    }
    snap.forEach(doc => {
      const msg = doc.data();
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        max-width:80%;
        padding:12px 16px;
        border-radius:18px;
        margin:8px 0;
        word-wrap:break-word;
        align-self:${msg.isMine ? 'flex-end' : 'flex-start'};
        background:${msg.isMine ? '#0a84ff' : 'rgba(255,255,255,0.1)'};
        color:${msg.isMine ? 'white' : 'var(--text)'};
        border-bottom-right-radius:${msg.isMine ? '4px' : '18px'};
        border-bottom-left-radius:${msg.isMine ? '18px' : '4px'};
      `;
      bubble.innerText = msg.text || '';

      // Admin delete button
      if (localStorage.getItem("admin") === "true") {
        const delBtn = document.createElement('button');
        delBtn.className = 'chat-admin-delete';
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm("Delete this message?")) {
            firebase.firestore().collection('jobs').doc(currentChatJobId).collection('chats').doc(doc.id).delete()
              .then(() => showToast("Message deleted"))
              .catch(() => showToast("Delete failed"));
          }
        };
        bubble.appendChild(delBtn);
      }

      chatMessages.appendChild(bubble);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, err => {
    console.error("Chat load error:", err);
    showToast("Failed to load chat");
  });
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const chatsRef = firebase.firestore().collection('jobs').doc(currentChatJobId).collection('chats');
  chatsRef.add({
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    isMine: true
  }).then(() => {
    chatInput.value = '';
  }).catch(err => {
    console.error("Send error:", err);
    showToast("Failed to send message");
  });
}

// Enter key to send
chatInput?.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

// Initial load
window.addEventListener('load', () => {
  render();
  const ann = localStorage.getItem('announcement');
  if (ann) showToast(ann, 12000);

  setTimeout(render, 1500);
});

// Real-time updates
window.addEventListener('storage', e => {
  if (e.key === 'jobs') render();
  if (e.key === 'announcement' && e.newValue) showToast(e.newValue, 12000);
});