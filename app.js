// ╔══════════════════════════════════════════════════════╗
// ║  app.js — Vibe Social App                           ║
// ║  Firebase Firestore + Storage backend               ║
// ╚══════════════════════════════════════════════════════╝

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  query, orderBy, onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ─────────────────────────────────────
//  🔥 FIREBASE CONFIG
//  Mau Connect Firebase Project
// ─────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCs2INSkHf6Ncev2Z3LaIIZPVsGyrsle-A",
  authDomain: "mau-connect.firebaseapp.com",
  projectId: "mau-connect",
  storageBucket: "mau-connect.firebasestorage.app",
  messagingSenderId: "852503073003",
  appId: "1:852503073003:web:b451bec5a126d3517beeae",
  measurementId: "G-S0RE31VGZW"
};

// ─────────────────────────────────────
//  INIT
// ─────────────────────────────────────
const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);
const storage     = getStorage(firebaseApp);

// ─────────────────────────────────────
//  STATE
// ─────────────────────────────────────
let currentUser    = null;  // { username, dob, sex }
let viewingProfile = null;  // username of the profile being viewed

// ─────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────
const pageHome    = document.getElementById('page-home');
const pageProfile = document.getElementById('page-profile');

const navUser     = document.getElementById('nav-user');
const registerCard = document.getElementById('register-card');
const loginCard    = document.getElementById('login-card');

// Register
const regUsername  = document.getElementById('reg-username');
const regDob       = document.getElementById('reg-dob');
const userFeedback = document.getElementById('username-feedback');
const btnRegister  = document.getElementById('btn-register');
const linkToLogin  = document.getElementById('link-to-login');

// Login
const loginUsername = document.getElementById('login-username');
const loginFeedback = document.getElementById('login-feedback');
const btnLogin      = document.getElementById('btn-login');
const linkToRegister = document.getElementById('link-to-register');

// User list
const userList    = document.getElementById('user-list');
const userCount   = document.getElementById('user-count');

// Profile
const btnBack         = document.getElementById('btn-back');
const profileAvatar   = document.getElementById('profile-avatar');
const profileInitial  = document.getElementById('profile-initial');
const profileUsername = document.getElementById('profile-username');
const profileSex      = document.getElementById('profile-sex');
const profileDob      = document.getElementById('profile-dob');
const uploadArea      = document.getElementById('upload-area');
const btnUpload       = document.getElementById('btn-upload-image');
const fileInput       = document.getElementById('file-input');
const galleryGrid     = document.getElementById('gallery-grid');
const galleryEmpty    = document.getElementById('gallery-empty');

// Lightbox
const lightbox          = document.getElementById('lightbox');
const lightboxOverlay   = document.getElementById('lightbox-overlay');
const lightboxClose     = document.getElementById('lightbox-close');
const lightboxImg       = document.getElementById('lightbox-img');
const lightboxReactions = document.getElementById('lightbox-reactions');

// ─────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────
function showPage(name) {
  pageHome.classList.toggle('active', name === 'home');
  pageProfile.classList.toggle('active', name === 'profile');
  pageHome.style.display    = name === 'home'    ? 'block' : 'none';
  pageProfile.style.display = name === 'profile' ? 'block' : 'none';
}

