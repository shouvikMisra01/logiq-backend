export interface AuthFields {
    is_verified?: boolean;      // True if password has been set
    invite_token?: string;      // Token sent in invite email
    invite_expires?: Date;      // Expiration for invite token
    reset_token?: string;       // Token sent in forgot password email
    reset_expires?: Date;       // Expiration for reset token
    password_hash?: string;     // Hashed password (optional during invite phase)
}
