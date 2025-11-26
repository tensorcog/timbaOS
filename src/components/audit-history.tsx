'use client';

import { useEffect, useState } from 'react';
import { History, User, Clock } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    changes: Record<string, { old?: any; new?: any }>;
    timestamp: string;
    user: {
        name: string;
        email: string;
    };
}

interface AuditHistoryProps {
    entityType: string;
    entityId: string;
}

export function AuditHistory({ entityType, entityId }: AuditHistoryProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`/api/audit-logs?entityType=${entityType}&entityId=${entityId}`);
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error('Failed to fetch audit logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [entityType, entityId]);

    if (loading) {
        return <div className="text-center py-4 text-muted-foreground">Loading history...</div>;
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No history available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className={`mt-1 p-2 rounded-full h-fit ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                        }`}>
                        <History className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <div className="font-medium flex items-center gap-2">
                                <span className="capitalize">{log.action.toLowerCase()}D</span>
                                <span className="text-muted-foreground font-normal text-sm">by</span>
                                <span className="flex items-center gap-1 text-sm bg-muted px-2 py-0.5 rounded-full">
                                    <User className="h-3 w-3" />
                                    {log.user.name}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(log.timestamp).toLocaleString()}
                            </div>
                        </div>

                        <div className="space-y-1 mt-2">
                            {Object.entries(log.changes).map(([field, change]) => (
                                <div key={field} className="text-sm">
                                    <span className="font-mono text-xs text-muted-foreground uppercase mr-2">{field}:</span>
                                    {change.old !== undefined && (
                                        <span className="line-through text-red-500 mr-2">
                                            {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old)}
                                        </span>
                                    )}
                                    {change.old !== undefined && <span className="mr-2">→</span>}
                                    <span className="text-green-600 font-medium">
                                        {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
