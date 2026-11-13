import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';
import { validateFeedbackForm } from '../validation/interviewValidation.js';
import {
  INTERVIEW_RECOMMENDATIONS,
  INTERVIEW_RATING_SCALE,
} from '../../../constants/interviewStatus.js';

const EMPTY_FORM = {
  technicalKnowledge: '',
  communicationSkills: '',
  problemSolving: '',
  overallRating: '',
  remarks: '',
  recommendation: '',
};

function RatingField({ label, value, onChange, error }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="ta-rating" role="radiogroup" aria-label={label}>
        {INTERVIEW_RATING_SCALE.map((score) => (
          <button
            type="button"
            key={score}
            role="radio"
            aria-checked={Number(value) === score}
            aria-label={`${score} out of 5`}
            className={`ta-rating__option ${Number(value) === score ? 'active' : ''}`}
            onClick={() => onChange(String(score))}
          >
            <Star size={14} aria-hidden="true" />
            {score}
          </button>
        ))}
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

/**
 * Structured interview feedback of a completed round.
 */
export default function InterviewFeedbackModal({ open, entry, onClose, onSubmit, loading }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !entry) return;

    const feedback = entry.interview.feedback;
    setValues({
      technicalKnowledge: feedback?.technicalKnowledge ?? '',
      communicationSkills: feedback?.communicationSkills ?? '',
      problemSolving: feedback?.problemSolving ?? '',
      overallRating: feedback?.overallRating ?? '',
      remarks: feedback?.remarks ?? '',
      recommendation: feedback?.recommendation ?? '',
    });
    setErrors({});
  }, [open, entry]);

  if (!entry) return null;

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = () => {
    const result = validateFeedbackForm(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit({
      technicalKnowledge: Number(values.technicalKnowledge),
      communicationSkills: Number(values.communicationSkills),
      problemSolving: Number(values.problemSolving),
      overallRating: Number(values.overallRating),
      remarks: values.remarks,
      recommendation: values.recommendation,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Interview feedback"
      subtitle={`${entry.candidate.fullName} · ${entry.interview.round} round`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Submit feedback
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <RatingField
          label="Technical knowledge"
          value={values.technicalKnowledge}
          onChange={(value) => update('technicalKnowledge', value)}
          error={errors.technicalKnowledge}
        />
        <RatingField
          label="Communication skills"
          value={values.communicationSkills}
          onChange={(value) => update('communicationSkills', value)}
          error={errors.communicationSkills}
        />
        <RatingField
          label="Problem-solving ability"
          value={values.problemSolving}
          onChange={(value) => update('problemSolving', value)}
          error={errors.problemSolving}
        />
        <RatingField
          label="Overall rating"
          value={values.overallRating}
          onChange={(value) => update('overallRating', value)}
          error={errors.overallRating}
        />

        <div className="field field--full">
          <div className="field">
            <label className="field__label" htmlFor="interview-recommendation">
              Final recommendation
              <span className="field__required" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="interview-recommendation"
              className={`select ${errors.recommendation ? 'select--error' : ''}`}
              value={values.recommendation}
              onChange={(event) => update('recommendation', event.target.value)}
            >
              <option value="">Select a recommendation</option>
              {INTERVIEW_RECOMMENDATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.recommendation && (
              <span className="field__error">{errors.recommendation}</span>
            )}
          </div>
        </div>

        <div className="field field--full">
          <Textarea
            label="Interview remarks"
            required
            value={values.remarks}
            onChange={(event) => update('remarks', event.target.value)}
            error={errors.remarks}
            placeholder="Summarise the strengths and the gaps observed in this round"
          />
        </div>
      </div>
    </Modal>
  );
}
