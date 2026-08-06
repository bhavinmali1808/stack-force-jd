/**
 * SpamAssassin / Rspamd heuristic spam analyzer
 */

const SPAM_TRIGGER_WORDS = [
  { word: '100% free', weight: 2.0 },
  { word: 'act now', weight: 1.5 },
  { word: 'apply now', weight: 1.0 },
  { word: 'buy direct', weight: 1.5 },
  { word: 'casino', weight: 3.0 },
  { word: 'click here', weight: 1.5 },
  { word: 'congratulations', weight: 1.5 },
  { word: 'double your income', weight: 2.5 },
  { word: 'earn extra cash', weight: 2.0 },
  { word: 'guaranteed', weight: 1.5 },
  { word: 'make money', weight: 2.0 },
  { word: 'no risk', weight: 1.5 },
  { word: 'passwords', weight: 3.0 },
  { word: 'urgent', weight: 1.5 },
  { word: 'winner', weight: 2.0 },
];

const analyzeSpamScore = ({ subject = '', html = '', text = '' }) => {
  let score = 0;
  const rulesTriggered = [];
  const fullContent = `${subject} ${text || html.replace(/<[^>]+>/g, '')}`.toLowerCase();

  // Rule 1: Subject ALL CAPS
  if (subject && subject.length > 5 && subject === subject.toUpperCase() && /[A-Z]/.test(subject)) {
    score += 2.0;
    rulesTriggered.push('SUBJECT_ALL_CAPS (+2.0)');
  }

  // Rule 2: Excessive Exclamation Marks
  const exclCount = (subject.match(/!/g) || []).length;
  if (exclCount >= 2) {
    score += 1.5;
    rulesTriggered.push('EXCESSIVE_EXCLAMATION (+1.5)');
  }

  // Rule 3: Spam Keyword matches
  SPAM_TRIGGER_WORDS.forEach(({ word, weight }) => {
    if (fullContent.includes(word)) {
      score += weight;
      rulesTriggered.push(`KEYWORD_${word.toUpperCase().replace(/\s+/g, '_')} (+${weight})`);
    }
  });

  // Rule 4: Short text body vs HTML
  if (html.length > 500 && (text || html.replace(/<[^>]+>/g, '')).length < 50) {
    score += 1.0;
    rulesTriggered.push('HTML_WITHOUT_TEXT (+1.0)');
  }

  const roundedScore = Math.round(score * 10) / 10;
  let status = 'clean';
  if (roundedScore >= 5.0) status = 'spam';
  else if (roundedScore >= 2.5) status = 'risky';

  return {
    score: roundedScore,
    status,
    rulesTriggered,
  };
};

module.exports = { analyzeSpamScore };
