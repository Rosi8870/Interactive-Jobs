const jobList = document.getElementById("jobList");
const search = document.getElementById("search");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const mTitle = document.getElementById("mTitle");
const mBody = document.getElementById("mBody");
const mApply = document.getElementById("mApply");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const dock = document.getElementById("dock");

/* Jobs */
const defaultJobs = [
  {
    id: 'job_default_1',
    title: "🎯 iOPEX Walkin Drive",
    raw: `🎯 iOPEX Walkin Drive
Role: Finance Executive
Qualification: Any Graduate
Experience: 1-4 Years
Date: 19th December
https://www.naukri.com/`,
    apply: "https://www.naukri.com/",
    views: 0,
    applies: 0,
    createdAt: Date.now()
  }
];

function loadJobs(){
  const stored = JSON.parse(localStorage.getItem("jobs"));
  if(!stored) return defaultJobs;
  const fixed = stored.map(j => ({
    id: j.id || ('job_'+Date.now()+'_'+Math.random().toString(36).slice(2,6)),
    title: j.title || ((j.raw||'').split('\n')[0] || 'Untitled'),
    raw: j.raw || '',
    apply: j.apply || '',
    views: Number(j.views||0),
    applies: Number(j.applies||0),
    createdAt: j.createdAt || Date.now()
  }));
  // if any job objects changed structure we can persist back
  if(!stored.every(s => s.id)) saveJobs(fixed);
  return fixed;
}

function saveJobs(j){
  localStorage.setItem("jobs", JSON.stringify(j));
}

function render(list) {
  jobList.innerHTML = "";
  list.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";
    const lines = (job.raw||"").split('\n').map(l => l.trim()).filter(Boolean);
    const excerpt = lines[1] ? lines[1] : (lines[0] && lines[0].length>50 ? lines[0].slice(0,50)+"..." : "");
    card.innerHTML = `
      <h3>${job.title}</h3>
      <p>${excerpt}</p>
    `;
    card.onclick = () => openModal(job);
    jobList.appendChild(card);
  });
} 

render(loadJobs());

// Update UI when storage changes in other windows/tabs
window.addEventListener('storage', e => {
  if(e.key === 'jobs') render(loadJobs());
  if(e.key === 'announcement'){
    if(e.newValue) showToast(e.newValue);
  }
});

search.oninput = () => {
  const q = search.value.toLowerCase();
  render(loadJobs().filter(j => JSON.stringify(j).toLowerCase().includes(q)));
};

/* Modal */
function openModal(job) {
  mTitle.innerText = job.title || 'Job Details';
  mBody.innerText = job.raw || JSON.stringify(job, null, 2);
  if(job.apply){
    mApply.href = job.apply;
    mApply.style.display = 'block';
  } else {
    mApply.style.display = 'none';
  }
  // set modal job id so apply clicks can be tracked
  modal.dataset.jobId = job.id || '';
  // increment view count and persist
  try{
    const jobs = loadJobs();
    const j = jobs.find(x => x.id === job.id);
    if(j){ j.views = (j.views||0)+1; saveJobs(jobs); render(loadJobs()); }
  }catch(e){ console.error(e); }
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

modal.onclick = e => {
  if (e.target === modal) closeModal();
};

/* Toast */
function showToast(text, duration = 5000){
  toastText.innerText = text || '';
  toast.classList.add('show');
  if(window._toastTimeout) clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(hideToast, duration);
}

function showAnnouncement(){
  const ann = localStorage.getItem('announcement') || "No announcements currently.";
  showToast(ann);
}

function hideToast() {
  toast.classList.remove("show");
}

// Track when users click Apply in the modal
mApply.addEventListener('click', () => {
  const id = modal.dataset.jobId;
  if(!id) return;
  try{
    const jobs = loadJobs();
    const j = jobs.find(x=>x.id === id);
    if(j){ j.applies = (j.applies||0)+1; saveJobs(jobs); render(loadJobs()); }
  }catch(e){ console.error(e); }
});

/* Dock actions */
function scrollToTop() {
  jobList.scrollTo({ top: 0, behavior: "smooth" });
}

function openTelegram() {
  window.open("https://t.me/INTERACTIVE_JOBS/148", "_blank");
}

function openWhatsApp() {
  window.open("https://chat.whatsapp.com/HYRvmpKpwQlHURWUFoFBev", "_blank");
}

/* Magnetic Dock (Desktop only) */
if (window.matchMedia("(hover: hover)").matches) {
  dock.addEventListener("mousemove", e => {
    const rect = dock.getBoundingClientRect();
    [...dock.children].forEach(item => {
      const r = item.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const f = Math.max(0, 1 - d / 120);
      item.style.transform = `scale(${1 + f * 0.25})`;
    });
  });

  dock.addEventListener("mouseleave", () => {
    [...dock.children].forEach(i => i.style.transform = "");
  });
}
