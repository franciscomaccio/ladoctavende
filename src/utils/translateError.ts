export function translateError(message: string): string {
    const translations: Record<string, string> = {
        "Invalid login credentials": "Credenciales de inicio de sesión inválidas. Verifica tu correo y contraseña.",
        "Email not confirmed": "Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada.",
        "User already registered": "Ya existe un usuario con este correo electrónico.",
        "Email rate limit exceeded": "Límite de intentos excedido. Por favor, intenta de nuevo en unos minutos.",
        "Email address not found": "No se encontró ningún usuario con ese correo electrónico.",
        "New password should be different from the old password": "La nueva contraseña debe ser diferente a la anterior.",
        "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres.",
        "Failed to fetch": "Error de conexión. Verifica tu internet e intenta de nuevo.",
    };

    // Traducciones parciales o con variables
    if (message.includes("password should be at least")) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }

    if (message.includes("Database error")) {
        return "Hubo un problema con la base de datos. Intenta de nuevo más tarde.";
    }

    return translations[message] || `Error: ${message}`;
}
