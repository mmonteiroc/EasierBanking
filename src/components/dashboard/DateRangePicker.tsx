import React from 'react';
import { Calendar } from 'lucide-react';
import './DateRangePicker.css';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onReset: () => void;
    minDate?: string;
    maxDate?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onReset,
    minDate,
    maxDate
}) => {
    return (
        <div className="date-range-picker">
            <div className="date-input-group">
                <Calendar size={16} className="date-icon" />
                <div className="input-wrapper">
                    <label>From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        min={minDate}
                        max={endDate || maxDate}
                    />
                </div>
            </div>
            <div className="date-separator">to</div>
            <div className="date-input-group">
                <Calendar size={16} className="date-icon" />
                <div className="input-wrapper">
                    <label>To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        min={startDate || minDate}
                        max={maxDate}
                    />
                </div>
            </div>
            <button className="reset-button" onClick={onReset} title="Reset to all time">
                Reset
            </button>
        </div>
    );
};
