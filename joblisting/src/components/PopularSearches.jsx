import React from 'react';
import styles from './PopularSearches.module.css';

const POPULAR_SEARCH_TAGS = [
  'Full-Stack Developer',
  'Backend Engineer',
  'Product Designer',
  'AI Engineer',
  'DevOps Architect',
  'Data Engineer',
  'React Engineer',
  'Node.js Developer'
];

export default function PopularSearches({ onSelectTag, selectedTag }) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.label}>Popular searches:</span>
        <div className={styles.tagList}>
          {POPULAR_SEARCH_TAGS.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                className={`${styles.tagBtn} ${isSelected ? styles.selected : ''}`}
                onClick={() => onSelectTag(isSelected ? '' : tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
