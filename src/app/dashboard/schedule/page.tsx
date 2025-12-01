"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Truck, Package } from "lucide-react";
import { useLocation } from "@/lib/context/location-context";
import Link from "next/link";

interface ScheduledShipment {
    id: string;
    scheduledDate: string; // ISO string
    status: string;
    method: string;
    Order: {
        id: string;
        orderNumber: string;
        Customer: {
            name: string;
        };
        Location: {
            name: string;
            code: string;
        };
    };
    ShipmentItem: any[];
}

export default function SchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shipments, setShipments] = useState<ScheduledShipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedLocation } = useLocation();

    const fetchSchedule = async () => {
        setIsLoading(true);
        try {
            // Use UTC dates for API query
            const start = startOfMonth(currentDate).toISOString();
            const end = endOfMonth(currentDate).toISOString();
            
            const params = new URLSearchParams({
                start,
                end,
                ...(selectedLocation ? { locationId: selectedLocation } : {})
            });

            const res = await fetch(`/api/orders/schedule?${params}`);
            if (!res.ok) throw new Error('Failed to fetch schedule');
            
            const data = await res.json();
            setShipments(data.shipments);
        } catch (error) {
            console.error('Error fetching schedule:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [currentDate, selectedLocation]);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    // O(N) Pre-processing: Group shipments by UTC date string (YYYY-MM-DD)
    const shipmentsByDate = useMemo(() => {
        const map = new Map<string, ScheduledShipment[]>();
        shipments.forEach(shipment => {
            if (shipment.scheduledDate) {
                // Use UTC date parts to ensure consistency with server storage
                const date = new Date(shipment.scheduledDate);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)?.push(shipment);
            }
        });
        return map;
    }, [shipments]);

    // O(1) Lookup
    const getShipmentsForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return shipmentsByDate.get(dateKey) || [];
    };

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Delivery Schedule</h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={prevMonth}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="font-semibold min-w-[150px] text-center">
                        {format(currentDate, "MMMM yyyy")}
                    </div>
                    <button 
                        onClick={nextMonth}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col space-y-1.5 p-6 py-3 border-b">
                    <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>
                </div>
                <div className="p-6 pt-0 flex-1 p-0 overflow-y-auto">
                    <div className="grid grid-cols-7 h-full min-h-[600px] auto-rows-fr border-l border-t">
                        {calendarDays.map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div
                                    key={day.toString()}
                                    className={`min-h-[100px] border-b border-r p-2 transition-colors hover:bg-muted/50 ${
                                        !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                                    }`}
                                >
                                    <div className={`text-right text-sm mb-2 ${
                                        isSameDay(day, new Date()) ? "bg-primary text-primary-foreground w-6 h-6 rounded-full ml-auto flex items-center justify-center" : ""
                                    }`}>
                                        {format(day, "d")}
                                    </div>
                                    <div className="space-y-1">
                                        {getShipmentsForDay(day).map((shipment) => (
                                            <div
                                                key={shipment.id}
                                                className={`text-xs p-1 rounded border truncate ${
                                                    shipment.method === 'DELIVERY'
                                                        ? 'bg-primary/10 border-primary/20 text-primary'
                                                        : 'bg-secondary border-secondary-foreground/20 text-secondary-foreground'
                                                }`}
                                                title={`${shipment.Order.Customer.name} - ${shipment.Order.orderNumber}`}
                                            >
                                                <div className="font-medium">{shipment.Order.Customer.name}</div>
                                                <div className="text-[10px] opacity-75 flex items-center gap-1">
                                                    {shipment.method === 'DELIVERY' ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                                                    {shipment.Order.orderNumber}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
