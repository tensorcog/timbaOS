import { useLocation } from '../context/location-context';
import { useState, useEffect } from 'react';

interface LocationInventory {
    id: string;
    stockLevel: number;
    reorderPoint: number;
    reorderQuantity: number;
    maxStock?: number | null;
    aisle?: string | null;
    bin?: string | null;
    product: {
        id: string;
        name: string;
        sku: string;
        basePrice: number;
        category: string;
    };
}

export function useLocationInventory() {
    const { currentLocation } = useLocation();
    const [inventory, setInventory] = useState<LocationInventory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentLocation) {
            setIsLoading(false);
            return;
        }

        const fetchInventory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/locations/${currentLocation.id}/inventory`);
                if (res.ok) {
                    const data = await res.json();
                    setInventory(data);
                } else {
                    setError('Failed to load inventory');
                }
            } catch (err) {
                setError('Failed to load inventory');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, [currentLocation]);

    return { inventory, isLoading, error };
}
