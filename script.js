const jobList = document.getElementById("jobList");
const search = document.getElementById("search");
const modal = document.getElementById("modal");
const mTitle = document.getElementById("mTitle");
const mBody = document.getElementById("mBody");
const mTags = document.getElementById("mTags");
const mApply = document.getElementById("mApply");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");

// Chat
const chatModal = document.getElementById("chatModal");
const chatTitle = document.getElementById("chatTitle");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

let currentView = 'home';
let currentChatJobId = null;
let chatUnsubscribe = null;

function loadJobs() {
  const stored = JSON.parse(localStorage.getItem("jobs") || "[]");
  return stored.map(j => ({
    ...j,
    tags: extractTags(j.raw)
  }));
}

function extractTags(raw) {
  const lower = raw.toLowerCase();
  const known = ['it', 'finance', 'hr', 'sales', 'marketing', 'walk-in', 'remote', 'fresher', 'full-time', 'internship'];
  return known.filter(tag => lower.includes(tag));
}

function render(list = loadJobs()) {
  jobList.innerHTML = "";
  const q = search.value.toLowerCase();
  const filtered = q ? list.filter(j => JSON.stringify(j).toLowerCase().includes(q)) : list;

  filtered.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";
    const excerpt = job.raw.split('\n').slice(0, 3).join(' ') + (job.raw.split('\n').length > 3 ? '...' : '');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <h3>${job.title}</h3>
          <p>${excerpt}</p>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${job.tags.map(t => `<span style="padding:4px 10px;border-radius:10px;background:#0a84ff33;color:#0a84ff;font-size:0.85rem">${t.toUpperCase()}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button onclick="event.stopPropagation(); toggleFavorite('${job.id}')" style="background:none;border:none;font-size:26px;cursor:pointer">${isFavorite(job.id) ? '❤️' : '🤍'}</button>
          <button onclick="event.stopPropagation(); shareJob(job)" style="background:none;border:none;font-size:26px;cursor:pointer">📤</button>
        </div>
      </div>
    `;
    card.onclick = () => openModal(job);
    jobList.appendChild(card);
  });
}

// Favorites
function toggleFavorite(id) {
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  if (favs.includes(id)) favs = favs.filter(f => f !== id);
  else favs.push(id);
  localStorage.setItem("favorites", JSON.stringify(favs));
  render();
}

function isFavorite(id) {
  return JSON.parse(localStorage.getItem("favorites") || "[]").includes(id);
}

function loadFavorites() {
  const all = loadJobs();
  const favIds = JSON.parse(localStorage.getItem("favorites") || "[]");
  return all.filter(j => favIds.includes(j.id));
}

// Share
function shareJob(job) {
  const url = location.href.split('?')[0];
  if (navigator.share) {
    navigator.share({ title: job.title, text: job.raw.split('\n')[1] || '', url });
  } else {
    navigator.clipboard.writeText(url);
    showToast("Link copied!");
  }
}

// Quick Apply
function quickApply() {
  const name = document.getElementById("applyName").value.trim();
  const email = document.getElementById("applyEmail").value.trim();
  if (!name || !email) return showToast("Name and email required");
  const subject = encodeURIComponent(`Application: ${mTitle.innerText}`);
  const body = encodeURIComponent(`Hi,\n\nName: ${name}\nEmail: ${email}\n\nI'm interested in this position.\n\nThanks!`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  showToast("Opening email client...");
}

// Search
search.oninput = () => render();

// Modal
function openModal(job) {
  mTitle.innerText = job.title;
  mBody.innerText = job.raw;
  mTags.innerHTML = job.tags.map(t => `<span style="padding:6px 12px;border-radius:12px;background:#0a84ff33;color:#0a84ff;margin:4px">${t.toUpperCase()}</span>`).join('');
  mApply.href = job.apply || '#';
  mApply.style.display = job.apply ? 'block' : 'none';
  modal.dataset.jobId = job.id;
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
  document.getElementById("applyName").value = "";
  document.getElementById("applyEmail").value = "";
  document.getElementById("applyPhone").value = "";
  document.getElementById("applyResume").value = "";
}

// Toast
function showToast(text, duration = 5000) {
  toastText.innerText = text;
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
  if (view === 'favorites') render(loadFavorites());
  else render();
}

// Chat Logic
function openChat(jobId) {
  if (!jobId) return showToast("Cannot open chat");
  currentChatJobId = jobId;
  chatTitle.innerText = document.getElementById('mTitle').innerText;
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
  chatMessages.innerHTML = '<p style="text-align:center;opacity:0.6">Loading...</p>';
  const chatsRef = firebase.firestore().collection('jobs').doc(currentChatJobId).collection('chats');
  chatUnsubscribe = chatsRef.orderBy('timestamp', 'asc').onSnapshot(snap => {
    chatMessages.innerHTML = '';
    if (snap.empty) {
      chatMessages.innerHTML = '<p style="text-align:center;opacity:0.6">No messages yet. Start chatting!</p>';
    }
    snap.forEach(doc => {
      const msg = doc.data();
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        max-width:80%;padding:12px 16px;border-radius:18px;margin:8px 0;word-wrap:break-word;
        align-self:${msg.isMine ? 'flex-end' : 'flex-start'};
        background:${msg.isMine ? '#0a84ff' : 'rgba(255,255,255,0.1)'};
        color:${msg.isMine ? 'white' : 'var(--text)'};
        border-bottom-right-radius:${msg.isMine ? '4px' : '18px'};
        border-bottom-left-radius:${msg.isMine ? '18px' : '4px'};
      `;
      bubble.innerText = msg.text;
      chatMessages.appendChild(bubble);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const chatsRef = firebase.firestore().collection('jobs').doc(currentChatJobId).collection('chats');
  chatsRef.add({
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    isMine: true
  }).then(() => chatInput.value = '');
}

// Enter to send
chatInput?.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// Initial render
render();

// Sync updates
window.addEventListener('storage', e => {
  if (e.key === 'jobs') render();
  if (e.key === 'announcement' && e.newValue) showToast(e.newValue, 10000);
});