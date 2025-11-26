"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Location {
    id: string;
    code: string;
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
    isWarehouse: boolean;
}

interface LocationContextType {
    currentLocation: Location | null;
    selectedLocation: string | null;
    availableLocations: Location[];
    setCurrentLocation: (location: Location) => void;
    isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load locations and current selection from localStorage
    useEffect(() => {
        const loadLocations = async () => {
            try {
                // Fetch available locations from API
                const res = await fetch('/api/locations');
                if (res.ok) {
                    const locations = await res.json();
                    setAvailableLocations(locations);

                    // Try to restore last selected location
                    const savedLocationId = localStorage.getItem('selectedLocationId');
                    if (savedLocationId) {
                        const savedLocation = locations.find((loc: Location) => loc.id === savedLocationId);
                        if (savedLocation) {
                            setCurrentLocationState(savedLocation);
                        } else if (locations.length > 0) {
                            setCurrentLocationState(locations[0]);
                        }
                    } else if (locations.length > 0) {
                        // Default to first location
                        setCurrentLocationState(locations[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to load locations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadLocations();
    }, []);

    const setCurrentLocation = (location: Location) => {
        setCurrentLocationState(location);
        localStorage.setItem('selectedLocationId', location.id);
    };

    return (
        <LocationContext.Provider
            value={{
                currentLocation,
                selectedLocation: currentLocation?.id || null,
                availableLocations,
                setCurrentLocation,
                isLoading,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
