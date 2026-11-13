import { CalendarClock } from 'lucide-react';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDate, formatTimeOfDay } from '../../../utils/formatDate.js';
import { getRoundLabel } from '../../../constants/interviewStatus.js';

/**
 * Interview agenda for the upcoming rounds, grouped by calendar day.
 */
export default function InterviewCalendar({ interviews, candidates }) {
  const grouped = interviews.reduce((accumulator, interview) => {
    const day = formatDate(interview.interview.scheduledAt);
    if (!accumulator[day]) accumulator[day] = [];
    accumulator[day].push(interview);
    return accumulator;
  }, {});

  const days = Object.entries(grouped).sort(
    (a, b) => new Date(a[0]) - new Date(b[0])
  );

  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No interviews in the calendar"
        description="Scheduled rounds appear here as soon as an interview is confirmed."
      />
    );
  }

  const candidateName = (candidateId) =>
    candidates.find((candidate) => candidate.candidateId === candidateId)?.fullName || 'Candidate';

  return (
    <div className="ta-calendar">
      {days.map(([day, entries]) => (
        <div className="ta-calendar__day" key={day}>
          <div className="ta-calendar__day-label">{day}</div>
          <ul className="ta-calendar__list">
            {entries.map((entry) => (
              <li className="ta-calendar__item" key={entry.interview.interviewId}>
                <span className="ta-calendar__time">
                  {formatTimeOfDay(entry.interview.scheduledAt)}
                </span>
                <div className="ta-calendar__body">
                  <div className="ta-calendar__title">
                    {candidateName(entry.interview.candidateId)} ·{' '}
                    {getRoundLabel(entry.interview.round)}
                  </div>
                  <div className="ta-calendar__meta">
                    {entry.interview.interviewer} ·{' '}
                    {entry.interview.mode === 'online' ? 'Online' : entry.interview.location}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
