// firebase.js
// Optional Firestore synchronization for jobs and announcement.
// Usage:
// 1. Create a file `firebase-config.js` (not committed) and set window.FIREBASE_CONFIG = { apiKey: '...', authDomain: '...', projectId: '...', ... };
// 2. Include firebase-app and firebase-firestore compat scripts in your page (done below) or let this file load them dynamically.

(function(){
  // helper to load scripts
  function _loadScript(src, callback){
    const s = document.createElement('script'); s.src = src; s.onload = callback; s.async = false; document.head.appendChild(s);
  }

  // if no config present, don't enable
  if(!window.FIREBASE_CONFIG) {
    window.firebaseEnabled = false;
    return;
  }

  // Load compat SDKs (simple approach)
  _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', ()=>{
    _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js', init);
  });

  function init(){
    try{
      firebase.initializeApp(window.FIREBASE_CONFIG);
      const db = firebase.firestore();
      window.firebaseEnabled = true;
      window._firestoreDb = db;
      console.info('Firebase initialized');

      // Listen to jobs collection
      db.collection('jobs').orderBy('createdAt','desc').onSnapshot(snap => {
        const jobs = [];
        snap.forEach(doc => {
          const d = doc.data();
          jobs.push({ id: doc.id, title: d.title, raw: d.raw, apply: d.apply || '', views: Number(d.views||0), applies: Number(d.applies||0), createdAt: d.createdAt || 0 });
        });
        // Update localStorage and UI
        try{ localStorage.setItem('jobs', JSON.stringify(jobs)); }catch(e){}
        if(typeof window.render === 'function') window.render(jobs);
        if(typeof window.renderAdminJobs === 'function') window.renderAdminJobs();
        console.info('Jobs synced from Firestore', jobs.length);
      }, e => console.error('jobs listener', e));

      // Listen to announcement document
      db.doc('meta/announcement').onSnapshot(doc => {
        const txt = (doc.exists && doc.data().text) ? doc.data().text : '';
        try{ localStorage.setItem('announcement', txt); }catch(e){}
        if(typeof window.renderAnnouncementAdmin === 'function') window.renderAnnouncementAdmin();
        if(typeof window.showToastAdmin === 'function' && txt) window.showToastAdmin('Announcement updated', 1500);
      }, e=>console.error('announcement listener', e));

      // Expose helper functions
      window.firebasePushJob = async function(job){
        try{
          // use job.id as doc id if available
          const id = job.id || ('job_'+Date.now());
          await db.collection('jobs').doc(id).set({
            title: job.title || '', raw: job.raw || '', apply: job.apply || '', views: Number(job.views||0), applies: Number(job.applies||0), createdAt: job.createdAt || Date.now()
          });
          return true;
        }catch(e){ console.error('pushJob', e); return false; }
      };

      window.firebaseUpdateJob = async function(job){
        if(!job || !job.id) return false;
        try{
          await db.collection('jobs').doc(job.id).set({ title: job.title||'', raw: job.raw||'', apply: job.apply||'', views: Number(job.views||0), applies: Number(job.applies||0), createdAt: job.createdAt || Date.now() });
          return true;
        }catch(e){ console.error('updateJob', e); return false; }
      };

      window.firebaseDeleteJob = async function(jobId){
        if(!jobId) return false;
        try{ await db.collection('jobs').doc(jobId).delete(); return true; }catch(e){ console.error('deleteJob', e); return false; }
      };

      window.firebaseSetAnnouncement = async function(text){
        try{ await db.doc('meta/announcement').set({ text: text||'' }); return true; }catch(e){ console.error('setAnn', e); return false; }
      };

    }catch(e){ console.error('Firebase init failed', e); window.firebaseEnabled = false; }
  }
})();