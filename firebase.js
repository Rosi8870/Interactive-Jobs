// firebase.js - Silent version for public site (no console spam)
(function(){
  function _loadScript(src, callback){
    const s = document.createElement('script');
    s.src = src;
    s.onload = callback;
    s.async = false;
    document.head.appendChild(s);
  }

  // Optional config from admin (Vercel) - public site works without it
  _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', ()=>{
    _loadScript('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js', init);
  });

  function init(){
    try{
      // Use full config if available (admin), otherwise minimal for read-only
      const config = window.FIREBASE_CONFIG || { projectId: "storagede" }; // Replace with your actual project ID
      firebase.initializeApp(config);
      const db = firebase.firestore();
      window.firebaseEnabled = true;
      window._firestoreDb = db;

      // Jobs listener - silent
      db.collection('jobs').orderBy('createdAt','desc').onSnapshot(snap => {
        const jobs = [];
        snap.forEach(doc => {
          const d = doc.data();
          jobs.push({
            id: doc.id,
            title: d.title,
            raw: d.raw,
            apply: d.apply || '',
            views: Number(d.views||0),
            applies: Number(d.applies||0),
            createdAt: d.createdAt || 0
          });
        });
        try { localStorage.setItem('jobs', JSON.stringify(jobs)); } catch(e) {}
        if(typeof window.render === 'function') window.render(jobs);
      }, err => console.error('Firestore jobs error:', err));

      // Announcement listener - silent
      db.doc('meta/announcement').onSnapshot(doc => {
        const txt = (doc.exists && doc.data().text) ? doc.data().text : '';
        try { localStorage.setItem('announcement', txt); } catch(e) {}
        if(typeof window.showToast === 'function' && txt) {
          window.showToast(txt, 10000);
        }
      }, err => console.error('Firestore announcement error:', err));

      // Admin helpers (safe - not used on public site)
      window.firebasePushJob = async () => {};
      window.firebaseUpdateJob = async () => {};
      window.firebaseDeleteJob = async () => {};
      window.firebaseSetAnnouncement = async () => {};

    } catch(e) {
      console.error('Firebase init failed:', e);
      window.firebaseEnabled = false;
    }
  }
})();
