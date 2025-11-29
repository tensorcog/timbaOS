"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { CircleUser, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

export function UserMenu() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch profile picture
    useEffect(() => {
        if (session?.user?.id) {
            fetch('/api/users/profile')
                .then(res => res.json())
                .then(data => {
                    if (data?.profilePicture) {
                        setProfilePicture(data.profilePicture);
                    }
                })
                .catch(err => console.error('Failed to load profile picture:', err));
        }
    }, [session?.user?.id]);

    const userInitials = session?.user?.name
        ? session.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
        : "U";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full border border-border w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 overflow-hidden"
            >
                {profilePicture || session?.user?.image ? (
                    <img
                        src={(profilePicture || session?.user?.image) ?? ''}
                        alt={session?.user?.name || "User"}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="bg-gradient-to-br from-purple-500 to-blue-600 w-full h-full flex items-center justify-center text-white text-xs font-medium">
                        {userInitials}
                    </div>
                )}
                <span className="sr-only">Toggle user menu</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 border-b border-border">
                        <p className="text-sm font-medium leading-none">{session?.user?.name || "User"}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {session?.user?.email || "user@example.com"}
                        </p>
                    </div>

                    <div className="py-1">
                        <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User className="h-4 w-4" />
                            Profile
                        </Link>
                        <Link
                            href="/dashboard/settings"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="h-4 w-4" />
                            Preferences
                        </Link>
                    </div>

                    <div className="border-t border-border py-1">
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
