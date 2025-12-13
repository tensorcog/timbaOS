"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, X, User } from "lucide-react";
import { DatePickerCalendar } from "./date-picker-calendar";
import { useLocation } from "@/lib/context/location-context";

interface AppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    appointment?: {
        id: string;
        title: string;
        description?: string;
        appointmentDate: string;
        duration: number;
        customerId?: string;
    };
}

export function AppointmentDialog({ isOpen, onClose, onSuccess, appointment }: AppointmentDialogProps) {
    const { selectedLocation } = useLocation();
    const [showCalendar, setShowCalendar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        appointmentDate: new Date(),
        appointmentTime: "09:00",
        duration: 60,
        customerId: "",
    });

    useEffect(() => {
        if (appointment) {
            const date = new Date(appointment.appointmentDate);
            setFormData({
                title: appointment.title,
                description: appointment.description || "",
                appointmentDate: date,
                appointmentTime: format(date, "HH:mm"),
                duration: appointment.duration,
                customerId: appointment.customerId || "",
            });
        } else {
            setFormData({
                title: "",
                description: "",
                appointmentDate: new Date(),
                appointmentTime: "09:00",
                duration: 60,
                customerId: "",
            });
        }
    }, [appointment]);

    // Fetch customers for dropdown
    useEffect(() => {
        if (isOpen) {
            fetch("/api/customers")
                .then((res) => res.json())
                .then((data) => setCustomers(data.customers || []))
                .catch((err) => console.error("Error fetching customers:", err));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Combine date and time
            const [hours, minutes] = formData.appointmentTime.split(":");
            const appointmentDateTime = new Date(formData.appointmentDate);
            appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const payload = {
                title: formData.title,
                description: formData.description || null,
                appointmentDate: appointmentDateTime.toISOString(),
                duration: formData.duration,
                customerId: formData.customerId || null,
                locationId: selectedLocation,
            };

            const url = appointment ? `/api/appointments/${appointment.id}` : "/api/appointments";
            const method = appointment ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save appointment");

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving appointment:", error);
            alert("Failed to save appointment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">
                        {appointment ? "Edit Appointment" : "New Appointment"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="e.g., Delivery Meeting"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            placeholder="Additional details..."
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <span>{format(formData.appointmentDate, "MMMM d, yyyy")}</span>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </button>
                            {showCalendar && (
                                <div className="absolute top-full left-0 mt-2 z-10">
                                    <DatePickerCalendar
                                        selectedDate={formData.appointmentDate}
                                        onSelectDate={(date) => {
                                            setFormData({ ...formData, appointmentDate: date });
                                            setShowCalendar(false);
                                        }}
                                        disablePastDates={!appointment}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Time */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            required
                            value={formData.appointmentTime}
                            onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Duration (minutes) <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                            <option value={180}>3 hours</option>
                        </select>
                    </div>

                    {/* Customer */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Customer (optional)
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <select
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">No customer</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : appointment ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