function toast(msg, type = 'ok', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function formatDob(dobStr) {
  if (!dobStr) return '';
  const d = new Date(dobStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitial(username) {
  return username ? username[0].toUpperCase() : '?';
}

function getSexEmoji(sex) {
  return sex === 'Male' ? '♂ Male' : sex === 'Female' ? '♀ Female' : '⚧ Other';
}

function updateNavUser() {
  if (!currentUser) { navUser.classList.add('hidden'); return; }
  navUser.classList.remove('hidden');
  navUser.innerHTML = `
    <div class="avatar-sm">${getInitial(currentUser.username)}</div>
    <strong>${currentUser.username}</strong>
    <button id="btn-logout">Sign out</button>
  `;
  document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('vibeUser');
    updateNavUser();
    toast('Signed out', 'ok');
  });
}

// ─────────────────────────────────────
//  REGISTRATION
// ─────────────────────────────────────
linkToLogin.addEventListener('click', e => {
  e.preventDefault();
  registerCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});
linkToRegister.addEventListener('click', e => {
  e.preventDefault();
  loginCard.classList.add('hidden');
  registerCard.classList.remove('hidden');
});

// Live username check
regUsername.addEventListener('input', async () => {
  const val = regUsername.value.trim();
  if (!val) { userFeedback.textContent = ''; return; }
  const snap = await getDoc(doc(db, 'users', val.toLowerCase()));
  if (snap.exists()) {
    userFeedback.textContent = 'Username already taken';
    userFeedback.className = 'feedback error';
  } else {
    userFeedback.textContent = '✓ Available';
    userFeedback.className = 'feedback success';
  }
});

btnRegister.addEventListener('click', async () => {
  const username = regUsername.value.trim();
  const dob      = regDob.value;
  const sexEl    = document.querySelector('input[name="sex"]:checked');

  if (!username)  { toast('Please enter a username', 'error'); return; }
  if (!dob)       { toast('Please enter your date of birth', 'error'); return; }
  if (!sexEl)     { toast('Please select your sex', 'error'); return; }

  const key  = username.toLowerCase();
  const snap = await getDoc(doc(db, 'users', key));
  if (snap.exists()) {
    userFeedback.textContent = 'Username already taken';
    userFeedback.className = 'feedback error';
    return;
  }

  await setDoc(doc(db, 'users', key), {
    username,
    dob,
    sex: sexEl.value,
    joinedAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  currentUser = { username, dob, sex: sexEl.value };
  sessionStorage.setItem('vibeUser', JSON.stringify(currentUser));
  updateNavUser();
  toast(`Welcome, ${username}! 🎉`, 'ok');
});

// ─────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const val = loginUsername.value.trim();
  if (!val) { toast('Enter your username', 'error'); return; }
  const snap = await getDoc(doc(db, 'users', val.toLowerCase()));
  if (!snap.exists()) {
    loginFeedback.textContent = 'Username not found';
    loginFeedback.className = 'feedback error';
    return;
  }
  const data = snap.data();
  currentUser = { username: data.username, dob: data.dob, sex: data.sex };
  sessionStorage.setItem('vibeUser', JSON.stringify(currentUser));
  updateNavUser();
  loginFeedback.textContent = '';
  loginUsername.value = '';
  toast(`Welcome back, ${data.username}!`, 'ok');
});

// ─────────────────────────────────────
//  USER LIST (real-time)
// ─────────────────────────────────────
function renderUserList(users) {
  userCount.textContent = `(${users.length})`;
  if (!users.length) {
    userList.innerHTML = '<p class="user-list-empty">No users yet. Be the first!</p>';
    return;
  }
  userList.innerHTML = users.map((u, i) => `
    <div class="user-card" data-username="${u.username}" style="animation-delay:${i * 0.04}s">
      <div class="avatar">${getInitial(u.username)}</div>
      <div class="info">
        <strong>${u.username}</strong>
        <small>${getSexEmoji(u.sex)} · Joined ${formatDob(u.dob)}</small>
      </div>
      <span class="arrow">›</span>
    </div>
  `).join('');
  userList.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', () => openProfile(card.dataset.username));
  });
}

// Subscribe to user list
const usersQuery = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
onSnapshot(usersQuery, snap => {
  const users = snap.docs.map(d => d.data());
  renderUserList(users);
});

// ─────────────────────────────────────
//  PROFILE PAGE
// ─────────────────────────────────────
async function openProfile(username) {
  viewingProfile = username;
  const key  = username.toLowerCase();
  const snap = await getDoc(doc(db, 'users', key));
  if (!snap.exists()) { toast('User not found', 'error'); return; }

  const data = snap.data();
  profileUsername.textContent = data.username;
  profileSex.textContent      = getSexEmoji(data.sex);
  profileDob.textContent      = '🎂 ' + formatDob(data.dob);

  // Avatar (first gallery image or initial)
  profileAvatar.src = '';
  profileAvatar.classList.add('hidden');
  profileInitial.textContent = getInitial(data.username);
  profileInitial.classList.remove('hidden');

  // Show upload button only to the profile owner
  if (currentUser && currentUser.username.toLowerCase() === key) {
    uploadArea.classList.remove('hidden');
  } else {
    uploadArea.classList.add('hidden');
  }

  // Load gallery
  loadGallery(key);
  showPage('profile');
}

btnBack.addEventListener('click', () => {
  viewingProfile = null;
  showPage('home');
});

// ─────────────────────────────────────
//  GALLERY
// ─────────────────────────────────────
let galleryUnsub = null;

function loadGallery(userKey) {
  if (galleryUnsub) galleryUnsub();
  galleryGrid.innerHTML = '';

  const imagesRef = collection(db, 'users', userKey, 'images');
  const q = query(imagesRef, orderBy('uploadedAt', 'desc'));

  galleryUnsub = onSnapshot(q, snap => {
    if (snap.empty) {
      galleryGrid.innerHTML = '<p class="gallery-empty">No images yet.</p>';
      return;
    }
    galleryGrid.innerHTML = '';
    snap.docs.forEach((d, i) => {
      const img = d.data();
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.style.animationDelay = `${i * 0.05}s`;
      item.innerHTML = `
        <img src="${img.url}" alt="photo" loading="lazy"/>
        <div class="reactions-bar">
          ${reactionBar(d.id, img.reactions || {}, userKey)}
        </div>
      `;
      // Click → lightbox
      item.querySelector('img').addEventListener('click', () => openLightbox(img.url, d.id, img.reactions || {}, userKey));
      // Reaction buttons
      item.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          react(userKey, d.id, btn.dataset.reaction, img.reactions || {});
        });
      });
      galleryGrid.appendChild(item);
    });
  });
}

