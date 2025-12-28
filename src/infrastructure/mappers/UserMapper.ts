import type { User } from "../../core/entities";

export class UserMapper {
    static toDomain(
        authUser: {
            id: string;
            email?: string;
            user_metadata?: Record<string, unknown>;
            created_at: string;
        },
        profileData?: {
            display_name?: string | null;
            username?: string | null;
            profile_completed?: boolean | null;
        }
    ): User {
        return {
            id: authUser.id,
            email: authUser.email || "",
            displayName:
                profileData?.display_name ||
                (authUser.user_metadata?.display_name as string) ||
                authUser.email?.split("@")[0],
            username:
                profileData?.username ||
                (authUser.user_metadata?.username as string) ||
                authUser.email?.split("@")[0],
            profileCompleted:
                profileData?.profile_completed ||
                Boolean(authUser.user_metadata?.profile_completed),
            createdAt: new Date(authUser.created_at),
        };
    }
}
