/**
 * Utilidades para parsear services_text del formato "Nombre $precio, Nombre2 $precio2"
 * La coma ES el separador. Nunca se usa en nombres de servicios (restricción de negocio).
 */

/**
 * Devuelve un Map<nombreServicio, precioEnPesos> desde services_text.
 * Maneja separador de miles con punto: $18.000 → 18000
 * Maneja decimales con coma: $18,500 → 18500
 */
export function parsePrice(servicesText: string): Map<string, number> {
  const map = new Map<string, number>();
  if (!servicesText) return map;

  servicesText.split(',').forEach(entry => {
    const match = entry.match(/^(.+?)\s*\$([0-9.,]+)/);
    if (!match) return;
    const nombre = match[1].trim();
    const precioStr = match[2].replace(/\./g, '').replace(',', '.');
    const precio = parseFloat(precioStr);
    if (!isNaN(precio)) map.set(nombre, precio);
  });

  return map;
}

/**
 * Devuelve array de {nombre, precio, duracion?} para usar en selects/forms.
 * Orden preservado del string original.
 * Formato soportado: "Nombre $precio" o "Nombre $precio (Nmin)"
 */
export function parseServices(
  servicesText: string
): Array<{ nombre: string; precio: number; duracion?: number }> {
  const result: Array<{ nombre: string; precio: number; duracion?: number }> = [];
  if (!servicesText) return result;

  servicesText.split(',').forEach(entry => {
    const match = entry.match(/^(.+?)\s*\$([0-9.,]+)(?:\s*\((\d+)min\))?/);
    if (!match) return;
    const nombre = match[1].trim();
    const precioStr = match[2].replace(/\./g, '').replace(',', '.');
    const precio = parseFloat(precioStr);
    if (!isNaN(precio)) {
      const item: { nombre: string; precio: number; duracion?: number } = { nombre, precio };
      if (match[3]) item.duracion = parseInt(match[3], 10);
      result.push(item);
    }
  });

  return result;
}
