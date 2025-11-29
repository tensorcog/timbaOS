import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: string;
            locationIds: string[];
            tokenVersion: number;
        } & DefaultSession['user'];
    }

    interface User {
        id: string
        role: string
    }
}
