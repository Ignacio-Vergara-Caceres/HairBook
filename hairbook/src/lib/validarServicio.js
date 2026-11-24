export function validarServicio(body, parcial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Datos inválidos." };
  const permitidos = ["codigo", "nombre", "categoria", "descripcion", "precioDesde", "duracionMin", "destacado", "activo"];
  if (Object.keys(body).some(k => !permitidos.includes(k))) return { error: "Hay campos no permitidos." };
  if (!parcial && ["codigo", "nombre", "categoria", "descripcion", "precioDesde", "duracionMin"].some(k => !Object.hasOwn(body, k))) return { error: "Completa todos los campos obligatorios." };
  const campos = {};
  for (const key of ["codigo", "nombre", "categoria", "descripcion"]) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== "string") return { error: `El campo ${key} es inválido.` };
    const valor = body[key].trim();
    if (key === "codigo") {
      if (!/^[A-Z0-9_]{2,50}$/.test(valor)) return { error: "El código debe tener 2-50 caracteres: letras mayúsculas, números o guiones bajos." };
    } else if (valor.length < (key === "descripcion" ? 0 : 2) || valor.length > (key === "descripcion" ? 1000 : 120)) return { error: `El campo ${key} debe tener un largo válido.` };
    campos[key] = valor;
  }
  for (const [key, min, max] of [["precioDesde", 0, 100000000], ["duracionMin", 1, 1440]]) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== "number" || !Number.isSafeInteger(body[key]) || body[key] < min || body[key] > max) return { error: `El campo ${key} debe ser un número entero válido.` };
    campos[key] = body[key];
  }
  for (const key of ["destacado", "activo"]) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== "boolean") return { error: `El campo ${key} debe ser verdadero o falso.` };
    campos[key] = body[key];
  }
  if (parcial && !Object.keys(campos).length) return { error: "No hay cambios para guardar." };
  return { campos };
}
