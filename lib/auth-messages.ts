/**
 * Map Supabase Auth errors to user-friendly messages for onboarding/login.
 */
export function getAuthErrorMessage(error: string): string {
    const lower = error.toLowerCase();
    if (lower.includes('user already registered') || lower.includes('already been registered')) {
        return 'An account with this email already exists. Sign in or use a different email.';
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
        return 'Invalid email or password. Please try again.';
    }
    if (lower.includes('email not confirmed')) {
        return 'Please confirm your email address. Check your inbox for the confirmation link.';
    }
    if (lower.includes('password') && lower.includes('least')) {
        return 'Password must be at least 8 characters.';
    }
    if (lower.includes('password')) {
        return 'Please choose a stronger password (at least 8 characters).';
    }
    if (lower.includes('email')) {
        return 'Please enter a valid email address.';
    }
    if (lower.includes('rate limit') || lower.includes('too many')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }
    return error;
}

export function getSignupSuccessMessage(fullName: string): string {
    const name = fullName?.trim() || 'there';
    return `Welcome, ${name}! Setting up your workspace…`;
}
