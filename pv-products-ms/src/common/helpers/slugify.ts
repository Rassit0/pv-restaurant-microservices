// Convertir texto a slug
export const slugify = (text: string) => {
    return text
        .toLowerCase()                   // Convierte el texto a minúsculas
        .trim()                          // Elimina los espacios en blanco al inicio y al final    
        .normalize('NFD')                // Normaliza el texto para separar los acentos de las letras
        .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
        .replace(/[\s\W-]+/g, '-')       // Reemplaza los espacios y caracteres no alfanuméricos por guiones
        .replace(/^-+|-+$/g, '');        // Elimina los guiones al inicio y al final
};