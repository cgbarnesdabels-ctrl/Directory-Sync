/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  Clock,
  Check,
  RotateCcw,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { DateRangeSelection } from '../types/auth';

interface DateRangePickerProps {
  selection: DateRangeSelection;
  onChange: (newSelection: DateRangeSelection) => void;
  isLoading?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selection,
  onChange,
  isLoading = false,
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(selection.preset === 'custom');
  const [customStart, setCustomStart] = useState(selection.startDate);
  const [customEnd, setCustomEnd] = useState(selection.endDate);
  const [customError, setCustomError] = useState<string | null>(null);

  // Synchronize internal custom inputs with external selection
  useEffect(() => {
    setCustomStart(selection.startDate);
    setCustomEnd(selection.endDate);
    setIsCustomOpen(selection.preset === 'custom');
  }, [selection]);

  const handlePresetSelect = (preset: DateRangeSelection['preset']) => {
    if (preset === 'custom') {
      setIsCustomOpen(true);
      return;
    }

    setIsCustomOpen(false);
    setCustomError(null);

    const now = new Date();
    const days = parseInt(preset, 10);
    const start = new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000);

    const formatISO = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const newStart = formatISO(start);
    const newEnd = formatISO(now);

    setCustomStart(newStart);
    setCustomEnd(newEnd);

    onChange({
      preset,
      startDate: newStart,
      endDate: newEnd,
    });
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customStart || !customEnd) {
      setCustomError('Please select both start and end dates.');
      return;
    }

    const startDateObj = new Date(customStart);
    const endDateObj = new Date(customEnd);

    if (startDateObj > endDateObj) {
      setCustomError('Start date must be before or equal to end date.');
      return;
    }

    const diffDays = Math.ceil(
      Math.abs(endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 365) {
      setCustomError('Custom range cannot exceed 365 days.');
      return;
    }

    setCustomError(null);
    onChange({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd,
    });
  };

  const presets: { id: DateRangeSelection['preset']; label: string }[] = [
    { id: '7', label: '7 Days' },
    { id: '14', label: '14 Days' },
    { id: '30', label: '30 Days' },
    { id: '60', label: '60 Days' },
    { id: '90', label: '90 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div id="date-range-picker-container" className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
        {presets.map(p => {
          const isActive = selection.preset === p.id;
          return (
            <button
              key={p.id}
              id={`preset-${p.id}`}
              type="button"
              disabled={isLoading}
              onClick={() => handlePresetSelect(p.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Pop-out Bar */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-700">Select Custom Range:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor="custom-start-date" className="text-[11px] font-medium text-slate-500">
                  From:
                </label>
                <input
                  id="custom-start-date"
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={e => {
                    setCustomStart(e.target.value);
                    setCustomError(null);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono"
                />
              </div>

              <ArrowRight className="w-3 h-3 text-slate-400 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <label htmlFor="custom-end-date" className="text-[11px] font-medium text-slate-500">
                  To:
                </label>
                <input
                  id="custom-end-date"
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={e => {
                    setCustomEnd(e.target.value);
                    setCustomError(null);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono"
                />
              </div>

              <button
                id="btn-apply-custom-range"
                type="submit"
                disabled={isLoading}
                className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>

          {customError && (
            <p className="text-[11px] text-rose-600 font-medium">
              {customError}
            </p>
          )}
        </form>
      )}
    </div>
  );
};