function reactionBar(imageId, reactions, userKey) {
  const types = [
    { key: 'like',    emoji: '👍' },
    { key: 'love',    emoji: '❤️' },
    { key: 'dislike', emoji: '👎' },
  ];
  return types.map(t => `
    <button class="reaction-btn" data-reaction="${t.key}" data-img="${imageId}" data-user="${userKey}">
      <span class="emoji">${t.emoji}</span>
      <span class="count">${reactions[t.key] || 0}</span>
    </button>
  `).join('');
}

async function react(userKey, imageId, type, currentReactions) {
  const imgRef = doc(db, 'users', userKey, 'images', imageId);
  const updated = { ...currentReactions };
  updated[type] = (updated[type] || 0) + 1;
  await updateDoc(imgRef, { reactions: updated });
}

// ─────────────────────────────────────
//  LIGHTBOX
// ─────────────────────────────────────
let lightboxCurrentImageId  = null;
let lightboxCurrentUserKey  = null;
let lightboxCurrentReactions = {};

function openLightbox(url, imageId, reactions, userKey) {
  lightboxImg.src = url;
  lightboxCurrentImageId   = imageId;
  lightboxCurrentUserKey   = userKey;
  lightboxCurrentReactions = reactions;
  renderLightboxReactions(reactions);
  lightbox.classList.remove('hidden');
}

function renderLightboxReactions(reactions) {
  const types = [
    { key: 'like',    emoji: '👍', label: 'Like'    },
    { key: 'love',    emoji: '❤️', label: 'Love'    },
    { key: 'dislike', emoji: '👎', label: 'Dislike' },
  ];
  lightboxReactions.innerHTML = types.map(t => `
    <button class="reaction-btn" data-reaction="${t.key}">
      <span class="emoji">${t.emoji}</span>
      <span class="count">${reactions[t.key] || 0}</span>
    </button>
  `).join('');
  lightboxReactions.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await react(lightboxCurrentUserKey, lightboxCurrentImageId, btn.dataset.reaction, lightboxCurrentReactions);
      // Re-fetch to update counts
      const snap = await getDoc(doc(db, 'users', lightboxCurrentUserKey, 'images', lightboxCurrentImageId));
      if (snap.exists()) {
        lightboxCurrentReactions = snap.data().reactions || {};
        renderLightboxReactions(lightboxCurrentReactions);
      }
    });
  });
}

lightboxClose.addEventListener('click',   () => lightbox.classList.add('hidden'));
lightboxOverlay.addEventListener('click', () => lightbox.classList.add('hidden'));

// ─────────────────────────────────────
//  IMAGE UPLOAD
// ─────────────────────────────────────
btnUpload.addEventListener('click', () => {
  if (!currentUser) { toast('Sign in to upload images', 'error'); return; }
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.value = '';

  const key = currentUser.username.toLowerCase();

  // Progress toast
  const prog = document.createElement('div');
  prog.className = 'upload-progress';
  prog.innerHTML = `
    <span>Uploading image…</span>
    <div class="bar-track"><div class="bar-fill" id="prog-bar" style="width:0%"></div></div>
  `;
  document.body.appendChild(prog);

  const storageRef = ref(storage, `images/${key}/${Date.now()}_${file.name}`);
  const task = uploadBytesResumable(storageRef, file);

  task.on('state_changed',
    snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      const bar = document.getElementById('prog-bar');
      if (bar) bar.style.width = pct + '%';
    },
    err => {
      prog.remove();
      toast('Upload failed: ' + err.message, 'error');
    },
    async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      const imageId = Date.now().toString();
      await setDoc(doc(db, 'users', key, 'images', imageId), {
        url,
        uploadedAt: serverTimestamp(),
        reactions: { like: 0, love: 0, dislike: 0 }
      });
      prog.remove();
      toast('Image uploaded! 🖼️', 'ok');
    }
  );
});

// ─────────────────────────────────────
//  INIT — restore session
// ─────────────────────────────────────
const saved = sessionStorage.getItem('vibeUser');
if (saved) {
  try {
    currentUser = JSON.parse(saved);
    updateNavUser();
  } catch (e) { /* ignore */ }
}

showPage('home');
                                                
