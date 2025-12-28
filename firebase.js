// firebase.js - Works on both admin and public site
(function(){
  function _loadScript(src, callback){
    const s = document.createElement('script'); s.src = src; s.onload = callback; s.async = false; document.head.appendChild(s);
  }

  if(!window.FIREBASE_CONFIG) {
    console.info('No Firebase config - read-only mode');
  }

  _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', ()=>{
    _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js', init);
  });

  function init(){
    try{
      const config = window.FIREBASE_CONFIG || { projectId: "storagede" }; // Minimal for read
      firebase.initializeApp(config);
      const db = firebase.firestore();
      window.firebaseEnabled = true;
      window._firestoreDb = db;
      console.info('Firebase initialized');

      // Jobs sync
      db.collection('jobs').orderBy('createdAt','desc').onSnapshot(snap => {
        const jobs = [];
        snap.forEach(doc => {
          const d = doc.data();
          jobs.push({ id: doc.id, title: d.title, raw: d.raw, apply: d.apply || '', views: Number(d.views||0), applies: Number(d.applies||0), createdAt: d.createdAt || 0 });
        });
        try{ localStorage.setItem('jobs', JSON.stringify(jobs)); }catch(e){}
        if(typeof window.render === 'function') window.render(jobs);
        console.info('Jobs synced from Firestore', jobs.length);
      }, e => console.error('jobs listener', e));

      // Announcement sync (public-friendly)
      db.doc('meta/announcement').onSnapshot(doc => {
        const txt = (doc.exists && doc.data().text) ? doc.data().text : '';
        try{ localStorage.setItem('announcement', txt); }catch(e){}
        if(typeof window.showToast === 'function' && txt) {
          window.showToast(txt, 10000);
        }
        console.info('Announcement synced');
      }, e => console.error('announcement listener', e));

      // Admin-only helpers (safe to define - won't be used on public)
      window.firebasePushJob = async function(job){ /* admin only */ };
      window.firebaseUpdateJob = async function(job){ /* admin only */ };
      window.firebaseDeleteJob = async function(jobId){ /* admin only */ };
      window.firebaseSetAnnouncement = async function(text){ /* admin only */ };

    }catch(e){
      console.error('Firebase init failed', e);
      window.firebaseEnabled = false;
    }
  }
})();
