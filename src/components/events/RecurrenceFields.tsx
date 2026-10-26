'use client';

import { Repeat } from 'lucide-react';
import { RECURRENCE_CHOICES, WEEKDAY_SHORT, describeRecurrence, weekdayOf } from '@/lib/eventUtils';
import type { RecurrenceRule } from '@/types';

interface RecurrenceFieldsProps {
  rule: RecurrenceRule;
  weekdays: number[];
  // Data pierwszego terminu (RRRR-MM-DD) — od niej zależy dzień tygodnia i opis reguły.
  startDate: string;
  onRuleChange: (rule: RecurrenceRule) => void;
  onWeekdaysChange: (weekdays: number[]) => void;
}

// Powtarzanie wydarzenia — wspólne dla dodawania i edycji.
export function RecurrenceFields({ rule, weekdays, startDate, onRuleChange, onWeekdaysChange }: RecurrenceFieldsProps) {
  const weekly = rule === 'weekly' || rule === 'biweekly';
  const selected = weekdays.length || !startDate ? weekdays : [weekdayOf(startDate)];

  const toggle = (day: number) => {
    const next = selected.includes(day) ? selected.filter(value => value !== day) : [...selected, day];
    // Co najmniej jeden dzień musi zostać wybrany.
    if (next.length) onWeekdaysChange(next.sort((a, b) => a - b));
  };

  return (
    <div className="space-y-3">
      <label htmlFor="event-recurrence" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Repeat className="w-4 h-4" aria-hidden="true" />
        Powtarzanie
      </label>
      <select
        id="event-recurrence"
        value={rule}
        onChange={(e) => onRuleChange(e.target.value as RecurrenceRule)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
      >
        {RECURRENCE_CHOICES.map(({ value, label }) => (
          <option key={value || 'none'} value={value}>{label}</option>
        ))}
      </select>

      {weekly && (
        <div role="group" aria-label="Dni tygodnia" className="flex flex-wrap gap-2">
          {WEEKDAY_SHORT.map((label, day) => (
            <button
              key={label}
              type="button"
              aria-pressed={selected.includes(day)}
              onClick={() => toggle(day)}
              className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selected.includes(day)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {rule && (
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">{describeRecurrence(rule, startDate, selected) || 'Wybierz datę pierwszego terminu.'}</strong>
          {' '}Godziny rozpoczęcia i zakończenia dotyczą każdego spotkania, a data zakończenia to dzień ostatniego
          terminu — wydarzenie pojawi się w kalendarzu tylko w dniach spotkań.
        </p>
      )}
    </div>
  );
}
