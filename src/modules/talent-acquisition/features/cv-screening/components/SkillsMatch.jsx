import { Check, X } from 'lucide-react';

/**
 * Compares the skills required by the position with the skills listed by the
 * candidate.
 */
export default function SkillsMatch({ matched = [], missing = [], requiredCount = 0 }) {
  return (
    <div className="ta-skill-match">
      <div className="ta-skill-match__summary">
        <span className="ta-skill-match__count">
          {matched.length} of {requiredCount} required skills matched
        </span>
      </div>

      <ul className="ta-skill-match__list">
        {matched.map((skill) => (
          <li className="ta-skill-match__item ta-skill-match__item--matched" key={`m-${skill}`}>
            <Check size={13} aria-hidden="true" />
            {skill}
          </li>
        ))}
        {missing.map((skill) => (
          <li className="ta-skill-match__item ta-skill-match__item--missing" key={`x-${skill}`}>
            <X size={13} aria-hidden="true" />
            {skill}
          </li>
        ))}
        {requiredCount === 0 && (
          <li className="ta-skill-match__item ta-skill-match__item--neutral">
            No specific skills were required for this position.
          </li>
        )}
      </ul>
    </div>
  );
}
