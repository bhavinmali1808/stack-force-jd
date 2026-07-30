// Shared utility helpers

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months= Math.floor(days / 30);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const GRADIENTS = [
  ['#4F46E5','#818CF8'],
  ['#7C3AED','#A78BFA'],
  ['#0891B2','#22D3EE'],
  ['#059669','#34D399'],
  ['#D97706','#FCD34D'],
  ['#DC2626','#F87171'],
  ['#BE185D','#F472B6'],
  ['#1D4ED8','#60A5FA'],
];

export function getGradient(name = '') {
  const idx = (name.charCodeAt(0) || 0) % GRADIENTS.length;
  return `linear-gradient(135deg, ${GRADIENTS[idx][0]}, ${GRADIENTS[idx][1]})`;
}

export function expText(min, max) {
  if (min === 0 && max >= 50) return 'Any Experience';
  if (min === 0) return `Up to ${max} yrs`;
  return `${min}–${max} yrs`;
}

export const LEVEL_COLORS = {
  Fresher: { bg: '#DBEAFE', text: '#1E40AF' },
  Junior:  { bg: '#D1FAE5', text: '#065F46' },
  Mid:     { bg: '#FEF3C7', text: '#92400E' },
  Senior:  { bg: '#EDE9FE', text: '#5B21B6' },
  Lead:    { bg: '#FEE2E2', text: '#991B1B' },
  Any:     { bg: '#F1F5F9', text: '#475569' },
};
