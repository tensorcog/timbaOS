"use client";

import { useLocation } from "@/lib/context/location-context";
import { MapPin, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function LocationSelector() {
    const { currentLocation, availableLocations, setCurrentLocation, isLoading } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right + window.scrollX
            });
        }
    }, [isOpen]);

    if (isLoading || !currentLocation) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted animate-pulse">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Loading...</span>
            </div>
        );
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 transition-all border border-purple-500/30"
            >
                <MapPin className="h-4 w-4 text-purple-400" />
                <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="text-sm font-medium">{currentLocation.name}</span>
                </div>
            </button>

            {isOpen && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[90]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown - rendered at document root */}
                    <div 
                        className="fixed z-[100] w-64 rounded-lg border bg-card shadow-lg overflow-hidden"
                        style={{
                            top: `${position.top}px`,
                            right: `${position.right}px`
                        }}
                    >
                        <div className="p-2 border-b bg-muted/50">
                            <p className="text-xs font-semibold text-muted-foreground">SELECT LOCATION</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {availableLocations.map((location) => (
                                <button
                                    key={location.id}
                                    onClick={() => {
                                        setCurrentLocation(location);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                            location.isWarehouse
                                                ? 'bg-orange-500/20'
                                                : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
                                        }`}>
                                            <MapPin className={`h-5 w-5 ${
                                                location.isWarehouse ? 'text-orange-400' : 'text-purple-400'
                                            }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{location.name}</p>
                                            {location.isWarehouse && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                                    Warehouse
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {currentLocation.id === location.id && (
                                        <Check className="h-4 w-4 text-green-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {availableLocations.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No locations available
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
