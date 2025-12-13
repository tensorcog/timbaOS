"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerCalendarProps {
    selectedDate?: Date;
    onSelectDate: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
    disablePastDates?: boolean;
}

export function DatePickerCalendar({
    selectedDate,
    onSelectDate,
    minDate,
    maxDate,
    disablePastDates = true,
}: DatePickerCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
    const today = startOfDay(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const isDateDisabled = (day: Date) => {
        const dayStart = startOfDay(day);
        
        // Check if past date
        if (disablePastDates && isBefore(dayStart, today)) {
            return true;
        }
        
        // Check if before minDate
        if (minDate && isBefore(dayStart, startOfDay(minDate))) {
            return true;
        }
        
        // Check if after maxDate
        if (maxDate && isBefore(startOfDay(maxDate), dayStart)) {
            return true;
        }
        
        return false;
    };

    const handleDateClick = (day: Date) => {
        if (!isDateDisabled(day)) {
            onSelectDate(day);
        }
    };

    return (
        <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={prevMonth}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-semibold text-sm">
                    {format(currentMonth, "MMMM yyyy")}
                </div>
                <button
                    onClick={nextMonth}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isDisabled = isDateDisabled(day);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => handleDateClick(day)}
                            disabled={isDisabled}
                            className={`
                                h-8 w-8 rounded-md text-sm transition-colors
                                ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                                ${isToday && !isSelected ? "border border-primary" : ""}
                                ${isSelected ? "bg-primary text-primary-foreground font-semibold" : ""}
                                ${!isDisabled && !isSelected ? "hover:bg-accent hover:text-accent-foreground" : ""}
                                ${isDisabled ? "opacity-40 cursor-not-allowed line-through" : "cursor-pointer"}
                            `}
                        >
                            {format(day, "d")}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
