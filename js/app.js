import { ideas, SIGNUP_URL } from './data.js';

// ─── State ───
let currentAngle = 0;
let isPlaying = true;
let animationId = null;
let cardCount = 0;
let anglePerCard = 0;
let shuffledIdeas = [];
let lastFrontIdx = -1;

// ─── Wishlist (localStorage) ───
const WISHLIST_KEY = 'hackathon-wishlist';

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistCount();
}

function toggleWishlist(id) {
  const list = getWishlist();
  const idx = list.indexOf(id);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(id);
  }
  saveWishlist(list);
  updateHeartStates();
}

function isInWishlist(id) {
  return getWishlist().includes(id);
}

function updateWishlistCount() {
  document.getElementById('wishlistCount').textContent = getWishlist().length;
}

function updateHeartStates() {
  document.querySelectorAll('.card-heart').forEach(btn => {
    const id = Number(btn.dataset.id);
    btn.classList.toggle('is-liked', isInWishlist(id));
  });
}

// ─── Shuffle ───
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build Cards ───
function buildCarousel() {
  shuffledIdeas = shuffle(ideas);
  cardCount = shuffledIdeas.length;
  anglePerCard = 360 / cardCount;
  const radius = 550;
  const carousel = document.getElementById('carousel');
  carousel.innerHTML = '';
  carousel.style.setProperty('--radius', `${radius}px`);

  shuffledIdeas.forEach((idea, i) => {
    const angle = i * anglePerCard;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.track = idea.track;
    card.dataset.index = i;
    card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-track">${idea.track}</span>
        <button class="card-heart" data-id="${idea.id}" aria-label="Add to favorites">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <h3 class="card-title">${idea.title}</h3>
      <p class="card-description">${idea.description}</p>
      <div class="card-meta">
        <span class="card-author">By: ${idea.author}</span>
        <div class="card-badges">
          ${idea.nlOnly ? '<span class="badge badge--nl">🇳🇱 NL only</span>' : ''}
        </div>
        <div class="card-actions">
          <a href="${idea.confluenceUrl}" target="_blank" rel="noopener" class="card-link">Details ↗</a>
          <a href="${SIGNUP_URL}" target="_blank" rel="noopener" class="card-signup">Sign up</a>
        </div>
      </div>
    `;

    // Click card to focus
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-heart') || e.target.closest('.card-link') || e.target.closest('.card-signup')) return;
      focusCard(i);
    });

    // Heart button
    card.querySelector('.card-heart').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(idea.id);
    });

    carousel.appendChild(card);
  });

  carousel.style.transform = `rotateY(0deg)`;
  updateHeartStates();
  updateFrontCard();
}

// ─── Rotation ───
let lastTime = 0;
const SPEED = 5; // degrees per second

function animate(time) {
  if (!isPlaying) return;
  if (!lastTime) lastTime = time;
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  currentAngle -= SPEED * delta;
  applyRotation();
  animationId = requestAnimationFrame(animate);
}

function applyRotation() {
  const carousel = document.getElementById('carousel');
  carousel.style.transform = `rotateY(${currentAngle}deg)`;
  updateFrontCard();
}

function buildPeekContent(idea) {
  return `
    <div class="card-header">
      <span class="card-track">${idea.track}</span>
    </div>
    <h3 class="card-title">${idea.title}</h3>
    <p class="card-description">${idea.description}</p>
    <div class="card-meta">
      <span class="card-author">By: ${idea.author}</span>
    </div>`;
}

function updatePeekCards(frontIdx) {
  const prevIdx = (frontIdx - 1 + cardCount) % cardCount;
  const nextIdx = (frontIdx + 1) % cardCount;
  const peekLeft  = document.getElementById('peekLeft');
  const peekRight = document.getElementById('peekRight');
  peekLeft.dataset.track  = shuffledIdeas[prevIdx].track;
  peekLeft.innerHTML      = buildPeekContent(shuffledIdeas[prevIdx]);
  peekRight.dataset.track = shuffledIdeas[nextIdx].track;
  peekRight.innerHTML     = buildPeekContent(shuffledIdeas[nextIdx]);
}

function updateFrontCard() {
  const cards = document.querySelectorAll('.card');
  const normalizedAngle = (((-currentAngle) % 360) + 360) % 360;
  let closestIdx = 0;
  let closestDist = 360;

  cards.forEach((card, i) => {
    const cardAngle = (i * anglePerCard) % 360;
    let dist = Math.abs(normalizedAngle - cardAngle);
    if (dist > 180) dist = 360 - dist;
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });

  cards.forEach((card, i) => {
    card.classList.toggle('is-front', i === closestIdx);
    card.style.opacity = i === closestIdx ? '1' : '0';
  });

  if (closestIdx !== lastFrontIdx) {
    lastFrontIdx = closestIdx;
    updatePeekCards(closestIdx);
  }
}

function play() {
  if (isPlaying) return;
  isPlaying = true;
  lastTime = 0;
  animationId = requestAnimationFrame(animate);
  updatePlayPauseIcon();
}

function pause() {
  isPlaying = false;
  if (animationId) cancelAnimationFrame(animationId);
  lastTime = 0;
  updatePlayPauseIcon();
}

function focusCard(index) {
  pause();
  // Snap to card
  const targetAngle = -(index * anglePerCard);
  // Find nearest equivalent rotation
  const fullRotations = Math.round(currentAngle / 360) * 360;
  currentAngle = fullRotations + targetAngle;
  applyRotation();
}

function next() {
  const step = anglePerCard;
  currentAngle -= step;
  applyRotation();
  if (isPlaying) {
    lastTime = 0;
  }
}

function prev() {
  const step = anglePerCard;
  currentAngle += step;
  applyRotation();
  if (isPlaying) {
    lastTime = 0;
  }
}

function updatePlayPauseIcon() {
  const pauseIcon = document.querySelector('.icon-pause');
  const playIcon = document.querySelector('.icon-play');
  pauseIcon.style.display = isPlaying ? 'block' : 'none';
  playIcon.style.display = isPlaying ? 'none' : 'block';
}

// ─── Wishlist Modal ───
function openWishlistModal() {
  const modal = document.getElementById('wishlistModal');
  const list = document.getElementById('wishlistList');
  const wishlist = getWishlist();

  if (wishlist.length === 0) {
    list.innerHTML = '<p class="wishlist-empty">No favorites yet. Click the heart on any idea to add it here.</p>';
  } else {
    list.innerHTML = wishlist.map(id => {
      const idea = ideas.find(i => i.id === id);
      if (!idea) return '';
      return `
        <div class="wishlist-item">
          <div class="wishlist-item-info">
            <div class="wishlist-item-title">${idea.title}</div>
            <div class="wishlist-item-meta">By: ${idea.author} · ${idea.track}</div>
          </div>
          <a href="${idea.confluenceUrl}" target="_blank" rel="noopener" class="wishlist-item-link" aria-label="View details">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <button class="wishlist-item-remove" data-id="${idea.id}" aria-label="Remove from favorites">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.wishlist-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleWishlist(Number(btn.dataset.id));
        openWishlistModal(); // re-render
      });
    });
  }

  modal.classList.add('is-open');
}

function closeWishlistModal() {
  document.getElementById('wishlistModal').classList.remove('is-open');
}

// ─── Init ───
function init() {
  buildCarousel();
  updateWishlistCount();

  // Start rotation
  animationId = requestAnimationFrame(animate);

  // Controls
  document.getElementById('playPauseBtn').addEventListener('click', () => {
    isPlaying ? pause() : play();
  });
  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevBtn').addEventListener('click', prev);

  // Wishlist modal
  document.getElementById('wishlistBtn').addEventListener('click', openWishlistModal);
  document.getElementById('modalClose').addEventListener('click', closeWishlistModal);
  document.getElementById('wishlistModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWishlistModal();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') { e.preventDefault(); isPlaying ? pause() : play(); }
    if (e.key === 'Escape') closeWishlistModal();
  });
}

init();
