import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import styles from './FilterSidebar.module.css';

const EXP_LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead', 'Any'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

export default function FilterSidebar({ filters, onChange, onClear }) {
  const toggle = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: updated });
  };

  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <SlidersHorizontal size={15} />
          <span>Filters</span>
        </div>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={onClear}>
            <RotateCcw size={12} />
            Clear
          </button>
        )}
      </div>

      <FilterGroup title="Experience Level">
        {EXP_LEVELS.map(level => (
          <FilterOption
            key={level}
            label={level === 'Any' ? 'Any Level' : level}
            checked={(filters.expLevels || []).includes(level)}
            onChange={() => toggle('expLevels', level)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Work Mode">
        {WORK_MODES.map(mode => (
          <FilterOption
            key={mode}
            label={mode}
            checked={(filters.workModes || []).includes(mode)}
            onChange={() => toggle('workModes', mode)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Posting Date">
        {['Today', 'Last 3 days', 'Last week', 'Last month'].map(d => (
          <FilterOption
            key={d}
            label={d}
            checked={filters.dateFilter === d}
            radio
            onChange={() => onChange({ ...filters, dateFilter: filters.dateFilter === d ? null : d })}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.options}>{children}</div>
    </div>
  );
}

function FilterOption({ label, checked, onChange, radio }) {
  return (
    <label className={styles.option}>
      <input
        type={radio ? 'radio' : 'checkbox'}
        checked={checked}
        onChange={onChange}
        className={styles.check}
      />
      <span className={styles.optLabel}>{label}</span>
    </label>
  );
}
